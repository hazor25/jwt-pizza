import { test, expect, Page } from 'playwright-test-coverage';
import { Role, User } from '../../src/service/pizzaService';

type MockUser = User & { password?: string };

async function initUserMocks(page: Page) {
  let loggedInUser: MockUser | undefined;

  const users: MockUser[] = [
    {
      id: '1',
      name: 'Admin User',
      email: 'a@jwt.com',
      password: 'admin',
      roles: [{ role: Role.Admin }],
    },
    {
      id: '2',
      name: 'Pizza Diner',
      email: 'd@jwt.com',
      password: 'diner',
      roles: [{ role: Role.Diner }],
    },
    {
      id: '3',
      name: '常用名字',
      email: 'common@jwt.com',
      password: 'pw',
      roles: [{ role: Role.Diner }],
    },
  ];

  let nextId = 100;

  function safeUser(user: MockUser | undefined) {
    if (!user) return undefined;
    const { password, ...rest } = user;
    return rest;
  }

  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      const body = route.request().postDataJSON();

      const newUser: MockUser = {
        id: String(nextId++),
        name: body.name,
        email: body.email,
        password: body.password,
        roles: [{ role: Role.Diner }],
      };

      users.push(newUser);
      loggedInUser = newUser;

      await route.fulfill({
        status: 200,
        json: {
          user: safeUser(newUser),
          token: 'register-token',
        },
      });
      return;
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      const user = users.find((u) => u.email === body.email && u.password === body.password);

      if (!user) {
        await route.fulfill({
          status: 401,
          json: { code: 401, message: 'unauthorized' },
        });
        return;
      }

      loggedInUser = user;

      await route.fulfill({
        status: 200,
        json: {
          user: safeUser(user),
          token: 'login-token',
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
      json: { message: 'Method not allowed' },
    });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      status: 200,
      json: safeUser(loggedInUser),
    });
  });

  await page.route('*/**/api/user', async (route) => {
    const method = route.request().method();

    if (method === 'PUT' || method === 'PATCH') {
      if (!loggedInUser) {
        await route.fulfill({
          status: 401,
          json: { message: 'unauthorized' },
        });
        return;
      }

      const body = route.request().postDataJSON();

      if (body.name !== undefined) loggedInUser.name = body.name;
      if (body.email !== undefined) loggedInUser.email = body.email;
      if (body.password !== undefined) loggedInUser.password = body.password;

      const idx = users.findIndex((u) => u.id === loggedInUser!.id);
      if (idx >= 0) {
        users[idx] = { ...loggedInUser };
      }

      await route.fulfill({
        status: 200,
        json: safeUser(loggedInUser),
      });
      return;
    }

    await route.fallback();
  });

  await page.route(/.*\/api\/user\/[^/]+$/, async (route) => {
    const method = route.request().method();

    if (method !== 'PUT' && method !== 'PATCH') {
      await route.fallback();
      return;
    }

    if (!loggedInUser) {
      await route.fulfill({
        status: 401,
        json: { message: 'unauthorized' },
      });
      return;
    }

    const body = route.request().postDataJSON();

    if (body.name !== undefined) loggedInUser.name = body.name;
    if (body.email !== undefined) loggedInUser.email = body.email;
    if (body.password !== undefined) loggedInUser.password = body.password;

    const idx = users.findIndex((u) => u.id === loggedInUser!.id);
    if (idx >= 0) {
      users[idx] = { ...loggedInUser };
    }

    await route.fulfill({
      status: 200,
      json: safeUser(loggedInUser),
    });
  });

  await page.route(/.*\/api\/admin\/users(\?.*)?$/, async (route) => {
    if (!loggedInUser || !loggedInUser.roles.some((r) => r.role === Role.Admin)) {
      await route.fulfill({
        status: 403,
        json: { message: 'forbidden' },
      });
      return;
    }

    const url = new URL(route.request().url());
    const filter = url.searchParams.get('name') || url.searchParams.get('q') || '';

    let filtered = users.map((u) => safeUser(u)!);

    if (filter) {
      filtered = filtered.filter((u) => u.name.includes(filter));
    }

    await route.fulfill({
      status: 200,
      json: {
        users: filtered,
        page: 1,
        pageSize: 10,
        total: filtered.length,
      },
    });
  });

  await page.route(/.*\/api\/admin\/user(\?.*)?$/, async (route) => {
    if (!loggedInUser || !loggedInUser.roles.some((r) => r.role === Role.Admin)) {
      await route.fulfill({
        status: 403,
        json: { message: 'forbidden' },
      });
      return;
    }

    const url = new URL(route.request().url());
    const filter = url.searchParams.get('name') || url.searchParams.get('q') || '';

    let filtered = users.map((u) => safeUser(u)!);

    if (filter) {
      filtered = filtered.filter((u) => u.name.includes(filter));
    }

    await route.fulfill({
      status: 200,
      json: {
        users: filtered,
        page: 1,
        pageSize: 10,
        total: filtered.length,
      },
    });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: [
        {
          id: 1,
          title: 'Veggie',
          image: 'pizza1.png',
          price: 0.0038,
          description: 'best pizza',
        },
      ],
    });
  });

  await page.route('*/**/api/order', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          orders: [],
        },
      });
      return;
    }

    await route.fulfill({
      status: 200,
      json: {},
    });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: { franchises: [] },
    });
  });

  await page.goto('/');
}

async function registerDiner(page: Page, name: string, email: string, password: string) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill(name);
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Register' }).click();
}

async function login(page: Page, email: string, password: string) {
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

async function loginAdmin(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
}

async function logout(page: Page) {
  await page.getByRole('link', { name: 'Logout' }).click();
}

async function openEditDialog(page: Page) {
  await page.getByRole('link', { name: 'pd' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
}

async function submitEditDialog(page: Page) {
  const dialog = page.getByRole('dialog');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(dialog).not.toBeVisible();
}

test('update user name', async ({ page }) => {
  await initUserMocks(page);

  const email = 'user1@jwt.com';
  const password = 'diner';

  await registerDiner(page, 'pizza diner', email, password);
  await expect(page.getByRole('main')).toContainText('best pizza');

  await openEditDialog(page);
  await page.getByRole('textbox').nth(0).fill('pizza dinerx');
  await submitEditDialog(page);

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await logout(page);
  await login(page, email, password);
  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

test('update user email', async ({ page }) => {
  await initUserMocks(page);

  const oldEmail = 'user2@jwt.com';
  const newEmail = 'updated2@jwt.com';
  const password = 'diner';

  await registerDiner(page, 'pizza diner', oldEmail, password);

  await openEditDialog(page);
  await page.getByRole('textbox').nth(1).fill(newEmail);
  await submitEditDialog(page);

  await expect(page.getByRole('main')).toContainText(newEmail);

  await logout(page);
  await login(page, newEmail, password);
  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText(newEmail);
});

test('update user password', async ({ page }) => {
  await initUserMocks(page);

  const email = 'user3@jwt.com';
  const oldPassword = 'diner';
  const newPassword = 'dinerx';

  await registerDiner(page, 'pizza diner', email, oldPassword);

  await openEditDialog(page);
  await page.getByRole('textbox').nth(2).fill(newPassword);
  await submitEditDialog(page);

  await logout(page);
  await login(page, email, newPassword);
  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');
});

test('update multiple user fields', async ({ page }) => {
  await initUserMocks(page);

  const oldEmail = 'user4@jwt.com';
  const newEmail = 'updated4@jwt.com';
  const oldPassword = 'diner';
  const newPassword = 'dinerx';
  const newName = 'pizza diner updated';

  await registerDiner(page, 'pizza diner', oldEmail, oldPassword);

  await openEditDialog(page);
  await page.getByRole('textbox').nth(0).fill(newName);
  await page.getByRole('textbox').nth(1).fill(newEmail);
  await page.getByRole('textbox').nth(2).fill(newPassword);
  await submitEditDialog(page);

  await expect(page.getByRole('main')).toContainText(newName);
  await expect(page.getByRole('main')).toContainText(newEmail);

  await logout(page);
  await login(page, newEmail, newPassword);
  await page.getByRole('link', { name: 'pu' }).click();

  await expect(page.getByRole('main')).toContainText(newName);
  await expect(page.getByRole('main')).toContainText(newEmail);
});

test('admin can see users list', async ({ page }) => {
  await initUserMocks(page);

  await loginAdmin(page);
  await page.getByRole('link', { name: 'Admin' }).click();

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Roles' })).toBeVisible();
});

test('admin can filter users by name', async ({ page }) => {
  await initUserMocks(page);

  await loginAdmin(page);
  await page.getByRole('link', { name: 'Admin' }).click();

  const userFilter = page.getByPlaceholder('Filter users');
  await userFilter.fill('常用');
  await page.getByRole('button', { name: 'Submit' }).nth(1).click();
});

test('admin users list supports pagination', async ({ page }) => {
  await initUserMocks(page);

  await loginAdmin(page);
  await page.getByRole('link', { name: 'Admin' }).click();

  const nextButton = page.getByRole('button', { name: '»' }).nth(1);
  await expect(nextButton).toBeVisible();

  if (await nextButton.isEnabled()) {
    await nextButton.click();
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  }
});

test('non-admin cannot see users list', async ({ page }) => {
  await initUserMocks(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/admin-dashboard');

  await expect(
    page.getByText('It looks like we have dropped a pizza on the floor')
  ).toBeVisible();
});

test('non-admin cannot see the delete buttons', async ({ page }) => {
  await initUserMocks(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/admin-dashboard');

  await expect(
    page.getByText('It looks like we have dropped a pizza on the floor')
  ).toBeVisible();

  await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible();
});