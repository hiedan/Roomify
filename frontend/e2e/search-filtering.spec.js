import { test, expect } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const filterOptions = {
  districts: ['Bình Thạnh', 'Thủ Đức'],
  roomTypes: [
    { code: 'private_room', name: 'Phòng trọ riêng' },
    { code: 'shared_room', name: 'Phòng ở ghép' },
    { code: 'studio', name: 'Studio / căn hộ mini' },
    { code: 'apartment', name: 'Căn hộ chung cư' },
  ],
  amenities: [
    { id: '2', name: 'Wifi' },
    { id: '3', name: 'Chỗ để xe' },
  ],
};

const searchResult = {
  id: '1001',
  title: 'Studio gần trung tâm',
  price: 5000000,
  areaM2: 20,
  address: '12 Đường Mẫu',
  district: 'Bình Thạnh',
  roomType: { code: 'studio', name: 'Studio / căn hộ mini' },
  coverImageUrl: null,
  amenities: filterOptions.amenities,
  createdAt: '2026-11-17T10:00:00.000Z',
};

test('anonymous users can combine filters and retain all criteria when searching', async ({ page }) => {
  const searchRequests = [];
  await page.route('**/api/v1/listings**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) {
      await route.fulfill({ json: { success: true, data: filterOptions } });
      return;
    }

    searchRequests.push(url);
    await route.fulfill({
      json: {
        success: true,
        data: [searchResult],
        pagination: { page: Number(url.searchParams.get('page') || 1), limit: 12, total: 1 },
      },
    });
  });

  await page.goto('/search');
  await expect(page.getByRole('main', { name: 'Tìm kiếm phòng' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tìm phòng phù hợp' })).toBeVisible();
  await expect(page.getByLabel('Tỉnh/Thành phố')).toContainText('Thành phố Hà Nội');
  await expect(page.getByLabel('Loại phòng')).toContainText('Studio / căn hộ mini');
  await expect(page.getByRole('checkbox', { name: 'Wifi' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Chỗ để xe' })).toBeVisible();

  await page.getByLabel('Từ khóa').fill(' gần trung tâm ');
  await page.getByLabel('Tỉnh/Thành phố').selectOption('01');
  await page.getByLabel('Phường/Xã').selectOption('00004');
  await page.getByLabel('Loại phòng').selectOption('studio');
  await page.getByLabel('Giá tối đa (VND/tháng)').fill('5000000');
  await page.getByLabel('Diện tích tối thiểu (m²)').fill('20');
  await page.getByLabel('Diện tích tối đa (m²)').fill('20');
  await page.getByRole('checkbox', { name: 'Wifi' }).check();
  await page.getByRole('checkbox', { name: 'Chỗ để xe' }).check();
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();

  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  await expect.poll(() => searchRequests.length).toBeGreaterThanOrEqual(2);
  const appliedSearch = searchRequests.at(-1);
  expect(appliedSearch.searchParams.get('keyword')).toBe('gần trung tâm');
  expect(appliedSearch.searchParams.get('provinceCode')).toBe('01');
  expect(appliedSearch.searchParams.get('wardCode')).toBe('00004');
  expect(appliedSearch.searchParams.get('roomType')).toBe('studio');
  expect(appliedSearch.searchParams.get('maxPrice')).toBe('5000000');
  expect(appliedSearch.searchParams.get('minAreaM2')).toBe('20');
  expect(appliedSearch.searchParams.get('maxAreaM2')).toBe('20');
  expect(appliedSearch.searchParams.getAll('amenityIds')).toEqual(['2', '3']);

  await expect(page.getByLabel('Từ khóa')).toHaveValue(' gần trung tâm ');
  await expect(page.getByLabel('Tỉnh/Thành phố')).toHaveValue('01');
  await expect(page.getByLabel('Phường/Xã')).toHaveValue('00004');
  await expect(page.getByLabel('Loại phòng')).toHaveValue('studio');
  await expect(page.getByLabel('Giá tối đa (VND/tháng)')).toHaveValue('5000000');
  await expect(page.getByRole('checkbox', { name: 'Wifi' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Chỗ để xe' })).toBeChecked();
});

test('anonymous keyword and province search starts with approved results', async ({ page }) => {
  const requests = [];
  await page.route('**/api/v1/listings**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: filterOptions } });
    requests.push(url);
    return route.fulfill({ json: { success: true, data: [searchResult], pagination: { page: 1, limit: 12, total: 1 } } });
  });
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  expect(requests[0].search).toBe('');
  await page.getByLabel('Từ khóa').fill('  gần trung tâm  ');
  await page.getByLabel('Tỉnh/Thành phố').selectOption('01');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get('keyword')).toBe('gần trung tâm');
  expect(requests.at(-1).searchParams.get('provinceCode')).toBe('01');
});

test('province changes reset the ward and the catalog is available without listings', async ({ page }) => {
  await page.route('**/api/v1/listings**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: { districts: [], roomTypes: [], amenities: [{ id: '1', name: 'Wifi' }] } } });
    return route.fulfill({ json: { success: true, data: [], pagination: { page: 1, limit: 12, total: 0 } } });
  });
  await page.goto('/search');
  await expect(page.getByRole('checkbox', { name: 'Wifi' })).toBeVisible();
  await expect(page.getByLabel('Phường/Xã')).toBeDisabled();
  await page.getByLabel('Tỉnh/Thành phố').selectOption('01');
  await page.getByLabel('Phường/Xã').selectOption('00004');
  await page.getByLabel('Tỉnh/Thành phố').selectOption('79');
  await expect(page.getByLabel('Phường/Xã')).toHaveValue('');
  await expect(page.getByLabel('Phường/Xã').locator('option[value="00004"]')).toHaveCount(0);
});

test('empty results can clear all criteria and search again', async ({ page }) => {
  const requests = [];
  await page.route('**/api/v1/listings**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: filterOptions } });
    requests.push(url);
    const empty = url.searchParams.has('keyword');
    return route.fulfill({ json: { success: true, data: empty ? [] : [searchResult], pagination: { page: 1, limit: 12, total: empty ? 0 : 1 } } });
  });
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  await page.getByLabel('Từ khóa').fill('không tồn tại');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect(page.getByRole('heading', { name: 'Chưa tìm thấy phòng phù hợp' })).toBeVisible();
  await page.getByRole('form', { name: 'Bộ lọc tìm kiếm' }).getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await expect(page.getByLabel('Từ khóa')).toHaveValue('');
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  expect(requests.at(-1).search).toBe('');
});

test('invalid range is explained and leaves criteria editable', async ({ page }) => {
  await page.route('**/api/v1/listings**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: filterOptions } });
    return route.fulfill({ json: { success: true, data: [searchResult], pagination: { page: 1, limit: 12, total: 1 } } });
  });
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  await page.getByLabel('Diện tích tối thiểu (m²)').fill('30');
  await page.getByLabel('Diện tích tối đa (m²)').fill('20');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect(page.getByRole('alert')).toContainText('Diện tích tối thiểu');
  await expect(page.getByLabel('Diện tích tối thiểu (m²)')).toHaveValue('30');
  await expect(page.getByRole('heading', { name: searchResult.title })).toHaveCount(0);
});

test('service failure does not show stale results and retry preserves criteria', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/listings**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: filterOptions } });
    if (url.searchParams.has('keyword') && fail) {
      fail = false;
      return route.fulfill({ status: 503, json: { success: false, error: { code: 'SERVER_ERROR', message: 'Unavailable' } } });
    }
    return route.fulfill({ json: { success: true, data: [searchResult], pagination: { page: 1, limit: 12, total: 1 } } });
  });
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  await page.getByLabel('Từ khóa').fill('studio');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect(page.getByRole('alert')).toContainText('Không thể tìm phòng');
  await expect(page.getByRole('heading', { name: searchResult.title })).toHaveCount(0);
  await expect(page.getByLabel('Từ khóa')).toHaveValue('studio');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
});

test('retry after a failed page change keeps the selected filters and page', async ({ page }) => {
  const requests = [];
  let failPageTwo = true;
  await page.route('**/api/v1/listings**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: filterOptions } });
    requests.push(url);
    if (url.searchParams.get('page') === '2' && failPageTwo) {
      failPageTwo = false;
      return route.fulfill({ status: 503, json: { success: false, error: { code: 'SERVER_ERROR', message: 'Unavailable' } } });
    }
    return route.fulfill({ json: { success: true, data: [searchResult], pagination: { page: Number(url.searchParams.get('page') || 1), limit: 12, total: 25 } } });
  });
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  await page.getByLabel('Từ khóa').fill('studio');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await page.getByRole('button', { name: 'Tiếp theo' }).click();
  await expect(page.getByRole('alert')).toContainText('Không thể tìm phòng');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Trang 2 / 3')).toBeVisible();
  expect(requests.at(-1).searchParams.get('keyword')).toBe('studio');
  expect(requests.at(-1).searchParams.get('page')).toBe('2');
});

test('cards page through matching results and open public details', async ({ page }) => {
  const requests = [];
  const detail = { ...searchResult, description: 'Phòng sáng và yên tĩnh.', images: [{ url: 'https://example.invalid/room.jpg', isCover: true }] };
  await page.route('**/api/v1/listings**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: filterOptions } });
    if (url.pathname.endsWith('/1001')) return route.fulfill({ json: { success: true, data: detail } });
    requests.push(url);
    return route.fulfill({ json: { success: true, data: [searchResult], pagination: { page: Number(url.searchParams.get('page') || 1), limit: 12, total: 25 } } });
  });
  await page.goto('/search');
  await expect(page.getByText('5.000.000 đ/tháng')).toBeVisible();
  await expect(page.getByText('20 m²')).toBeVisible();
  await expect(page.getByRole('article').getByText('Bình Thạnh', { exact: false })).toBeVisible();
  if (process.env.ROOMIFY_CAPTURE_SEARCH === '1') {
    await page.screenshot({ path: path.join(os.tmpdir(), 'roomify-search-review.png'), fullPage: true });
  }
  await page.getByLabel('Từ khóa').fill('studio');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await page.getByRole('button', { name: 'Tiếp theo' }).click();
  await expect(page.getByText('Trang 2 / 3')).toBeVisible();
  expect(requests.at(-1).searchParams.get('keyword')).toBe('studio');
  expect(requests.at(-1).searchParams.get('page')).toBe('2');
  await page.getByRole('button', { name: 'Trước' }).click();
  await expect(page.getByText('Trang 1 / 3')).toBeVisible();
  await page.getByRole('link', { name: 'Xem chi tiết' }).click();
  await expect(page).toHaveURL(/\/listings\/1001$/);
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  await expect(page.getByText(detail.description)).toBeVisible();
  await expect(page.getByText('Wifi')).toBeVisible();
  if (process.env.ROOMIFY_CAPTURE_SEARCH === '1') {
    await page.screenshot({ path: path.join(os.tmpdir(), 'roomify-detail-review.png'), fullPage: true });
  }
});

test('keyboard flow fits 320 and 1280 CSS pixel viewports', async ({ page }) => {
  await page.route('**/api/v1/listings**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: filterOptions } });
    if (url.pathname.endsWith('/1001')) return route.fulfill({ json: { success: true, data: { ...searchResult, description: 'Mô tả phòng', images: [] } } });
    return route.fulfill({ json: { success: true, data: [searchResult], pagination: { page: 1, limit: 12, total: 1 } } });
  });
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/search');
    await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByLabel('Từ khóa').focus();
    await page.keyboard.type('studio');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Tỉnh/Thành phố')).toBeFocused();
    const detailLink = page.getByRole('link', { name: 'Xem chi tiết' });
    for (let index = 0; index < 18 && !(await detailLink.evaluate(element => element === document.activeElement)); index += 1) {
      await page.keyboard.press('Tab');
    }
    await expect(detailLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/listings\/1001$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('loading is visible while a search is pending', async ({ page }) => {
  await page.route('**/api/v1/listings**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { success: true, data: filterOptions } });
    if (url.searchParams.has('keyword')) await new Promise(resolve => setTimeout(resolve, 1200));
    return route.fulfill({ json: { success: true, data: [searchResult], pagination: { page: 1, limit: 12, total: 1 } } });
  });
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
  await page.getByLabel('Từ khóa').fill('studio');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect(page.locator('.search-results [role="status"]')).toContainText('Đang tìm phòng phù hợp...');
  await expect(page.getByRole('heading', { name: searchResult.title })).toBeVisible();
});

test('unapproved or missing detail returns a clear not-found state', async ({ page }) => {
  await page.route('**/api/v1/listings/1001', route => route.fulfill({ status: 404, json: { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } } }));
  await page.goto('/listings/1001');
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy phòng');
  await expect(page.getByRole('link', { name: 'Quay lại tìm phòng' })).toBeVisible();
});
