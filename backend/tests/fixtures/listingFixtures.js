const validLandlord = {
  id: '9007199254740993',
  fullName: 'Landlord User',
  email: 'landlord@gmail.com',
  role: 'landlord',
  isActive: true,
};

const otherLandlord = {
  id: '9007199254740994',
  fullName: 'Other Landlord',
  email: 'other.landlord@gmail.com',
  role: 'landlord',
  isActive: true,
};

const tenantUser = {
  id: '9007199254740995',
  fullName: 'Tenant User',
  email: 'tenant@gmail.com',
  role: 'tenant',
  isActive: true,
};

const validListingInput = {
  title: 'Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM',
  description: 'Phòng mới xây, đầy đủ tiện nghi, an ninh 24/7.',
  price: 3500000,
  areaM2: 25.5,
  address: '268 Lý Thường Kiệt, Phường 14',
  district: 'Quận 10',
  lat: 10.772583,
  lng: 106.657806,
  roomTypeId: 1,
  amenityIds: [1, 2, 3],
  imageUrls: [
    'https://example.com/photos/room-main.jpg',
    'https://example.com/photos/room-bathroom.jpg',
  ],
};

function createSyntheticListingRow(overrides = {}) {
  return {
    id: '101',
    owner_id: validLandlord.id,
    reviewed_by: null,
    title: validListingInput.title,
    description: validListingInput.description,
    price: validListingInput.price,
    area_m2: validListingInput.areaM2,
    address: validListingInput.address,
    district: validListingInput.district,
    lat: validListingInput.lat,
    lng: validListingInput.lng,
    room_type_id: 1,
    status: 'pending',
    reject_reason: null,
    reviewed_at: null,
    created_at: new Date('2026-11-20T08:30:00.000Z'),
    ...overrides,
  };
}

module.exports = {
  validLandlord,
  otherLandlord,
  tenantUser,
  validListingInput,
  createSyntheticListingRow,
};
