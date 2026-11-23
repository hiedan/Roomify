import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ListingLayout from '../components/ListingLayout';
import ListingPhoto from '../components/ListingPhoto';
import { listingLocation } from '../components/listingLocation';
import { getListingDetail } from '../api/listingApi';

const formatPrice = value => `${new Intl.NumberFormat('vi-VN').format(value)} đ/tháng`;

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListing(null);
    setError('');
    getListingDetail(id, controller.signal)
      .then(data => { if (!controller.signal.aborted) setListing(data); })
      .catch(requestError => {
        if (controller.signal.aborted) return;
        setError(requestError.status === 404
          ? 'Không tìm thấy phòng đã được duyệt này.'
          : 'Không thể tải thông tin phòng. Vui lòng thử lại.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);

  return <ListingLayout><main className="listing-detail" aria-label="Chi tiết phòng">
    <nav className="listing-breadcrumb" aria-label="Đường dẫn trang"><Link to="/">Trang chủ</Link><span>›</span><Link to="/search">Tìm phòng</Link><span>›</span><span>Chi tiết phòng</span></nav>
    {loading && <p className="search-state" role="status">Đang tải thông tin phòng...</p>}
    {!loading && error && <div className="search-state" role="alert"><p>{error}</p>
      {error.startsWith('Không thể') && <button className="secondary-button" type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>}
      <Link className="secondary-link-button" to="/search">Quay lại tìm phòng</Link>
    </div>}
    {!loading && listing && <>
      <div className="listing-gallery">
        {listing.images.length > 0 ? listing.images.slice(0, 3).map((image, index) => <ListingPhoto key={`${image.url}-${index}`} src={image.url} alt={`Ảnh phòng ${listing.title} ${index + 1}`} />)
          : <div className="listing-gallery-empty">Phòng chưa có ảnh</div>}
      </div>
      <div className="listing-detail-grid">
        <div className="listing-detail-main">
          <h1>{listing.title}</h1>
          <p className="listing-detail-price"><strong>{formatPrice(listing.price)}</strong><span>{listing.areaM2} m²</span></p>
          <p className="listing-detail-address">{listingLocation(listing)}</p>
          <p className="listing-detail-type">{listing.roomType?.name || 'Chưa phân loại'}</p>
          <section className="listing-detail-section"><h2>Mô tả</h2><p>{listing.description || 'Chưa có mô tả.'}</p></section>
          <section className="listing-detail-section"><h2>Tiện ích</h2>
            {listing.amenities.length > 0 ? <ul className="listing-detail-amenities">{listing.amenities.map(amenity => <li key={amenity.id}>{amenity.name}</li>)}</ul> : <p>Chưa có thông tin tiện ích.</p>}
          </section>
        </div>
        <aside className="listing-detail-aside"><h2>Thông tin phòng</h2><p>Giá thuê theo tháng</p><strong>{formatPrice(listing.price)}</strong><p>Diện tích: {listing.areaM2} m²</p><Link className="primary-button" to="/search">Xem các phòng khác</Link></aside>
      </div>
    </>}
  </main></ListingLayout>;
}
