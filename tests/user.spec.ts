import { test, expect, Page } from 'playwright-test-coverage';

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

async function logout(page: Page) {
  await page.getByRole('link', { name: 'Logout' }).click();
}

async function openEditDialog(page: Page) {
  await page.getByRole('link', { name: 'pd' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
}

async function submitEditDialog(page: Page) {
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
}

test('update user name', async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  const password = 'diner';

  await registerDiner(page, 'pizza diner', email, password);

  await openEditDialog(page);
  await page.getByRole('textbox').nth(0).fill('pizza dinerx');
  await submitEditDialog(page);

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await logout(page);
  await login(page, email, password);
  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});
