import { test, expect } from '@playwright/test';

const MOCK_LANDLORD = {
  id: '5',
  fullName: 'Đỗ Quốc Đại',
  email: 'landlord@roomify.test',
  role: 'landlord',
  isActive: true,
};

const MOCK_FILTERS = {
  districts: ['Bình Thạnh', 'Quận 10'],
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

const REJECTED_LISTING = {
  id: '95',
  ownerId: '5',
  title: 'Studio mini đầy đủ nội thất Bình Thạnh',
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
    {
      id: '181',
      url: 'https://example.com/photos/studio-bath.jpg',
      isCover: false,
      sortOrder: 1,
    },
  ],
  createdAt: '2026-11-18T14:10:00.000Z',
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

test.describe('Landlord Edit Listing (UC-16 / T025)', () => {
  test('pre-populates listing data, displays re-moderation notice, sends strict PATCH payload, and redirects', async ({
    page,
  }) => {
    await setupLandlordSession(page);

    let capturedPatchPayload = null;
    let capturedPatchHeaders = null;

    const updatedListing = {
      ...REJECTED_LISTING,
      price: 4800000,
      areaM2: 33.5,
      description: 'Đã cập nhật giá thuê và hình ảnh rõ nét.',
      status: 'pending',
      rejectReason: null,
      amenities: [
        { id: 1, name: 'Máy lạnh', icon: 'ac' },
        { id: 2, name: 'Wifi', icon: 'wifi' },
        { id: 3, name: 'Chỗ để xe', icon: 'parking' },
      ],
      images: [
        {
          id: '210',
          url: 'https://example.com/photos/studio-updated.jpg',
          isCover: true,
          sortOrder: 0,
        },
        {
          id: '211',
          url: 'https://example.com/photos/studio-bath.jpg',
          isCover: false,
          sortOrder: 1,
        },
      ],
    };

    await page.route('**/api/v1/listings/mine/95', route =>
      route.fulfill({ json: { success: true, data: REJECTED_LISTING } })
    );

    await page.route('**/api/v1/listings/95', async route => {
      if (route.request().method() === 'PATCH') {
        capturedPatchHeaders = route.request().headers();
        capturedPatchPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          json: { success: true, data: updatedListing },
        });
        return;
      }
      await route.continue();
    });

    await page.route('**/api/v1/listings/mine?*', route =>
      route.fulfill({
        json: {
          success: true,
          data: {
            listings: [updatedListing],
            summary: { total: 1, pending: 1, approved: 0, rejected: 0 },
          },
        },
      })
    );

    await page.goto('/landlord/listings/95/edit');

    // Verify banners
    await expect(page.getByTestId('remoderation-notice-banner')).toBeVisible();
    await expect(page.getByTestId('edit-reject-reason-banner')).toContainText(
      REJECTED_LISTING.rejectReason
    );

    // Verify pre-populated fields
    await expect(page.getByTestId('listing-title-input')).toHaveValue(REJECTED_LISTING.title);
    await expect(page.getByTestId('listing-price-input')).toHaveValue('5000000');
    await expect(page.getByTestId('listing-area-input')).toHaveValue('32');
    await expect(page.getByTestId('listing-room-type-select')).toHaveValue('3');
    await expect(page.getByTestId('listing-description-input')).toHaveValue(
      REJECTED_LISTING.description
    );
    await expect(page.getByTestId('listing-address-input')).toHaveValue(REJECTED_LISTING.address);
    await expect(page.getByTestId('listing-district-input')).toHaveValue(REJECTED_LISTING.district);
    await expect(page.getByTestId('listing-lat-input')).toHaveValue('10.796120');
    await expect(page.getByTestId('listing-lng-input')).toHaveValue('106.705890');
    await expect(page.getByTestId('amenity-checkbox-1')).toBeChecked();
    await expect(page.getByTestId('amenity-checkbox-2')).toBeChecked();
    await expect(page.getByTestId('amenity-checkbox-3')).not.toBeChecked();
    await expect(page.getByTestId('image-url-input-0')).toHaveValue(
      'https://example.com/photos/studio-thumb.jpg'
    );
    await expect(page.getByTestId('image-url-input-1')).toHaveValue(
      'https://example.com/photos/studio-bath.jpg'
    );

    // Modify fields and submit
    await page.getByTestId('listing-price-input').fill('4800000');
    await page.getByTestId('listing-area-input').fill('33.5');
    await page
      .getByTestId('listing-description-input')
      .fill('Đã cập nhật giá thuê và hình ảnh rõ nét.');
    await page.getByTestId('amenity-checkbox-3').check();
    await page
      .getByTestId('image-url-input-0')
      .fill('https://example.com/photos/studio-updated.jpg');

    await page.getByTestId('submit-listing-button').click();

    await expect(page).toHaveURL(/\/landlord\/listings$/);
    await expect(page.getByTestId('listing-success-notice')).toContainText('Chờ duyệt (pending)');

    expect(capturedPatchHeaders.authorization).toBe('Bearer mock-landlord-token');
    expect(capturedPatchPayload).toEqual({
      title: 'Studio mini đầy đủ nội thất Bình Thạnh',
      description: 'Đã cập nhật giá thuê và hình ảnh rõ nét.',
      price: 4800000,
      areaM2: 33.5,
      address: '45/2 Điện Biên Phủ, Phường 15',
      district: 'Bình Thạnh',
      lat: 10.79612,
      lng: 106.70589,
      roomTypeId: 3,
      amenityIds: [1, 2, 3],
      imageUrls: [
        'https://example.com/photos/studio-updated.jpg',
        'https://example.com/photos/studio-bath.jpg',
      ],
    });

    // Ensure no forbidden response-only fields leak into .strict() PATCH body
    for (const forbiddenKey of [
      'id',
      'ownerId',
      'status',
      'rejectReason',
      'coverImageUrl',
      'images',
      'amenities',
      'roomType',
      'createdAt',
    ]) {
      expect(Object.hasOwn(capturedPatchPayload, forbiddenKey)).toBe(false);
    }
  });

  test('renders clear error message and back link when listing is not found (404)', async ({
    page,
  }) => {
    await setupLandlordSession(page);

    await page.route('**/api/v1/listings/mine/999', route =>
      route.fulfill({
        status: 404,
        json: {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Listing not found' },
        },
      })
    );

    await page.goto('/landlord/listings/999/edit');

    await expect(page.getByTestId('edit-load-error')).toBeVisible();
    await expect(page.getByTestId('edit-load-error')).toContainText('404');
    await expect(page.getByTestId('error-back-to-listings')).toHaveAttribute(
      'href',
      '/landlord/listings'
    );
  });
});
