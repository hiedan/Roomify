import { test, expect, chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const db = require('./testDatabase.cjs');
const jwt = require('../../backend/node_modules/jsonwebtoken');
const KEY = 'roomify-auth-token';

function emailField(page) {
  return page.locator('.user-card p').filter({ has: page.getByText('Email:', { exact: true }) });
}

test.afterEach(async () => { await db.cleanup(); });
test.afterAll(async () => { await db.pool.end(); });

async function login(page, user, remember = false) {
  if (!page.url().endsWith('/login')) await page.goto('/login');
  await page.getByLabel(/^(Địa chỉ )?Email$/).fill(user.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(user.password);
  if (remember) await page.getByLabel('Ghi nhớ đăng nhập').check();
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Thông tin tài khoản' })).toBeVisible();
  await expect(emailField(page)).toHaveText(`Email: ${user.email}`);
}
async function lookupAccount(page, identifier) {
  await page.getByLabel('ID hoặc email người dùng', { exact: true }).fill(identifier);
  await page.getByRole('button', { name: 'Tìm tài khoản', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tài khoản tìm được', exact: true })).toBeVisible();
}
async function credentials(page) {
  return page.evaluate(key => ({
    session: !!sessionStorage.getItem(key), local: !!localStorage.getItem(key),
    cachedUser: !!sessionStorage.getItem('roomify-auth-user') || !!localStorage.getItem('roomify-auth-user'),
  }), KEY);
}
async function expectSignedOut(page) {
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('main', { name: 'Thông tin tài khoản' })).toHaveCount(0);
  expect(await credentials(page)).toEqual({ session: false, local: false, cachedUser: false });
}

test('standard login uses sessionStorage, clears older credentials and verifies reload through real /me', async ({ page }) => {
  const user = await db.account();
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('roomify-auth-token', 'old-credential');
    localStorage.setItem('roomify-auth-user', '{"fullName":"Stale account"}');
  });
  await login(page, user);
  expect(await credentials(page)).toEqual({ session: true, local: false, cachedUser: false });
  const me = page.waitForResponse(res => res.url().endsWith('/auth/me') && res.status() === 200);
  await page.reload();
  const response = await me;
  expect(!!response.request().headers().authorization?.startsWith('Bearer ')).toBe(true);
  await expect(emailField(page)).toHaveText(`Email: ${user.email}`);
});

test('remember-me survives closing and reopening a real Chromium process with its disk profile', async () => {
  const user = await db.account();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roomify-e2e-profile-'));
  let context;
  try {
    context = await chromium.launchPersistentContext(dir, { headless: true, baseURL: 'http://127.0.0.1:5175' });
    const page = context.pages()[0];
    await login(page, user, true);
    expect(await credentials(page)).toEqual({ session: false, local: true, cachedUser: false });
    await context.close();
    context = await chromium.launchPersistentContext(dir, { headless: true, baseURL: 'http://127.0.0.1:5175' });
    const reopened = context.pages()[0];
    const me = reopened.waitForResponse(res => res.url().endsWith('/auth/me') && res.status() === 200);
    await reopened.goto('/dashboard');
    await me;
    await expect(emailField(reopened)).toHaveText(`Email: ${user.email}`);
    await reopened.getByRole('button', { name: 'Đăng xuất' }).click();
    await expectSignedOut(reopened);
  } finally {
    await context?.close();
    const safePrefix = path.resolve(os.tmpdir()) + path.sep + 'roomify-e2e-profile-';
    if (!path.resolve(dir).startsWith(safePrefix)) throw new Error('Unexpected browser profile cleanup path');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('logout clears both stores/state; reload, back, direct navigation and subsequent app requests stay signed out', async ({ page }) => {
  const user = await db.account();
  await login(page, user);
  // Keep a genuine protected-document history entry to return to after logout.
  await page.goto('/dashboard?history=1');
  await expect(emailField(page)).toHaveText(`Email: ${user.email}`);
  const copiedToken = await page.evaluate(key => sessionStorage.getItem(key), KEY);
  await page.evaluate(key => {
    localStorage.setItem(key, 'stale-other-token');
    localStorage.setItem('roomify-auth-user', '{}');
    sessionStorage.setItem('roomify-auth-user', '{}');
  }, KEY);
  const afterLogoutHeaders = [];
  page.on('request', req => { if (req.url().includes('/api/v1/')) afterLogoutHeaders.push(!!req.headers().authorization); });
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expectSignedOut(page);
  await page.reload();
  await expectSignedOut(page);
  await page.goBack();
  await expectSignedOut(page);
  await page.goto('/dashboard');
  await expectSignedOut(page);
  expect(afterLogoutHeaders.length).toBeGreaterThan(0);
  expect(afterLogoutHeaders.some(Boolean)).toBe(false);
  // Deliberately separate API request: logout must NOT imply token revocation.
  const copied = await page.request.get('/api/v1/auth/me', { headers: { Authorization: `Bearer ${copiedToken}` } });
  expect(copied.status()).toBe(200);
});

test('logout remains local and immediate when its acknowledgement has a network failure', async ({ page }) => {
  await login(page, await db.account(), true);
  await page.route('**/api/v1/auth/logout', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expectSignedOut(page);
  await page.reload();
  await expectSignedOut(page);
});

test('logout during pending real /me cannot be undone by its late response', async ({ page }) => {
  await login(page, await db.account());
  let release;
  let started;
  const gate = new Promise(resolve => { release = resolve; });
  const received = new Promise(resolve => { started = resolve; });
  const handlers = [];
  await page.route('**/api/v1/auth/me', route => {
    const handler = (async () => {
      try {
        const response = await route.fetch();
        started();
        await gate;
        await route.fulfill({ response });
      } catch { /* The client aborts outstanding /me during local logout. */ }
    })();
    handlers.push(handler);
    return handler;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await received;
  await expect(page.getByRole('status')).toHaveText('Checking your session...');
  await expect(page.getByRole('main', { name: 'Thông tin tài khoản' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expectSignedOut(page);
  release();
  await Promise.all(handlers);
  await expectSignedOut(page);
});

for (const kind of ['expired', 'invalid', 'inactive', 'deleted']) {
  test(`${kind} session clears browser credentials after real backend revalidation`, async ({ page }) => {
    const user = await db.account();
    await login(page, user, true);
    if (kind === 'inactive') await db.query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
    if (kind === 'deleted') await db.query('DELETE FROM users WHERE id = $1', [user.id]);
    if (kind === 'invalid' || kind === 'expired') {
      const now = Math.floor(Date.now() / 1000);
      const value = kind === 'invalid' ? 'invalid-token' : jwt.sign(
        { sub: user.id, role: 'tenant', iat: now - 100, exp: now - 1 }, db.config.jwtSecret, { algorithm: 'HS256' }
      );
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value });
    }
    await page.reload();
    await expectSignedOut(page);
    await expect(page.getByRole('alert')).toContainText(kind === 'inactive' ? 'Contact an administrator' : 'sign in again');
  });
}

test('wrong password returns real credentials error without a fake user or token', async ({ page }) => {
  const user = await db.account();
  await page.goto('/login');
  await page.getByLabel(/^(Địa chỉ )?Email$/).fill(user.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('WrongSyntheticPassword!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  await expectSignedOut(page);
});

for (const failure of ['network', 'server', 'incomplete']) {
  test(`${failure} login response never creates a fallback session`, async ({ page }) => {
    const user = await db.account();
    await page.route('**/api/v1/auth/login', route => failure === 'network' ? route.abort('failed') : route.fulfill({
      status: failure === 'server' ? 500 : 200, contentType: 'application/json',
      body: JSON.stringify(failure === 'server'
        ? { success: false, error: { code: 'INTERNAL', message: 'Internal server error' } }
        : { success: true, data: { token: 'synthetic-invalid-session', expiresIn: 3600, user: { fullName: 'Incomplete user' } } }),
    }));
    await page.goto('/login');
    await page.getByLabel(/^(Địa chỉ )?Email$/).fill(user.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expectSignedOut(page);
  });
}

for (const failure of ['network', 'FORBIDDEN']) {
  test(`/me ${failure} preserves credential, hides unverified content and supports retry`, async ({ page }) => {
    const user = await db.account();
    await login(page, user);
    await page.route('**/api/v1/auth/me', route => failure === 'network' ? route.abort('failed') : route.fulfill({
      status: 403, contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Account role is not permitted' } }),
    }));
    await page.reload();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('main', { name: 'Thông tin tài khoản' })).toHaveCount(0);
    expect((await credentials(page)).session).toBe(true);
    await page.unroute('**/api/v1/auth/me');
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await expect(emailField(page)).toHaveText(`Email: ${user.email}`);
  });
}

test('refresh displays the current database role with the same stored token', async ({ page }) => {
  const user = await db.account();
  await login(page, user);
  await db.query("UPDATE users SET role = 'landlord' WHERE id = $1", [user.id]);
  await page.getByRole('button', { name: 'Làm mới tài khoản' }).click();
  await expect(page.locator('.role-badge')).toHaveText('Chủ trọ');
});

test('cached user alone never unlocks protected content', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => localStorage.setItem('roomify-auth-user', '{"role":"admin","fullName":"Forged user"}'));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Forged user')).toHaveCount(0);
  await expect(page.getByRole('main', { name: 'Thông tin tài khoản' })).toHaveCount(0);
});

test('real registration establishes only the returned one-hour tenant session', async ({ page }) => {
  const email = `browser-register-${randomUUID()}@gmail.com`;
  try {
    await page.goto('/register');
    await page.getByLabel('Họ và tên', { exact: true }).fill('Browser Registered User');
    await page.getByLabel(/^(Địa chỉ )?Email$/).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill('BrowserRegistration!123');
    await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('BrowserRegistration!123');
    const created = page.waitForResponse(res => res.url().endsWith('/auth/register') && res.status() === 201);
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    const response = await created;
    expect(Object.keys(response.request().postDataJSON()).sort()).toEqual(['email', 'fullName', 'password']);
    await expect(emailField(page)).toHaveText(`Email: ${email}`);
    await expect(page.locator('.role-badge')).toHaveText('Người thuê');
    expect(await credentials(page)).toEqual({ session: true, local: false, cachedUser: false });
    await page.reload();
    await expect(emailField(page)).toHaveText(`Email: ${email}`);
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expectSignedOut(page);
  } finally {
    await db.query('DELETE FROM users WHERE email = $1', [email]);
  }
});

test('registration rejects mismatched confirmation locally', async ({ page }) => {
  const registrations = [];
  page.on('request', request => { if (request.url().endsWith('/auth/register')) registrations.push(request); });
  await page.goto('/register');
  await page.getByLabel('Họ và tên', { exact: true }).fill('Confirmation Test');
  await page.getByLabel('Địa chỉ Email', { exact: true }).fill('confirmation-test@gmail.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('ConfirmationPassword!123');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('DifferentPassword!123');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
  await expect(page.getByLabel('Xác nhận mật khẩu', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect(registrations).toHaveLength(0);
});

test('password visibility toggles without changing the entered value or submitting the form', async ({ page }) => {
  await page.goto('/login');
  const password = page.getByLabel('Mật khẩu', { exact: true });
  await password.fill('VisibilityTest!123');
  await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('VisibilityTest!123');
  await page.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(page).toHaveURL(/\/login$/);
});

test('account dropdown supports Escape, outside click, profile navigation and real logout', async ({ page }) => {
  await login(page, await db.account());
  const trigger = page.getByLabel('Mở menu tài khoản');
  const menu = page.getByRole('navigation', { name: 'Tài khoản', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('heading', { name: /Xin chào/ }).click();
  await expect(menu).toBeHidden();
  await trigger.click();
  await menu.getByRole('link', { name: 'Trang cá nhân' }).click();
  await expect(page).toHaveURL(/\/dashboard#account-profile$/);
  await expect(menu).toBeHidden();
  await trigger.click();
  await page.locator('.account-dropdown').getByRole('button', { name: 'Đăng xuất' }).click();
  await expectSignedOut(page);
});

test('role portals stay protected and the landlord layout fits narrow and wide viewports', async ({ page }) => {
  const user = await db.account();
  await login(page, user);
  for (const route of ['/admin', '/landlord']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await db.query("UPDATE users SET role = 'landlord' WHERE id = $1", [user.id]);
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/landlord');
    await expect(page.getByRole('main', { name: 'Không gian chủ trọ', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Danh sách phòng chưa khả dụng' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('admin confirmation can be cancelled and locks/reopens only the real chosen test account', async ({ page }) => {
  const admin = await db.account();
  const target = await db.account();
  await db.query(`INSERT INTO landlord_requests (user_id, contact_name, phone, property_address)
    VALUES ($1, 'Synthetic Admin Target', '0901234567', 'Synthetic property address')`, [target.id]);
  await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  await login(page, admin);
  await page.goto('/admin');
  const updates = [];
  page.on('request', request => { if (request.method() === 'PATCH') updates.push(request); });
  await lookupAccount(page, target.id);
  await page.getByLabel('Vai trò', { exact: true }).selectOption('landlord');
  await page.getByLabel('Trạng thái', { exact: true }).selectOption('false');
  const save = page.getByRole('button', { name: 'Lưu thay đổi', exact: true });
  await save.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toHaveText(`Khóa tài khoản #${target.id}?`);
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(updates).toHaveLength(0);
  await expect(save).toBeFocused();
  await save.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(updates).toHaveLength(0);
  await save.click();
  await dialog.getByRole('button', { name: 'Xác nhận khóa' }).click();
  await expect(page.getByRole('status')).toContainText('Trạng thái: Bị khóa.');
  let result = await db.query('SELECT role, is_active FROM users WHERE id = $1', [target.id]);
  expect(result.rows[0]).toEqual({ role: 'landlord', is_active: false });
  await page.getByLabel('Trạng thái', { exact: true }).selectOption('true');
  await save.click();
  await dialog.getByRole('button', { name: 'Xác nhận cập nhật' }).click();
  await expect(page.getByRole('status')).toContainText('Trạng thái: Hoạt động.');
  result = await db.query('SELECT role, is_active FROM users WHERE id = $1', [target.id]);
  expect(result.rows[0]).toEqual({ role: 'landlord', is_active: true });
  expect(updates).toHaveLength(4);
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('admin reports partial success when one of the separate update operations fails', async ({ page }) => {
  const admin = await db.account();
  const target = await db.account();
  await db.query(`INSERT INTO landlord_requests (user_id, contact_name, phone, property_address)
    VALUES ($1, 'Synthetic Admin Target', '0901234567', 'Synthetic property address')`, [target.id]);
  await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  await login(page, admin);
  await page.goto('/admin');
  await page.route(`**/api/v1/admin/users/${target.id}/status`, route => route.fulfill({
    status: 500, contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'INTERNAL', message: 'Synthetic status failure' } }),
  }));
  await lookupAccount(page, target.email.toUpperCase());
  await page.getByLabel('Vai trò', { exact: true }).selectOption('landlord');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận cập nhật' }).click();
  await expect(page.getByRole('alert')).toContainText('Vai trò: Chủ trọ. Trạng thái: Synthetic status failure');
  const result = await db.query('SELECT role, is_active FROM users WHERE id = $1', [target.id]);
  expect(result.rows[0]).toEqual({ role: 'landlord', is_active: true });
});

test('admin lookup shows current account values by email or ID, protects admins and clears stale targets on search changes', async ({ page }) => {
  const admin = await db.account();
  const target = await db.account();
  await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  await db.query("UPDATE users SET role = 'landlord', is_active = false WHERE id = $1", [target.id]);
  await login(page, admin);
  await page.goto('/admin');
  await expect(page.getByRole('link', { name: 'Duyệt yêu cầu chủ trọ', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Yêu cầu trở thành chủ trọ', exact: true })).toBeVisible();
  const save = page.getByRole('button', { name: 'Lưu thay đổi', exact: true });
  await expect(save).toBeDisabled();
  await lookupAccount(page, ` ${target.email.toUpperCase()} `);
  const result = page.getByRole('region', { name: 'Tài khoản tìm được', exact: true });
  await expect(result).toContainText(target.id);
  await expect(result).toContainText(target.email);
  await expect(page.getByLabel('Vai trò', { exact: true })).toHaveValue('landlord');
  await expect(page.getByLabel('Trạng thái', { exact: true })).toHaveValue('false');
  await expect(save).toBeEnabled();
  await page.getByLabel('ID hoặc email người dùng', { exact: true }).fill(`unknown-${randomUUID()}@gmail.com`);
  await expect(result).toHaveCount(0);
  await expect(save).toBeDisabled();
  await page.getByRole('button', { name: 'Tìm tài khoản', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy tài khoản');
  await expect(save).toBeDisabled();
  await lookupAccount(page, target.id);
  await expect(result).toContainText(target.email);
  await lookupAccount(page, admin.email);
  await expect(page.getByLabel('Vai trò', { exact: true })).toHaveValue('admin');
  await expect(page.getByLabel('Vai trò', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Trạng thái', { exact: true })).toBeDisabled();
  await expect(save).toBeDisabled();
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('admin lookup discards a delayed result after the identifier changes and recovers from network errors', async ({ page }) => {
  const admin = await db.account();
  const target = await db.account();
  await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  await login(page, admin);
  await page.goto('/admin');
  let release;
  let started;
  let finished;
  const gate = new Promise(resolve => { release = resolve; });
  const received = new Promise(resolve => { started = resolve; });
  const drained = new Promise(resolve => { finished = resolve; });
  const endpoint = `**/api/v1/admin/users/lookup?identifier=${target.id}`;
  await page.route(endpoint, async route => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    expect((await response.json()).data.user.id).toBe(target.id);
    started();
    await gate;
    try { await route.fulfill({ response }); } catch { /* The edited identifier aborts this request. */ }
    finally { finished(); }
  });
  try {
    await page.getByLabel('ID hoặc email người dùng', { exact: true }).fill(target.id);
    await page.getByRole('button', { name: 'Tìm tài khoản', exact: true }).click();
    await received;
    await page.getByLabel('ID hoặc email người dùng', { exact: true }).fill(target.email);
    release();
    await drained;
    await expect(page.getByRole('region', { name: 'Tài khoản tìm được', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeDisabled();
  } finally { release(); await page.unroute(endpoint); }
  await page.route('**/api/v1/admin/users/lookup?*', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Tìm tài khoản', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Cannot reach the server');
  await expect(page.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeDisabled();
  await page.unroute('**/api/v1/admin/users/lookup?*');
  await lookupAccount(page, target.email);
  await expect(page.getByRole('region', { name: 'Tài khoản tìm được', exact: true })).toContainText(target.id);
});

test('keyboard login and account actions fit 320px and 1280px viewports', async ({ page }) => {
  const user = await db.account();
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/login');
    await page.getByLabel(/^(Địa chỉ )?Email$/).focus();
    await page.keyboard.type(user.email);
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Mật khẩu', { exact: true })).toBeFocused();
    await page.keyboard.type(user.password);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main', { name: 'Thông tin tài khoản' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Đăng xuất' }).focus();
    await page.keyboard.press('Enter');
    await expectSignedOut(page);
  }
});

test.describe('landlord access applications', () => {
  async function applicationForm(page, contactName) {
    await page.getByRole('link', { name: 'Trở thành chủ trọ', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Đăng ký trở thành chủ trọ' })).toBeVisible();
    await page.getByLabel('Họ và tên liên hệ', { exact: true }).fill(contactName);
    await page.getByLabel('Số điện thoại liên hệ', { exact: true }).fill('0901 234 567');
    await expect(page.getByLabel('Địa chỉ phòng dự kiến cho thuê', { exact: true })).toHaveCount(0);
    await page.getByLabel(/Thông tin bổ sung/).fill('Thông tin tổng hợp dùng riêng cho kiểm thử.');
  }
  async function submitApplication(page) {
    const submitted = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/v1/landlord-requests'));
    await page.getByRole('button', { name: 'Gửi yêu cầu xét duyệt', exact: true }).click();
    expect((await submitted).postDataJSON()).not.toHaveProperty('propertyAddress');
    await expect(page.getByRole('region', { name: 'Yêu cầu đang chờ duyệt' })).toBeVisible();
  }
  async function adminSession(browser) {
    const admin = await db.account();
    await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5175' });
    const page = await context.newPage();
    try {
      await login(page, admin);
      await page.goto('/admin');
      await expect(page.getByRole('heading', { name: 'Yêu cầu trở thành chủ trọ' })).toBeVisible();
      return { context, page };
    } catch (error) { await context.close(); throw error; }
  }

  test('tenant applies, waits as tenant, and gains landlord profile/access only after real admin approval', async ({ page, browser }) => {
    const user = await db.account();
    await login(page, user);
    const beforeToken = await page.evaluate(key => sessionStorage.getItem(key), KEY);
    const name = `Applicant ${randomUUID().slice(0, 8)}`;
    await applicationForm(page, name);
    await submitApplication(page);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Yêu cầu đang chờ duyệt' })).toBeVisible();
    expect((await db.query('SELECT role FROM users WHERE id = $1', [user.id])).rows[0].role).toBe('tenant');
    await page.getByRole('link', { name: 'Xem hồ sơ', exact: true }).click();
    await expect(page.locator('.role-badge')).toHaveText('Người thuê');
    await expect(page.getByRole('heading', { name: 'Yêu cầu đang chờ admin duyệt' })).toBeVisible();
    const admin = await adminSession(browser);
    try {
      const row = admin.page.getByRole('article', { name: `Yêu cầu của ${name}`, exact: true });
      await expect(row.getByText('Địa chỉ phòng', { exact: true })).toHaveCount(0);
      await row.getByRole('button', { name: 'Duyệt cấp quyền', exact: true }).click();
      await expect(admin.page.getByRole('dialog').getByText('Địa chỉ phòng', { exact: true })).toHaveCount(0);
      await admin.page.getByRole('dialog').getByRole('button', { name: 'Xác nhận cấp quyền' }).click();
      await expect(admin.page.getByRole('dialog')).toHaveCount(0);
      // The visible pending profile polls the real API, without replacing its token.
      await expect(page.locator('.role-badge')).toHaveText('Chủ trọ', { timeout: 15000 });
      expect(await page.evaluate(key => sessionStorage.getItem(key), KEY)).toBe(beforeToken);
      await page.getByRole('link', { name: 'Quản lý phòng', exact: true }).click();
      await expect(page).toHaveURL(/\/landlord$/);
      await expect(page.getByRole('main', { name: 'Không gian chủ trọ' })).toBeVisible();
      const result = await db.query('SELECT role FROM users WHERE id = $1', [user.id]);
      expect(result.rows[0].role).toBe('landlord');
    } finally { await admin.context.close(); }
  });

  test('admin rejection preserves tenant role, displays the reason and allows a revised application', async ({ page, browser }) => {
    const user = await db.account();
    const name = `Rejected ${randomUUID().slice(0, 8)}`;
    await login(page, user);
    await applicationForm(page, name);
    await submitApplication(page);
    const admin = await adminSession(browser);
    try {
      const row = admin.page.getByRole('article', { name: `Yêu cầu của ${name}`, exact: true });
      await row.getByRole('button', { name: 'Từ chối', exact: true }).click();
      await admin.page.getByLabel('Lý do từ chối', { exact: true }).fill('Vui lòng cập nhật thông tin liên hệ.');
      await admin.page.getByRole('dialog').getByRole('button', { name: 'Xác nhận từ chối' }).click();
      await expect(admin.page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Kiểm tra kết quả' }).click();
      await expect(page.getByText('Vui lòng cập nhật thông tin liên hệ.', { exact: true })).toBeVisible();
      expect((await db.query('SELECT role FROM users WHERE id = $1', [user.id])).rows[0].role).toBe('tenant');
      await expect(page.getByLabel('Họ và tên liên hệ', { exact: true })).toHaveValue(name);
      await page.getByLabel('Số điện thoại liên hệ', { exact: true }).fill('0909 876 543');
      await submitApplication(page);
      const result = await db.query('SELECT status FROM landlord_requests WHERE user_id = $1 ORDER BY id', [user.id]);
      expect(result.rows.map(row => row.status)).toEqual(['rejected', 'pending']);
      await admin.page.getByLabel('Trạng thái yêu cầu').selectOption('rejected');
      await expect(admin.page.getByRole('article', { name: `Yêu cầu của ${name}`, exact: true })).toContainText('Vui lòng cập nhật thông tin liên hệ.');
    } finally { await admin.context.close(); }
  });

  test('an applicant promoted to admin has approval disabled and can have the obsolete request rejected', async ({ page, browser }) => {
    const user = await db.account();
    const name = `Promoted ${randomUUID().slice(0, 8)}`;
    await login(page, user);
    await applicationForm(page, name);
    await submitApplication(page);
    await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
    const admin = await adminSession(browser);
    try {
      const row = admin.page.getByRole('article', { name: `Yêu cầu của ${name}`, exact: true });
      await expect(row).toContainText('Tài khoản này hiện là Quản trị viên.');
      await expect(row.getByRole('button', { name: 'Duyệt cấp quyền', exact: true })).toBeDisabled();
      await row.getByRole('button', { name: 'Từ chối', exact: true }).click();
      await admin.page.getByLabel('Lý do từ chối', { exact: true }).fill('Tài khoản đã có quyền quản trị viên.');
      await admin.page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
      await expect(admin.page.getByRole('dialog')).toHaveCount(0);
      await expect(row).toHaveCount(0);
      expect((await db.query('SELECT role FROM users WHERE id = $1', [user.id])).rows[0].role).toBe('admin');
      expect((await db.query('SELECT status FROM landlord_requests WHERE user_id = $1', [user.id])).rows[0].status).toBe('rejected');
    } finally { await admin.context.close(); }
  });

  test('a role change while the approval dialog is open blocks confirmation and refreshes the queue on close', async ({ page, browser }) => {
    const user = await db.account();
    const name = `Changed ${randomUUID().slice(0, 8)}`;
    await login(page, user);
    await applicationForm(page, name);
    await submitApplication(page);
    const admin = await adminSession(browser);
    try {
      const row = admin.page.getByRole('article', { name: `Yêu cầu của ${name}`, exact: true });
      await row.getByRole('button', { name: 'Duyệt cấp quyền', exact: true }).click();
      await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
      const dialog = admin.page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Xác nhận cấp quyền', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('Tài khoản này hiện là Quản trị viên');
      await expect(dialog.getByRole('button', { name: 'Xác nhận cấp quyền', exact: true })).toBeDisabled();
      await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
      await expect(row.getByRole('button', { name: 'Duyệt cấp quyền', exact: true })).toBeDisabled();
      expect((await db.query('SELECT role FROM users WHERE id = $1', [user.id])).rows[0].role).toBe('admin');
      expect((await db.query('SELECT status FROM landlord_requests WHERE user_id = $1', [user.id])).rows[0].status).toBe('pending');
    } finally { await admin.context.close(); }
  });

  test('application validation and loading failures keep the form recoverable at 320px and 1280px', async ({ page }) => {
    const user = await db.account();
    await login(page, user);
    await applicationForm(page, 'Validation Applicant');
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByLabel('Số điện thoại liên hệ', { exact: true }).fill('123');
    await page.getByRole('button', { name: 'Gửi yêu cầu xét duyệt' }).click();
    await expect(page.getByRole('alert')).toContainText('Phone must contain');
    await expect(page.getByRole('button', { name: 'Gửi yêu cầu xét duyệt' })).toBeEnabled();
    await page.route('**/api/v1/landlord-requests/me', route => route.abort('failed'));
    await page.reload();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute('**/api/v1/landlord-requests/me');
    await page.getByRole('button', { name: 'Thử tải lại' }).click();
    await expect(page.getByLabel('Họ và tên liên hệ', { exact: true })).toBeVisible();
    expect((await db.query('SELECT id FROM landlord_requests WHERE user_id = $1', [user.id])).rowCount).toBe(0);
  });
});

test.describe('cross-tab logout', () => {
  const LOGOUT_KEY = 'roomify-auth-logout';

  async function twoSessions(page, context, remember = false) {
    const user = await db.account();
    await login(page, user, remember);
    const other = await context.newPage();
    if (remember) {
      await other.goto('/dashboard');
      await expect(emailField(other)).toHaveText(`Email: ${user.email}`);
    } else await login(other, user);
    await expect(emailField(page)).toHaveText(`Email: ${user.email}`);
    return other;
  }

  for (const remember of [true, false]) {
    test(`${remember ? 'remembered' : 'standard'} session logout reaches the other open tab without reload`, async ({ page, context }) => {
      const other = await twoSessions(page, context, remember);
      // Preserve a real protected-document history entry in the receiving tab.
      await other.goto('/dashboard?history=remote');
      await expect(other.getByRole('main', { name: 'Thông tin tài khoản' })).toBeVisible();
      for (const tab of [page, other]) await tab.evaluate(() => {
        sessionStorage.setItem('roomify-auth-user', '{}');
        localStorage.setItem('roomify-auth-user', '{}');
        window.logoutSignalCounts = { channel: 0, storage: 0 };
        const observer = new BroadcastChannel('roomify-auth');
        observer.onmessage = () => { window.logoutSignalCounts.channel += 1; };
        window.addEventListener('storage', event => {
          if (event.key === 'roomify-auth-logout' && event.newValue !== null) window.logoutSignalCounts.storage += 1;
        });
      });
      const requests = [];
      context.on('request', req => {
        if (req.url().includes('/api/v1/')) requests.push({ path: new URL(req.url()).pathname, authorized: !!req.headers().authorization });
      });
      await page.getByRole('button', { name: 'Đăng xuất' }).click();
      // No interaction or reload on the receiver before this assertion.
      await expectSignedOut(other);
      await expectSignedOut(page);
      await expect.poll(() => other.evaluate(() => window.logoutSignalCounts)).toEqual({ channel: 1, storage: 1 });
      expect(await page.evaluate(() => window.logoutSignalCounts)).toEqual({ channel: 1, storage: 0 });
      await expect.poll(() => requests.filter(req => req.path.endsWith('/auth/logout')).length).toBe(1);
      await other.goBack();
      await expectSignedOut(other);
      await other.reload();
      await expectSignedOut(other);
      await other.goto('/dashboard');
      await expectSignedOut(other);
      // A subsequent real app request is unauthenticated, not a test fetch with a copied JWT.
      const user = await db.account();
      await other.getByLabel(/^(Địa chỉ )?Email$/).fill(user.email);
      await other.getByLabel('Mật khẩu', { exact: true }).fill('WrongSyntheticPassword!');
      await other.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await expect(other.getByRole('alert')).toHaveText('Invalid email or password');
      expect(requests.some(req => req.authorized)).toBe(false);
      expect(requests.filter(req => req.path.endsWith('/auth/logout'))).toHaveLength(1);
    });
  }

  for (const mode of ['unavailable', 'post-fails']) {
    test(`storage event fallback works when BroadcastChannel is ${mode}, ignoring old/remove markers`, async ({ page, context }) => {
      await context.addInitScript(mode => {
        if (mode === 'unavailable') Object.defineProperty(window, 'BroadcastChannel', { value: undefined });
        else {
          const NativeChannel = window.BroadcastChannel;
          window.BroadcastChannel = class extends NativeChannel {
            postMessage() { throw new DOMException('Channel blocked', 'SecurityError'); }
          };
        }
      }, mode);
      const other = await twoSessions(page, context);
      await page.getByRole('button', { name: 'Đăng xuất' }).click();
      await expectSignedOut(other);
      await expectSignedOut(page);
      const user = await db.account();
      await login(other, user);
      // Marker left by the earlier logout is not replayed on mount.
      expect(await other.evaluate(key => !!localStorage.getItem(key), LOGOUT_KEY)).toBe(true);
      await other.reload();
      await expect(emailField(other)).toHaveText(`Email: ${user.email}`);
      await page.evaluate(key => localStorage.removeItem(key), LOGOUT_KEY);
      // Establishing a different remembered account clears/sets token keys but
      // must neither log this receiver out nor change its account identity.
      await login(page, await db.account(), true);
      await expect(emailField(other)).toHaveText(`Email: ${user.email}`);
      await other.getByRole('button', { name: 'Làm mới tài khoản' }).click();
      await expect(emailField(other)).toHaveText(`Email: ${user.email}`);
    });
  }

  test('BroadcastChannel still delivers when storage-marker writes are blocked', async ({ page, context }) => {
    await context.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'roomify-auth-logout') throw new DOMException('Marker blocked', 'SecurityError');
        return set.call(this, key, value);
      };
    });
    const other = await twoSessions(page, context);
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expectSignedOut(page);
    await expectSignedOut(other);
  });

  test('local logout survives both unavailable transports and inaccessible localStorage', async ({ page, context }) => {
    const other = await twoSessions(page, context);
    await page.evaluate(() => {
      // Disable an already-open channel too; all local communication paths fail.
      BroadcastChannel.prototype.postMessage = () => { throw new DOMException('Blocked', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    });
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('main', { name: 'Thông tin tài khoản' })).toHaveCount(0);
    expect(await page.evaluate(() => !!sessionStorage.getItem('roomify-auth-token') || !!sessionStorage.getItem('roomify-auth-user'))).toBe(false);
    // With every transport unavailable, remote delivery is explicitly not guaranteed.
    await expect(other.getByRole('main', { name: 'Thông tin tài khoản' })).toBeVisible();
    await other.getByRole('button', { name: 'Đăng xuất' }).click();
    await expectSignedOut(other);
  });

  async function holdUpstream(page, url) {
    let release;
    let started;
    const gate = new Promise(resolve => { release = resolve; });
    const received = new Promise(resolve => { started = resolve; });
    const handlers = [];
    await page.route(url, route => {
      const handler = (async () => {
        try {
          const response = await route.fetch();
          started(response.status());
          await gate;
          await route.fulfill({ response });
        } catch { /* Aborting on remote logout can cancel late delivery. */ }
      })();
      handlers.push(handler);
      return handler;
    });
    return { received, release: async () => { release(); await Promise.all(handlers); } };
  }

  test('remote logout defeats a pending real /me response', async ({ page, context }) => {
    const other = await twoSessions(page, context);
    const held = await holdUpstream(other, '**/api/v1/auth/me');
    try {
      await other.getByRole('button', { name: 'Làm mới tài khoản' }).click();
      expect(await held.received).toBe(200);
      await expect(other.getByRole('status')).toHaveText('Checking your session...');
      await page.getByRole('button', { name: 'Đăng xuất' }).click();
      await expectSignedOut(other);
    } finally { await held.release(); }
    await expectSignedOut(other);
  });

  for (const kind of ['login', 'register']) {
    test(`remote logout defeats a pending successful real ${kind} response`, async ({ page, context }) => {
      await login(page, await db.account());
      const other = await context.newPage();
      const user = kind === 'login' ? await db.account() : {
        email: `browser-register-${randomUUID()}@gmail.com`, password: 'BrowserRegistration!123',
      };
      const held = await holdUpstream(other, `**/api/v1/auth/${kind}`);
      try {
        await other.goto(`/${kind}`);
        if (kind === 'register') await other.getByLabel('Họ và tên', { exact: true }).fill('Pending Browser User');
        await other.getByLabel(/^(Địa chỉ )?Email$/).fill(user.email);
        await other.getByLabel('Mật khẩu', { exact: true }).fill(user.password);
        if (kind === 'register') await other.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(user.password);
        await other.getByRole('button', { name: kind === 'login' ? 'Đăng nhập' : 'Đăng ký', exact: true }).click();
        expect(await held.received).toBe(kind === 'login' ? 200 : 201);
        await page.getByRole('button', { name: 'Đăng xuất' }).click();
        // Remote abort must settle the still-held request before it can deliver
        // credentials; an empty store alone was already true before logout.
        await expect(other.getByRole('button', { name: kind === 'login' ? 'Đăng nhập' : 'Đăng ký', exact: true })).toBeEnabled();
        await expect.poll(() => credentials(other)).toEqual({ session: false, local: false, cachedUser: false });
      } finally {
        await held.release();
        if (kind === 'register') await db.query('DELETE FROM users WHERE email = $1', [user.email]);
      }
      await expect(other.getByRole('button', { name: kind === 'login' ? 'Đăng nhập' : 'Đăng ký', exact: true })).toBeEnabled();
      await expect(other.getByRole('main', { name: 'Thông tin tài khoản' })).toHaveCount(0);
      expect(await credentials(other)).toEqual({ session: false, local: false, cachedUser: false });
      await other.goto('/dashboard');
      await expectSignedOut(other);
    });
  }
});
