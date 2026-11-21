import { test, expect } from '@playwright/test';

const MOCK_LANDLORD = {
  id: '5',
  fullName: 'Đỗ Quốc Đại',
  email: 'landlord@roomify.test',
  role: 'landlord',
  isActive: true,
};

const MOCK_FILTERS = {
  districts: ['Quận 10', 'Bình Thạnh'],
  roomTypes: [
    { id: 1, code: 'private_room', name: 'Phòng trọ riêng' },
    { id: 2, code: 'shared_room', name: 'Phòng ở ghép' },
    { id: 3, code: 'studio', name: 'Studio / căn hộ mini' },
    { id: 4, code: 'apartment', name: 'Căn hộ chung cư' },
  ],
  amenities: [
    { id: '1', name: 'Máy lạnh', icon: 'ac' },
    { id: '2', name: 'Wifi', icon: 'wifi' },
    { id: '3', name: 'Chỗ để xe', icon: 'parking' },
  ],
};

async function setupLandlordSession(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('roomify-auth-token', 'mock-landlord-token');
  });

  await page.route('**/api/v1/auth/me', route =>
    route.fulfill({ json: { success: true, data: MOCK_LANDLORD } })
  );

  await page.route('**/api/v1/listings/filters', route =>
    route.fulfill({ json: { success: true, data: MOCK_FILTERS } })
  );
}

test.describe('Landlord Create Listing (UC-13 / T010)', () => {
  test('shows client validation errors and blocks POST when required fields or image URLs are invalid', async ({
    page,
  }) => {
    await setupLandlordSession(page);

    let postCallCount = 0;
    await page.route('**/api/v1/listings', async route => {
      if (route.request().method() === 'POST') {
        postCallCount += 1;
        await route.fulfill({ status: 201, json: { success: true, data: {} } });
        return;
      }
      await route.continue();
    });

    await page.goto('/landlord/listings/create');
    await expect(page.getByTestId('post-listing-form')).toBeVisible();

    // Case 1: Empty form submit
    await page.getByTestId('submit-listing-button').click();
    await expect(page.getByText('Tiêu đề phải từ 5 đến 150 ký tự.')).toBeVisible();
    await expect(page.getByText('Giá thuê phải là số nguyên dương (VNĐ/tháng).')).toBeVisible();
    await expect(page.getByText('Diện tích phải là số lớn hơn 0 (m²).')).toBeVisible();
    await expect(
      page.getByText('Cần ít nhất 1 URL hình ảnh hợp lệ (ảnh đầu tiên là ảnh bìa).')
    ).toBeVisible();
    expect(postCallCount).toBe(0);

    // Case 2: Invalid price (<= 0) and invalid image URL scheme
    await page.getByTestId('listing-title-input').fill('Phòng trọ mới gần Bách Khoa');
    await page.getByTestId('listing-price-input').fill('-500');
    await page.getByTestId('listing-area-input').fill('25');
    await page.getByTestId('listing-address-input').fill('268 Lý Thường Kiệt, Phường 14');
    await page.getByTestId('listing-district-input').fill('Quận 10');
    await page.getByTestId('listing-lat-input').fill('10.772583');
    await page.getByTestId('listing-lng-input').fill('106.657806');
    await page.getByTestId('image-url-input-0').fill('ftp://invalid-scheme.local/room.jpg');

    await page.getByTestId('submit-listing-button').click();
    await expect(page.getByText('Giá thuê phải là số nguyên dương (VNĐ/tháng).')).toBeVisible();
    await expect(
      page.getByText('URL ảnh thứ 1 không hợp lệ (cần bắt đầu bằng http:// hoặc https://).')
    ).toBeVisible();
    expect(postCallCount).toBe(0);
  });

  test('submits valid camelCase payload to POST /api/v1/listings and redirects to My Listings', async ({
    page,
  }) => {
    await setupLandlordSession(page);

    let capturedPayload = null;
    let capturedAuthHeader = null;

    const createdListing = {
      id: '101',
      ownerId: '5',
      title: 'Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM',
      description: 'Phòng mới xây, đầy đủ tiện nghi, an ninh 24/7.',
      price: 3500000,
      areaM2: 25.5,
      address: '268 Lý Thường Kiệt, Phường 14',
      district: 'Quận 10',
      lat: 10.772583,
      lng: 106.657806,
      roomType: { id: 3, code: 'studio', name: 'Studio / căn hộ mini' },
      status: 'pending',
      rejectReason: null,
      coverImageUrl: 'https://example.com/photos/room-main.jpg',
      amenities: [
        { id: 1, name: 'Máy lạnh', icon: 'ac' },
        { id: 2, name: 'Wifi', icon: 'wifi' },
      ],
      images: [
        {
          id: '201',
          url: 'https://example.com/photos/room-main.jpg',
          isCover: true,
          sortOrder: 0,
        },
        {
          id: '202',
          url: 'https://example.com/photos/room-bath.jpg',
          isCover: false,
          sortOrder: 1,
        },
      ],
      createdAt: '2026-11-20T08:30:00.000Z',
    };

    await page.route('**/api/v1/listings', async route => {
      if (route.request().method() === 'POST') {
        capturedAuthHeader = route.request().headers().authorization;
        capturedPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          json: { success: true, data: createdListing },
        });
        return;
      }
      await route.continue();
    });

    await page.route('**/api/v1/listings/mine*', route =>
      route.fulfill({
        json: {
          success: true,
          data: {
            listings: [createdListing],
            summary: { total: 1, pending: 1, approved: 0, rejected: 0 },
          },
        },
      })
    );

    await page.goto('/landlord/listings/create');

    await page
      .getByTestId('listing-title-input')
      .fill('  Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM  ');
    await page.getByTestId('listing-price-input').fill('3500000');
    await page.getByTestId('listing-area-input').fill('25.5');
    await page.getByTestId('listing-room-type-select').selectOption('3');
    await page
      .getByTestId('listing-description-input')
      .fill('Phòng mới xây, đầy đủ tiện nghi, an ninh 24/7.');
    await page.getByTestId('listing-address-input').fill('268 Lý Thường Kiệt, Phường 14');
    await page.getByTestId('listing-district-input').fill('Quận 10');
    await page.getByTestId('listing-lat-input').fill('10.772583');
    await page.getByTestId('listing-lng-input').fill('106.657806');

    await page.getByTestId('amenity-checkbox-1').check();
    await page.getByTestId('amenity-checkbox-2').check();

    await page
      .getByTestId('image-url-input-0')
      .fill('https://example.com/photos/room-main.jpg');
    await page.getByTestId('add-image-url-button').click();
    await page
      .getByTestId('image-url-input-1')
      .fill('https://example.com/photos/room-bath.jpg');

    await expect(page.getByTestId('cover-badge')).toBeVisible();

    await page.getByTestId('submit-listing-button').click();

    await expect(page).toHaveURL(/\/landlord\/listings$/);
    await expect(page.getByTestId('listing-success-notice')).toContainText('Chờ duyệt (pending)');
    await expect(page.getByTestId('my-listing-card-101')).toBeVisible();

    expect(capturedAuthHeader).toBe('Bearer mock-landlord-token');
    expect(capturedPayload).toEqual({
      title: 'Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM',
      description: 'Phòng mới xây, đầy đủ tiện nghi, an ninh 24/7.',
      price: 3500000,
      areaM2: 25.5,
      address: '268 Lý Thường Kiệt, Phường 14',
      district: 'Quận 10',
      lat: 10.772583,
      lng: 106.657806,
      roomTypeId: 3,
      amenityIds: [1, 2],
      imageUrls: [
        'https://example.com/photos/room-main.jpg',
        'https://example.com/photos/room-bath.jpg',
      ],
    });
  });
});
