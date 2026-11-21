import { test, expect } from '@playwright/test';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const MOCK_LANDLORD = {
  id: '5',
  fullName: 'Đỗ Quốc Đại',
  email: 'landlord@roomify.test',
  role: 'landlord',
  isActive: true,
};

const SAMPLE_LISTING = {
  id: '95',
  ownerId: '5',
  title: 'Studio mini đầy đủ nội thất Bình Thạnh gần khu vực trung tâm thành phố',
  description: 'Studio tầng 3, ban công rộng, không chung chủ.',
  price: 5000000,
  areaM2: 32,
  address: '45/2 Điện Biên Phủ, Phường 15',
  district: 'Bình Thạnh',
  lat: 10.79612,
  lng: 106.70589,
  status: 'rejected',
  rejectReason: 'Hình ảnh phòng trọ bị mờ và giá thuê không khớp với mô tả đặt cọc.',
  roomType: { id: 3, code: 'studio', name: 'Studio / căn hộ mini' },
  coverImageUrl: 'https://example.com/photos/studio-thumb.jpg',
  amenities: [
    { id: 1, name: 'Máy lạnh', icon: 'ac' },
    { id: 2, name: 'Wifi', icon: 'wifi' },
  ],
  images: [
    {
      id: '180',
      url: 'https://example.com/photos/studio-thumb.jpg',
      isCover: true,
      sortOrder: 0,
    },
  ],
  createdAt: '2026-11-18T14:10:00.000Z',
};

async function setupMocks(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('roomify-auth-token', 'mock-landlord-token');
  });

  await page.route('**/api/v1/auth/me', route =>
    route.fulfill({ json: { success: true, data: MOCK_LANDLORD } })
  );

  await page.route('**/api/v1/listings/filters', route =>
    route.fulfill({
      json: {
        success: true,
        data: { districts: ['Bình Thạnh'], roomTypes: [], amenities: [] },
      },
    })
  );

  await page.route('**/api/v1/listings/mine/95', route =>
    route.fulfill({ json: { success: true, data: SAMPLE_LISTING } })
  );

  await page.route('**/api/v1/listings/mine*', route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          listings: [SAMPLE_LISTING],
          summary: { total: 1, pending: 0, approved: 0, rejected: 1 },
        },
      },
    })
  );

  await page.route('https://*.tile.openstreetmap.org/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(TINY_PNG_BASE64, 'base64'),
    })
  );
}

test.describe('Landlord Listing Management Responsive Layout (T031)', () => {
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 1280, height: 800 },
  ]) {
    test(`renders without horizontal overflow at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await setupMocks(page);
      await page.setViewportSize(viewport);

      // 1. PostListingPage + MapLocationPicker modal
      await page.goto('/landlord/listings/create');
      await expect(page.getByTestId('post-listing-form')).toBeVisible();
      let overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      await page.getByTestId('open-map-picker-button').click();
      await expect(page.getByTestId('map-picker-modal')).toBeVisible();
      overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      await page.getByTestId('map-cancel-button').click();

      // 2. MyListingsPage + DeleteListingModal
      await page.goto('/landlord/listings');
      await expect(page.getByTestId('my-listing-card-95')).toBeVisible();
      overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      await page.getByTestId('delete-listing-button-95').click();
      await expect(page.getByTestId('delete-listing-modal')).toBeVisible();
      overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      await page.getByTestId('delete-cancel-button').click();

      // 3. EditListingPage
      await page.goto('/landlord/listings/95/edit');
      await expect(page.getByTestId('edit-listing-form')).toBeVisible();
      overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    });
  }
});
