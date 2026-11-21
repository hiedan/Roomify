import { test, expect } from '@playwright/test';

const MOCK_LANDLORD = {
  id: '5',
  fullName: 'Đỗ Quốc Đại',
  email: 'landlord@roomify.test',
  role: 'landlord',
  isActive: true,
};

const LISTINGS = [
  {
    id: '101',
    ownerId: '5',
    title: 'Phòng trọ cần xóa Quận 10',
    description: 'Phòng rộng rãi.',
    price: 3500000,
    areaM2: 25,
    address: '268 Lý Thường Kiệt',
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
    title: 'Phòng trọ giữ lại Quận 3',
    description: 'An ninh 24/7.',
    price: 4200000,
    areaM2: 28,
    address: '120 Võ Văn Tần',
    district: 'Quận 3',
    lat: 10.776889,
    lng: 106.690123,
    status: 'approved',
    rejectReason: null,
    roomType: { id: 3, code: 'studio', name: 'Studio / căn hộ mini' },
    coverImageUrl: null,
    amenities: [],
    images: [],
    createdAt: '2026-11-19T08:30:00.000Z',
  },
];

async function setupLandlordSession(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('roomify-auth-token', 'mock-landlord-token');
  });

  await page.route('**/api/v1/auth/me', route =>
    route.fulfill({ json: { success: true, data: MOCK_LANDLORD } })
  );
}

test.describe('Landlord Delete Listing (UC-17 / T028)', () => {
  test('shows confirmation modal, supports cancel without DELETE call, and removes listing on confirm', async ({
    page,
  }) => {
    await setupLandlordSession(page);

    let deleteCallCount = 0;
    let deletedAuthHeader = null;

    await page.route('**/api/v1/listings/mine*', route =>
      route.fulfill({
        json: {
          success: true,
          data: {
            listings: LISTINGS,
            summary: { total: 2, pending: 1, approved: 1, rejected: 0 },
          },
        },
      })
    );

    await page.route('**/api/v1/listings/101', async route => {
      if (route.request().method() === 'DELETE') {
        deleteCallCount += 1;
        deletedAuthHeader = route.request().headers().authorization;
        await route.fulfill({
          status: 200,
          json: {
            success: true,
            data: { id: '101', deleted: true },
          },
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/landlord/listings');
    await expect(page.getByTestId('my-listing-card-101')).toBeVisible();
    await expect(page.getByTestId('my-listing-card-98')).toBeVisible();

    // 1. Open modal and verify listing title
    await page.getByTestId('delete-listing-button-101').click();
    const modal = page.getByTestId('delete-listing-modal');
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('delete-modal-listing-title')).toHaveText(
      'Phòng trọ cần xóa Quận 10'
    );

    // 2. Cancel -> modal closes, item stays, zero DELETE calls
    await page.getByTestId('delete-cancel-button').click();
    await expect(modal).toBeHidden();
    await expect(page.getByTestId('my-listing-card-101')).toBeVisible();
    expect(deleteCallCount).toBe(0);

    // 3. Re-open modal and confirm deletion -> DELETE called, modal closes, item disappears
    await page.getByTestId('delete-listing-button-101').click();
    await expect(modal).toBeVisible();
    await page.getByTestId('delete-confirm-button').click();

    await expect(modal).toBeHidden();
    await expect(page.getByTestId('my-listing-card-101')).toHaveCount(0);
    await expect(page.getByTestId('my-listing-card-98')).toBeVisible();

    await expect(page.getByTestId('summary-count-all')).toHaveText('1');
    await expect(page.getByTestId('summary-count-pending')).toHaveText('0');
    await expect(page.getByTestId('summary-count-approved')).toHaveText('1');

    expect(deleteCallCount).toBe(1);
    expect(deletedAuthHeader).toBe('Bearer mock-landlord-token');
  });
});
