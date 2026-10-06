import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { Role, User } from '../src/service/pizzaService';

type MockUser = User & { password?: string };

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;

  const validUsers: Record<string, MockUser> = {
    'd@jwt.com': {
      id: '3',
      name: 'Kai Chen',
      email: 'd@jwt.com',
      password: 'a',
      roles: [{ role: Role.Diner }],
    },
  };

  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();

    if (method === 'PUT') {
      const loginReq = route.request().postDataJSON();
      const user = validUsers[loginReq.email];

      if (!user || user.password !== loginReq.password) {
        await route.fulfill({
          status: 401,
          json: { code: 401 },
        });
        return;
      }

      loggedInUser = validUsers[loginReq.email];

      await route.fulfill({
        json: {
          user: loggedInUser,
          token: 'abcdef',
        },
      });
      return;
    }

    if (method === 'POST') {
      const registerReq = route.request().postDataJSON();

      const newUser: User = {
        id: '10',
        name: registerReq.name,
        email: registerReq.email,
        roles: [{ role: Role.Diner }],
      };

      loggedInUser = newUser;

      await route.fulfill({
        json: {
          user: loggedInUser,
          token: 'newtoken',
        },
      });
      return;
    }

    if (method === 'DELETE') {
      loggedInUser = undefined;

      await route.fulfill({
        status: 200,
        json: {},
      });
      return;
    }

    await route.fulfill({
      status: 405,
      json: { error: 'Method not allowed' },
    });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      {
        id: 1,
        title: 'Veggie',
        image: 'pizza1.png',
        price: 0.0038,
        description: 'A garden of delight',
      },
      {
        id: 2,
        title: 'Pepperoni',
        image: 'pizza2.png',
        price: 0.0042,
        description: 'Spicy treat',
      },
    ];

    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [
        {
          id: 2,
          name: 'LotaPizza',
          stores: [
            { id: 4, name: 'Lehi' },
            { id: 5, name: 'Springville' },
            { id: 6, name: 'American Fork' },
          ],
        },
        {
          id: 3,
          name: 'PizzaCorp',
          stores: [{ id: 7, name: 'Spanish Fork' }],
        },
        {
          id: 4,
          name: 'topSpot',
          stores: [],
        },
      ],
    };

    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/order', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        json: {
          orders: [],
        },
      });
      return;
    }

    if (method === 'POST') {
      const orderReq = route.request().postDataJSON();

      await route.fulfill({
        json: {
          order: {
            ...orderReq,
            id: 23,
          },
          jwt: 'eyJpYXQ',
        },
      });
      return;
    }

    await route.fulfill({
      status: 405,
      json: { error: 'Method not allowed' },
    });
  });

  await page.goto('/');
}

test('home page loads', async ({ page }) => {
  await basicInit(page);
  await expect(page).toHaveTitle('JWT Pizza');
});

test('login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('login fails with bad password', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('wrong');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('{"code":401}')).toBeVisible();
});

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('button', { name: 'Order now' }).click();

  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');

  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();

  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');

  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByText('0.008')).toBeVisible();
});

test('about page loads', async ({ page }) => {
  await basicInit(page);
  await page.goto('/about');
  await expect(page.getByRole('main')).toBeVisible();
});

test('docs page loads', async ({ page }) => {
  await page.route('*/**/api/docs', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: {
        endpoints: [
          {
            method: 'PUT',
            path: '/api/auth',
            description: 'Authenticate user',
            example: '{"email":"d@jwt.com","password":"a"}',
            response: { user: { id: '3', name: 'Kai Chen' }, token: 'abcdef' },
            requiresAuth: false,
          },
          {
            method: 'GET',
            path: '/api/order/menu',
            description: 'Get menu',
            example: '',
            response: [
              {
                id: 1,
                title: 'Veggie',
                image: 'pizza1.png',
                price: 0.0038,
                description: 'A garden of delight',
              },
            ],
            requiresAuth: false,
          },
        ],
      },
    });
  });

  await page.goto('/docs');
  await expect(page.getByText('JWT Pizza API')).toBeVisible();
  await expect(page.getByText('Authenticate user')).toBeVisible();
  await expect(page.getByText('/api/auth')).toBeVisible();
});

test('history page loads', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByText('Mama Rucci, my my')).toBeVisible();
});

test('register page loads', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByText('Welcome to the party')).toBeVisible();
});

test('unknown route shows not found', async ({ page }) => {
  await page.goto('/definitely-not-a-real-page');
  await expect(page.getByText('It looks like we have dropped a pizza on the floor. Please try another page.')).toBeVisible();
});

test('logout page logs user out', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();

  await page.goto('/logout');
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('register new user', async ({ page }) => {
  await basicInit(page);
  await page.goto('/register');

  await page.getByPlaceholder('Full name').fill('Test User');
  await page.getByPlaceholder('Email address').fill('new@jwt.com');
  await page.getByPlaceholder('Password').fill('pw');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page).toHaveURL('/');
});

test('register shows error on failure', async ({ page }) => {
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        json: { code: 500, message: 'registration failed' },
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/register');

  await page.getByPlaceholder('Full name').fill('Test User');
  await page.getByPlaceholder('Email address').fill('new@jwt.com');
  await page.getByPlaceholder('Password').fill('pw');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByText(/500|registration failed/i)).toBeVisible();
});

test('delivery verify shows valid jwt', async ({ page }) => {
  await basicInit(page);

  await page.route('*/**/api/order/verify', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({
      jwt: 'eyJpYXQ',
    });

    await route.fulfill({
      json: {
        message: 'valid',
        payload: {
          sub: 'order',
          id: 23,
        },
      },
    });
  });

  await page.getByRole('button', { name: 'Order now' }).click();
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByText('Here is your JWT Pizza!')).toBeVisible();

  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText(/valid/i)).toBeVisible();
});

test('delivery verify shows invalid jwt on error', async ({ page }) => {
  await basicInit(page);

  await page.route('*/**/api/order/verify', async (route) => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 500,
      json: {
        message: 'factory failure',
      },
    });
  });

  await page.getByRole('button', { name: 'Order now' }).click();
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByText('Here is your JWT Pizza!')).toBeVisible();

  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText(/invalid/i)).toBeVisible();
  await expect(page.getByText(/bad pizza/i)).toBeVisible();
});

test('diner dashboard shows empty order history', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/diner-dashboard');

  await expect(page.getByText('Your pizza kitchen')).toBeVisible();
  await expect(page.getByText('Kai Chen')).toBeVisible();
  await expect(page.getByText('d@jwt.com')).toBeVisible();
  await expect(page.getByText(/How have you lived this long/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buy one' })).toBeVisible();
});

test('diner dashboard shows order history', async ({ page }) => {
  await basicInit(page);

  await page.route('*/**/api/order', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        json: {
          orders: [
            {
              id: 101,
              items: [
                { price: 0.0038, description: 'Veggie' },
                { price: 0.0042, description: 'Pepperoni' },
              ],
              date: '2026-10-06T02:00:00.000Z',
            },
          ],
        },
      });
      return;
    }

    if (method === 'POST') {
      const orderReq = route.request().postDataJSON();
      await route.fulfill({
        json: {
          order: { ...orderReq, id: 23 },
          jwt: 'eyJpYXQ',
        },
      });
      return;
    }

    await route.fulfill({
      status: 405,
      json: { error: 'Method not allowed' },
    });
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/diner-dashboard');

  await expect(page.getByText('Your pizza kitchen')).toBeVisible();
  await expect(page.getByText('Here is your history of all the good times.')).toBeVisible();
  await expect(page.getByRole('cell', { name: '101' })).toBeVisible();
  await expect(page.getByRole('cell', { name: /0.008/ })).toBeVisible();
});


test('franchise dashboard shows marketing page when user has no franchise', async ({ page }) => {
  await basicInit(page);

  await page.route(/\/api\/franchise\/\w+$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: [],
    });
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/franchise-dashboard');

  await expect(page.getByText('So you want a piece of the pie?')).toBeVisible();
  await expect(page.getByText(/Call now/i)).toBeVisible();
  await expect(page.getByText('800-555-5555')).toBeVisible();
});


test('franchise dashboard shows stores for franchisee', async ({ page }) => {
  await basicInit(page);

  await page.route(/\/api\/franchise\/\w+$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: [
        {
          id: 12,
          name: 'Kai Pizza',
          stores: [
            { id: 1, name: 'Lehi', totalRevenue: 12.5 },
            { id: 2, name: 'Provo', totalRevenue: 9.25 },
          ],
        },
      ],
    });
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/franchise-dashboard');

  await expect(page.getByText('Kai Pizza')).toBeVisible();
  await expect(page.getByText(/Everything you need to run an JWT Pizza franchise/i)).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Lehi' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Provo' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Create store/i })).toBeVisible();
});


test('create store submits and navigates back', async ({ page }) => {
  await basicInit(page);

  await page.route(/\/api\/franchise\/\w+$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: [
        {
          id: 12,
          name: 'Kai Pizza',
          stores: [],
        },
      ],
    });
  });

  await page.route(/\/api\/franchise\/\d+\/store$/, async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({
      name: 'New Store',
    });

    await route.fulfill({
      json: {
        id: '99',
        name: 'New Store',
      },
    });
  });

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/franchise-dashboard');
  await page.getByRole('button', { name: 'Create store' }).click();

  await expect(page.getByText('Create store')).toBeVisible();

  await page.getByPlaceholder('store name').fill('New Store');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page).toHaveURL('/franchise-dashboard');
});