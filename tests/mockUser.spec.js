import { test, expect, Page } from 'playwright-test-coverage';

async function setupMocks(page: Page) {
  
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const postData = route.request().postDataJSON() || {};

    
    if (url.includes('/api/auth')) {
      if (method === 'POST' && url.includes('/register')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 999, name: postData.name, email: postData.email, roles: ['diner'] },
            token: 'mock-jwt-token-diner'
          })
        });
      }

      if (method === 'POST' && url.includes('/login')) {
        const email = postData.email;
        const isAdmin = email === 'a@jwt.com';
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: isAdmin ? 1 : 100,
              name: isAdmin ? 'Admin' : 'Pizza Diner',
              email,
              roles: isAdmin ? ['admin'] : ['diner']
            },
            token: isAdmin ? 'mock-jwt-token-admin' : 'mock-jwt-token-diner'
          })
        });
      }

      if (method === 'PUT' && url.includes('/user')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'updated' })
        });
      }
    }


    if (url.includes('/api/user/me') || url.includes('/api/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 100,
          name: 'pizza diner',
          email: 'user@mock.com',
          roles: ['diner']
        })
      });
    }

    
    if (url.includes('/api/users') || url.includes('/admin/users')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            { id: 1, name: 'Admin User', email: 'a@jwt.com', roles: ['admin'] },
            { id: 2, name: '常用名字', email: 'common@example.com', roles: ['diner'] },
            { id: 3, name: 'Pizza Diner', email: 'd@jwt.com', roles: ['diner'] },
            { id: 4, name: 'Another User', email: 'another@example.com', roles: ['diner'] }
          ],
          page: 0,
          total: 4
        })
      });
    }

   
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });
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



test.beforeEach(async ({ page }) => {
  await setupMocks(page);
});

test('update user name', async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
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
  const oldEmail = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  const newEmail = `updated${Math.floor(Math.random() * 10000)}@jwt.com`;
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
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
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
  const oldEmail = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  const newEmail = `updated${Math.floor(Math.random() * 10000)}@jwt.com`;
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
  await loginAdmin(page);
  await page.getByRole('link', { name: 'Admin' }).click();

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Roles' })).toBeVisible();

  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
});

test('admin can filter users by name', async ({ page }) => {
  await loginAdmin(page);
  await page.getByRole('link', { name: 'Admin' }).click();

  const userFilter = page.getByPlaceholder('Filter users');
  await userFilter.fill('常用');
  await page.getByRole('button', { name: 'Submit' }).nth(1).click();

  await expect(page.getByText('常用名字')).toBeVisible();
});

test('admin users list supports pagination', async ({ page }) => {
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
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/admin-dashboard');

  await expect(page.getByText('It looks like we have dropped a pizza on the floor')).toBeVisible();
});

test('non-admin cannot see the delete buttons', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/admin-dashboard');

  await expect(page.getByText('It looks like we have dropped a pizza on the floor')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible();
});