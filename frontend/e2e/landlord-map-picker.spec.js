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

async function setupMapTestMocks(page) {
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
        data: { districts: ['Quận 10'], roomTypes: [], amenities: [] },
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

  await page.route('https://nominatim.openstreetmap.org/search**', route =>
    route.fulfill({
      json: [
        {
          place_id: 9001,
          lat: '10.7725834',
          lon: '106.6578062',
          display_name: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh',
          address: {
            house_number: '268',
            road: 'Lý Thường Kiệt',
            suburb: 'Phường 14',
            city_district: 'Quận 10',
          },
        },
      ],
    })
  );

  await page.route('https://nominatim.openstreetmap.org/reverse**', route =>
    route.fulfill({
      json: {
        place_id: 9002,
        display_name: '45/2 Điện Biên Phủ, Phường 15, Bình Thạnh, TP. Hồ Chí Minh',
        address: {
          house_number: '45/2',
          road: 'Điện Biên Phủ',
          suburb: 'Phường 15',
          city_district: 'Bình Thạnh',
        },
      },
    })
  );
}

test.describe('Landlord Map Location Picker (UC-14 / T013)', () => {
  test('opens modal, searches address, clicks map to reverse-geocode, and fills form coordinates & address', async ({
    page,
  }) => {
    await setupMapTestMocks(page);

    await page.goto('/landlord/listings/create');
    await page.getByTestId('open-map-picker-button').click();

    const modal = page.getByTestId('map-picker-modal');
    await expect(modal).toBeVisible();

    // 1. Search address and select suggestion
    await page.getByTestId('map-search-input').fill('268 Lý Thường Kiệt, Quận 10');
    await page.getByTestId('map-search-button').click();

    const firstSuggestion = page.getByTestId('map-search-result-item').first();
    await expect(firstSuggestion).toBeVisible();
    await firstSuggestion.click();

    await expect(page.getByTestId('map-lat')).toHaveText('10.772583');
    await expect(page.getByTestId('map-lng')).toHaveText('106.657806');
    await expect(page.getByTestId('map-address-input')).toHaveValue(
      '268 Lý Thường Kiệt, Phường 14'
    );
    await expect(page.getByTestId('map-district-input')).toHaveValue('Quận 10');

    // 2. Click on the Leaflet map canvas to move pin & trigger reverse geocoding
    const mapCanvas = page.getByTestId('map-canvas');
    const box = await mapCanvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.35);

    await expect(page.getByTestId('map-address-input')).toHaveValue(
      '45/2 Điện Biên Phủ, Phường 15'
    );
    await expect(page.getByTestId('map-district-input')).toHaveValue('Bình Thạnh');

    const latText = await page.getByTestId('map-lat').textContent();
    const lngText = await page.getByTestId('map-lng').textContent();
    expect(latText).toMatch(/^-?\d+\.\d{6,}$/);
    expect(lngText).toMatch(/^-?\d+\.\d{6,}$/);

    // 3. Confirm selection and verify parent form fields are populated
    await page.getByTestId('map-confirm-button').click();
    await expect(modal).toBeHidden();

    await expect(page.getByTestId('listing-lat-input')).toHaveValue(latText);
    await expect(page.getByTestId('listing-lng-input')).toHaveValue(lngText);
    await expect(page.getByTestId('listing-address-input')).toHaveValue(
      '45/2 Điện Biên Phủ, Phường 15'
    );
    await expect(page.getByTestId('listing-district-input')).toHaveValue('Bình Thạnh');
  });
});
