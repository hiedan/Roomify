import { test, expect } from '@playwright/test';

const MOCK_LANDLORD = {
  id: '5',
  fullName: 'Đỗ Quốc Đại',
  email: 'landlord@roomify.test',
  role: 'landlord',
  isActive: true,
};

const ALL_LISTINGS = [
  {
    id: '101',
    ownerId: '5',
    title: 'Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM',
    description: 'Phòng mới xây, thoáng mát.',
    price: 3500000,
    areaM2: 25.5,
    address: '268 Lý Thường Kiệt, Phường 14',
    district: 'Quận 10',
    lat: 10.772583,
    lng: 106.657806,
    status: 'pending',
    rejectReason: null,
    roomType: { id: 1, code: 'private_room', name: 'Phòng trọ riêng' },
    coverImageUrl: null,
    amenities: [],
    images: [],
    createdAt: '2026-11-20T08:30:00.000Z',
  },
  {
    id: '98',
    ownerId: '5',
    title: 'Căn hộ mini đầy đủ nội thất Quận 3',
    description: 'An ninh 24/7, thang máy.',
    price: 6200000,
    areaM2: 35,
    address: '120 Võ Văn Tần',
    district: 'Quận 3',
    lat: 10.776889,
    lng: 106.690123,
    status: 'approved',
    rejectReason: null,
    roomType: { id: 4, code: 'apartment', name: 'Căn hộ chung cư' },
    coverImageUrl: null,
    amenities: [],
    images: [],
    createdAt: '2026-11-19T09:15:00.000Z',
  },
  {
    id: '95',
    ownerId: '5',
    title: 'Studio mini Bình Thạnh cần chỉnh sửa',
    description: 'Studio tầng 3, ban công rộng.',
    price: 5000000,
    areaM2: 32,
    address: '45/2 Điện Biên Phủ, Phường 15',
    district: 'Bình Thạnh',
    lat: 10.79612,
    lng: 106.70589,
    status: 'rejected',
    rejectReason: 'Hình ảnh phòng trọ bị mờ và giá thuê không khớp với mô tả đặt cọc.',
    roomType: { id: 3, code: 'studio', name: 'Studio / căn hộ mini' },
    coverImageUrl: null,
    amenities: [],
    images: [],
    createdAt: '2026-11-18T14:10:00.000Z',
  },
];

const SUMMARY = {
  total: 3,
  pending: 1,
  approved: 1,
  rejected: 1,
};

async function setupLandlordSession(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('roomify-auth-token', 'mock-landlord-token');
  });

  await page.route('**/api/v1/auth/me', route =>
    route.fulfill({ json: { success: true, data: MOCK_LANDLORD } })
  );
}

test.describe('Landlord My Listings Dashboard (UC-15 / T019)', () => {
  test('displays summary counters, filters across status tabs, and renders rejection reason banner', async ({
    page,
  }) => {
    await setupLandlordSession(page);

    await page.route('**/api/v1/listings/mine*', route => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status') || 'all';
      const filtered =
        status === 'all' ? ALL_LISTINGS : ALL_LISTINGS.filter(item => item.status === status);

      return route.fulfill({
        json: {
          success: true,
          data: {
            listings: filtered,
            summary: SUMMARY,
          },
        },
      });
    });

    await page.goto('/landlord/listings');

    // Summary counters
    await expect(page.getByTestId('summary-count-all')).toHaveText('3');
    await expect(page.getByTestId('summary-count-pending')).toHaveText('1');
    await expect(page.getByTestId('summary-count-approved')).toHaveText('1');
    await expect(page.getByTestId('summary-count-rejected')).toHaveText('1');

    // All 3 cards visible initially
    await expect(page.getByTestId('my-listing-card-101')).toBeVisible();
    await expect(page.getByTestId('my-listing-card-98')).toBeVisible();
    await expect(page.getByTestId('my-listing-card-95')).toBeVisible();
    await expect(page.getByTestId('view-public-listing-98')).toBeVisible();

    // Rejection reason visible
    await expect(page.getByTestId('reject-reason-banner-95')).toContainText(
      'Hình ảnh phòng trọ bị mờ và giá thuê không khớp với mô tả đặt cọc.'
    );

    // Filter Pending tab
    await page.getByTestId('status-tab-pending').click();
    await expect(page.getByTestId('my-listing-card-101')).toBeVisible();
    await expect(page.getByTestId('my-listing-card-98')).toHaveCount(0);
    await expect(page.getByTestId('my-listing-card-95')).toHaveCount(0);

    // Filter Approved tab
    await page.getByTestId('status-tab-approved').click();
    await expect(page.getByTestId('my-listing-card-98')).toBeVisible();
    await expect(page.getByTestId('my-listing-card-101')).toHaveCount(0);

    // Filter Rejected tab
    await page.getByTestId('status-tab-rejected').click();
    await expect(page.getByTestId('my-listing-card-95')).toBeVisible();
    await expect(page.getByTestId('reject-reason-banner-95')).toBeVisible();
  });

  test('displays empty state and CTA when landlord has no listings', async ({ page }) => {
    await setupLandlordSession(page);

    await page.route('**/api/v1/listings/mine*', route =>
      route.fulfill({
        json: {
          success: true,
          data: {
            listings: [],
            summary: { total: 0, pending: 0, approved: 0, rejected: 0 },
          },
        },
      })
    );

    await page.goto('/landlord/listings');

    await expect(page.getByTestId('my-listings-empty')).toBeVisible();
    await expect(page.getByText('Bạn chưa có tin đăng nào')).toBeVisible();
    const emptyCta = page.getByTestId('empty-create-listing-cta');
    await expect(emptyCta).toBeVisible();
    await expect(emptyCta).toHaveAttribute('href', '/landlord/listings/create');
  });
});
