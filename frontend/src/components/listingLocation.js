import provinces from '../../../shared/vietnam-administrative-units.json';

const provinceByCode = new Map(provinces.map(province => [province.code, province]));

export function listingLocation(listing) {
  const province = provinceByCode.get(listing.provinceCode);
  const ward = province?.wards.find(item => item.code === listing.wardCode);
  const locality = ward && province ? `${ward.name}, ${province.name}` : listing.district;
  return [listing.address, locality].filter(Boolean).join(', ');
}
