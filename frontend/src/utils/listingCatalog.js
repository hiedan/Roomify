import { getListingFilterOptions } from '../api/listingApi';

export const DEFAULT_ROOM_TYPES = [
  { id: 1, code: 'private_room', name: 'Phòng trọ riêng' },
  { id: 2, code: 'shared_room', name: 'Phòng ở ghép' },
  { id: 3, code: 'studio', name: 'Studio / căn hộ mini' },
  { id: 4, code: 'apartment', name: 'Căn hộ chung cư' },
];

export const DEFAULT_AMENITIES = [
  { id: 1, name: 'Máy lạnh', icon: 'ac' },
  { id: 2, name: 'Wifi', icon: 'wifi' },
  { id: 3, name: 'Chỗ để xe', icon: 'parking' },
  { id: 4, name: 'Gác lửng', icon: 'loft' },
  { id: 5, name: 'Nhà vệ sinh riêng', icon: 'toilet' },
  { id: 6, name: 'Máy giặt', icon: 'washer' },
  { id: 7, name: 'Nóng lạnh', icon: 'heater' },
  { id: 8, name: 'Giờ giấc tự do', icon: 'clock' },
];

const ROOM_TYPE_ID_BY_CODE = new Map(DEFAULT_ROOM_TYPES.map(rt => [rt.code, rt.id]));

export async function loadListingCatalog(signal) {
  try {
    const data = await getListingFilterOptions(signal);

    const apiRoomTypes = Array.isArray(data?.roomTypes) ? data.roomTypes : [];
    const mergedRoomTypes = DEFAULT_ROOM_TYPES.map(fallback => {
      const matched = apiRoomTypes.find(item => item.code === fallback.code);
      if (!matched) return fallback;
      const numericId = Number(matched.id);
      return {
        id: Number.isInteger(numericId) && numericId > 0 ? numericId : (ROOM_TYPE_ID_BY_CODE.get(matched.code) ?? fallback.id),
        code: matched.code,
        name: matched.name || fallback.name,
      };
    });

    const amenityMap = new Map(DEFAULT_AMENITIES.map(item => [item.id, item]));
    if (Array.isArray(data?.amenities)) {
      for (const item of data.amenities) {
        const id = Number(item?.id);
        if (Number.isInteger(id) && id > 0 && item?.name) {
          const existing = amenityMap.get(id);
          amenityMap.set(id, {
            id,
            name: item.name,
            icon: item.icon || existing?.icon || 'info',
          });
        }
      }
    }

    return {
      roomTypes: mergedRoomTypes,
      amenities: Array.from(amenityMap.values()).sort((a, b) => a.id - b.id),
    };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return {
      roomTypes: DEFAULT_ROOM_TYPES,
      amenities: DEFAULT_AMENITIES,
    };
  }
}

export function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateAndBuildListingPayload(form) {
  const errors = {};

  const title = String(form.title ?? '').trim();
  if (title.length < 5 || title.length > 150) {
    errors.title = 'Tiêu đề phải từ 5 đến 150 ký tự.';
  }

  const description = String(form.description ?? '').trim();
  if (description.length > 2000) {
    errors.description = 'Mô tả tối đa 2000 ký tự.';
  }

  const priceRaw = String(form.price ?? '').trim();
  const price = Number(priceRaw);
  if (!priceRaw || !Number.isInteger(price) || price <= 0) {
    errors.price = 'Giá thuê phải là số nguyên dương (VNĐ/tháng).';
  }

  const areaRaw = String(form.areaM2 ?? '').trim();
  const areaM2 = Number(areaRaw);
  if (!areaRaw || !Number.isFinite(areaM2) || areaM2 <= 0) {
    errors.areaM2 = 'Diện tích phải là số lớn hơn 0 (m²).';
  }

  const roomTypeId = Number(form.roomTypeId);
  if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
    errors.roomTypeId = 'Vui lòng chọn loại phòng hợp lệ.';
  }

  const address = String(form.address ?? '').trim();
  if (address.length < 5 || address.length > 255) {
    errors.address = 'Địa chỉ phải từ 5 đến 255 ký tự.';
  }

  const district = String(form.district ?? '').trim();
  if (district.length < 2 || district.length > 100) {
    errors.district = 'Quận / Huyện phải từ 2 đến 100 ký tự.';
  }

  const latRaw = String(form.lat ?? '').trim();
  const lngRaw = String(form.lng ?? '').trim();
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!latRaw || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.lat = 'Vĩ độ (lat) phải nằm trong khoảng [-90, 90].';
  }
  if (!lngRaw || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.lng = 'Kinh độ (lng) phải nằm trong khoảng [-180, 180].';
  }

  const rawUrls = Array.isArray(form.imageUrls) ? form.imageUrls : [];
  const trimmedUrls = rawUrls.map(url => String(url ?? '').trim()).filter(Boolean);

  if (trimmedUrls.length < 1) {
    errors.imageUrls = 'Cần ít nhất 1 URL hình ảnh hợp lệ (ảnh đầu tiên là ảnh bìa).';
  } else if (trimmedUrls.length > 10) {
    errors.imageUrls = 'Tối đa chỉ được thêm 10 hình ảnh.';
  } else {
    const invalidIndex = trimmedUrls.findIndex(url => !isValidHttpUrl(url));
    if (invalidIndex !== -1) {
      errors.imageUrls = `URL ảnh thứ ${invalidIndex + 1} không hợp lệ (cần bắt đầu bằng http:// hoặc https://).`;
    }
  }

  const amenityIds = Array.from(
    new Set(
      (Array.isArray(form.amenityIds) ? form.amenityIds : [])
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0)
    )
  );

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, payload: null };
  }

  return {
    valid: true,
    errors: {},
    payload: {
      title,
      description: description || null,
      price,
      areaM2,
      address,
      district,
      lat,
      lng,
      roomTypeId,
      amenityIds,
      imageUrls: trimmedUrls,
    },
  };
}
