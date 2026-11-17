import { test, expect } from '@playwright/test';

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
  await expect(page.getByLabel('Khu vực')).toContainText('Bình Thạnh');
  await expect(page.getByLabel('Loại phòng')).toContainText('Studio / căn hộ mini');
  await expect(page.getByRole('checkbox', { name: 'Wifi' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Chỗ để xe' })).toBeVisible();

  await page.getByLabel('Từ khóa').fill(' gần trung tâm ');
  await page.getByLabel('Khu vực').selectOption({ label: 'Bình Thạnh' });
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
  expect(appliedSearch.searchParams.get('district')).toBe('Bình Thạnh');
  expect(appliedSearch.searchParams.get('roomType')).toBe('studio');
  expect(appliedSearch.searchParams.get('maxPrice')).toBe('5000000');
  expect(appliedSearch.searchParams.get('minAreaM2')).toBe('20');
  expect(appliedSearch.searchParams.get('maxAreaM2')).toBe('20');
  expect(appliedSearch.searchParams.getAll('amenityIds')).toEqual(['2', '3']);

  await expect(page.getByLabel('Từ khóa')).toHaveValue(' gần trung tâm ');
  await expect(page.getByLabel('Khu vực')).toHaveValue('Bình Thạnh');
  await expect(page.getByLabel('Loại phòng')).toHaveValue('studio');
  await expect(page.getByLabel('Giá tối đa (VND/tháng)')).toHaveValue('5000000');
  await expect(page.getByRole('checkbox', { name: 'Wifi' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Chỗ để xe' })).toBeChecked();
});
