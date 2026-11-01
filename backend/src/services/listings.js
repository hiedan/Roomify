const listings = require('../database/listings');

async function listApproved(pagination) {
  const { total, items } = await listings.findApproved(pagination);
  return {
    items: items.map((item) => ({
      id: String(item.id), title: item.title, price: item.price, areaM2: item.area_m2,
      address: item.address, district: item.district, lat: item.lat, lng: item.lng,
    })),
    pagination: { ...pagination, total },
  };
}
module.exports = { listApproved };
