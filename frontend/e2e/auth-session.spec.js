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
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  if (remember) await page.getByLabel('Remember me').check();
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Account view' })).toBeVisible();
  await expect(emailField(page)).toHaveText(`Email: ${user.email}`);
}
async function credentials(page) {
  return page.evaluate(key => ({
    session: !!sessionStorage.getItem(key), local: !!localStorage.getItem(key),
    cachedUser: !!sessionStorage.getItem('roomify-auth-user') || !!localStorage.getItem('roomify-auth-user'),
  }), KEY);
}
async function expectSignedOut(page) {
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('main', { name: 'Account view' })).toHaveCount(0);
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
    await reopened.getByRole('button', { name: 'Sign Out' }).click();
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
  await page.getByRole('button', { name: 'Sign Out' }).click();
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
  await page.getByRole('button', { name: 'Sign Out' }).click();
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
  await expect(page.getByRole('main', { name: 'Account view' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign Out' }).click();
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
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('WrongSyntheticPassword!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
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
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
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
    await expect(page.getByRole('main', { name: 'Account view' })).toHaveCount(0);
    expect((await credentials(page)).session).toBe(true);
    await page.unroute('**/api/v1/auth/me');
    await page.getByRole('button', { name: 'Retry session check' }).click();
    await expect(emailField(page)).toHaveText(`Email: ${user.email}`);
  });
}

test('refresh displays the current database role with the same stored token', async ({ page }) => {
  const user = await db.account();
  await login(page, user);
  await db.query("UPDATE users SET role = 'landlord' WHERE id = $1", [user.id]);
  await page.getByRole('button', { name: 'Refresh account' }).click();
  await expect(page.locator('.role-badge')).toHaveText('landlord');
});

test('cached user alone never unlocks protected content', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => localStorage.setItem('roomify-auth-user', '{"role":"admin","fullName":"Forged user"}'));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Forged user')).toHaveCount(0);
  await expect(page.getByRole('main', { name: 'Account view' })).toHaveCount(0);
});

test('real registration establishes only the returned one-hour tenant session', async ({ page }) => {
  const email = `browser-register-${randomUUID()}@gmail.com`;
  try {
    await page.goto('/register');
    await page.getByLabel('Full name', { exact: true }).fill('Browser Registered User');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('BrowserRegistration!123');
    const created = page.waitForResponse(res => res.url().endsWith('/auth/register') && res.status() === 201);
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
    await created;
    await expect(emailField(page)).toHaveText(`Email: ${email}`);
    await expect(page.locator('.role-badge')).toHaveText('tenant');
    expect(await credentials(page)).toEqual({ session: true, local: false, cachedUser: false });
    await page.reload();
    await expect(emailField(page)).toHaveText(`Email: ${email}`);
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expectSignedOut(page);
  } finally {
    await db.query('DELETE FROM users WHERE email = $1', [email]);
  }
});

test('keyboard login and account actions fit 320px and 1280px viewports', async ({ page }) => {
  const user = await db.account();
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).focus();
    await page.keyboard.type(user.email);
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
    await page.keyboard.type(user.password);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main', { name: 'Account view' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Sign Out' }).focus();
    await page.keyboard.press('Enter');
    await expectSignedOut(page);
  }
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
      await expect(other.getByRole('main', { name: 'Account view' })).toBeVisible();
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
      await page.getByRole('button', { name: 'Sign Out' }).click();
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
      await other.getByLabel('Email', { exact: true }).fill(user.email);
      await other.getByLabel('Password', { exact: true }).fill('WrongSyntheticPassword!');
      await other.getByRole('button', { name: 'Sign In', exact: true }).click();
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
      await page.getByRole('button', { name: 'Sign Out' }).click();
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
      await other.getByRole('button', { name: 'Refresh account' }).click();
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
    await page.getByRole('button', { name: 'Sign Out' }).click();
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
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('main', { name: 'Account view' })).toHaveCount(0);
    expect(await page.evaluate(() => !!sessionStorage.getItem('roomify-auth-token') || !!sessionStorage.getItem('roomify-auth-user'))).toBe(false);
    // With every transport unavailable, remote delivery is explicitly not guaranteed.
    await expect(other.getByRole('main', { name: 'Account view' })).toBeVisible();
    await other.getByRole('button', { name: 'Sign Out' }).click();
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
      await other.getByRole('button', { name: 'Refresh account' }).click();
      expect(await held.received).toBe(200);
      await expect(other.getByRole('status')).toHaveText('Checking your session...');
      await page.getByRole('button', { name: 'Sign Out' }).click();
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
        if (kind === 'register') await other.getByLabel('Full name', { exact: true }).fill('Pending Browser User');
        await other.getByLabel('Email', { exact: true }).fill(user.email);
        await other.getByLabel('Password', { exact: true }).fill(user.password);
        await other.getByRole('button', { name: kind === 'login' ? 'Sign In' : 'Sign Up', exact: true }).click();
        expect(await held.received).toBe(kind === 'login' ? 200 : 201);
        await page.getByRole('button', { name: 'Sign Out' }).click();
        // Remote abort must settle the still-held request before it can deliver
        // credentials; an empty store alone was already true before logout.
        await expect(other.getByRole('button', { name: kind === 'login' ? 'Sign In' : 'Sign Up', exact: true })).toBeEnabled();
        await expect.poll(() => credentials(other)).toEqual({ session: false, local: false, cachedUser: false });
      } finally {
        await held.release();
        if (kind === 'register') await db.query('DELETE FROM users WHERE email = $1', [user.email]);
      }
      await expect(other.getByRole('button', { name: kind === 'login' ? 'Sign In' : 'Sign Up', exact: true })).toBeEnabled();
      await expect(other.getByRole('main', { name: 'Account view' })).toHaveCount(0);
      expect(await credentials(other)).toEqual({ session: false, local: false, cachedUser: false });
      await other.goto('/dashboard');
      await expectSignedOut(other);
    });
  }
});
