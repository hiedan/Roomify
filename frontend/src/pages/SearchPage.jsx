import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Brand } from '../components/AuthLayout';
import { getListingFilterOptions, searchListings } from '../api/listingApi';

const emptyCriteria = {
  keyword: '',
  district: '',
  roomType: '',
  maxPrice: '',
  minAreaM2: '',
  maxAreaM2: '',
  amenityIds: [],
};

function formatPrice(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ/tháng`;
}

function SearchResult({ listing }) {
  return <article className="search-result">
    {listing.coverImageUrl
      ? <img className="search-result-image" src={listing.coverImageUrl} alt="" />
      : <div className="search-result-image search-result-image--empty" aria-hidden="true">Roomify</div>}
    <div className="search-result-content">
      <h2>{listing.title}</h2>
      <p className="search-result-location">{listing.address}, {listing.district}</p>
      <p className="search-result-facts">
        <strong>{formatPrice(listing.price)}</strong>
        <span>{listing.areaM2} m²</span>
        <span>{listing.roomType?.name || 'Chưa phân loại'}</span>
      </p>
      {listing.amenities.length > 0 && (
        <ul className="search-result-amenities" aria-label="Tiện ích">
          {listing.amenities.map(amenity => <li key={amenity.id}>{amenity.name}</li>)}
        </ul>
      )}
    </div>
  </article>;
}

export default function SearchPage() {
  const [criteria, setCriteria] = useState(emptyCriteria);
  const [options, setOptions] = useState({ districts: [], roomTypes: [], amenities: [] });
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getListingFilterOptions(controller.signal)
      .then(data => { if (active) setOptions(data); })
      .catch(() => { if (active) setError('Không thể tải danh sách bộ lọc. Vui lòng tải lại trang.'); })
      .finally(() => { if (active) setLoadingOptions(false); });
    searchListings(emptyCriteria, controller.signal)
      .then(result => {
        if (!active) return;
        setListings(result.listings);
        setPagination(result.pagination);
      })
      .catch(() => { if (active) setError('Không thể tải kết quả tìm kiếm. Vui lòng thử lại.'); })
      .finally(() => { if (active) setLoadingResults(false); });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => () => request.current?.abort(), []);

  function updateCriteria(field, value) {
    setCriteria(current => ({ ...current, [field]: value }));
  }

  function toggleAmenity(id, checked) {
    setCriteria(current => ({
      ...current,
      amenityIds: checked
        ? [...new Set([...current.amenityIds, id])]
        : current.amenityIds.filter(selected => selected !== id),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoadingResults(true);
    setError('');
    setListings([]);
    setPagination(null);
    try {
      const result = await searchListings(criteria, controller.signal);
      setListings(result.listings);
      setPagination(result.pagination);
    } catch (searchError) {
      if (searchError.name !== 'AbortError') {
        setError('Không thể tìm phòng lúc này. Vui lòng thử lại.');
      }
    } finally {
      if (!controller.signal.aborted) setLoadingResults(false);
    }
  }

  return <div className="app-layout">
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className="header-nav" aria-label="Điều hướng chính">
          <NavLink to="/search">Tìm phòng</NavLink>
          <Link to="/login">Đăng nhập</Link>
        </nav>
      </div>
    </header>
    <div className="page-container">
      <main className="search-page" aria-label="Tìm kiếm phòng">
      <header className="search-heading">
        <p className="search-eyebrow">ROOMIFY · KHÁM PHÁ KHÔNG GIAN SỐNG</p>
        <h1>Tìm phòng phù hợp</h1>
        <p>Lọc theo khu vực, ngân sách, diện tích và tiện ích bạn cần.</p>
      </header>
      <div className="search-layout">
        <form className="search-filters" aria-label="Bộ lọc tìm kiếm" onSubmit={submit}>
          <div className="search-filter-heading">
            <h2>Bộ lọc tìm kiếm</h2>
            {loadingOptions && <span role="status">Đang tải bộ lọc...</span>}
          </div>
          <label className="search-field">
            <span>Từ khóa</span>
            <input
              type="search"
              value={criteria.keyword}
              onChange={event => updateCriteria('keyword', event.target.value)}
              placeholder="Tên phòng, địa chỉ..."
            />
          </label>
          <label className="search-field">
            <span>Khu vực</span>
            <select value={criteria.district} onChange={event => updateCriteria('district', event.target.value)}>
              <option value="">Tất cả khu vực</option>
              {options.districts.map(district => <option key={district} value={district}>{district}</option>)}
            </select>
          </label>
          <label className="search-field">
            <span>Loại phòng</span>
            <select value={criteria.roomType} onChange={event => updateCriteria('roomType', event.target.value)}>
              <option value="">Tất cả loại phòng</option>
              {options.roomTypes.map(roomType => (
                <option key={roomType.code} value={roomType.code}>{roomType.name}</option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <span>Giá tối đa (VND/tháng)</span>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={criteria.maxPrice}
              onChange={event => updateCriteria('maxPrice', event.target.value)}
            />
          </label>
          <div className="search-field-grid">
            <label className="search-field">
              <span>Diện tích tối thiểu (m²)</span>
              <input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={criteria.minAreaM2}
                onChange={event => updateCriteria('minAreaM2', event.target.value)}
              />
            </label>
            <label className="search-field">
              <span>Diện tích tối đa (m²)</span>
              <input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={criteria.maxAreaM2}
                onChange={event => updateCriteria('maxAreaM2', event.target.value)}
              />
            </label>
          </div>
          <fieldset className="search-amenities" disabled={loadingOptions || options.amenities.length === 0}>
            <legend>Tiện ích (phải có tất cả)</legend>
            {options.amenities.map(amenity => (
              <label className="search-amenity" key={amenity.id}>
                <input
                  type="checkbox"
                  checked={criteria.amenityIds.includes(amenity.id)}
                  onChange={event => toggleAmenity(amenity.id, event.target.checked)}
                />
                <span>{amenity.name}</span>
              </label>
            ))}
            {!loadingOptions && options.amenities.length === 0 && <span>Chưa có tiện ích để lọc.</span>}
          </fieldset>
          <button className="primary-button search-submit" type="submit" disabled={loadingOptions || loadingResults}>
            {loadingResults ? 'Đang tìm...' : 'Áp dụng bộ lọc'}
          </button>
        </form>

        <section className="search-results" aria-label="Kết quả tìm kiếm" aria-live="polite">
          <div className="search-results-heading">
            <h2>Kết quả tìm kiếm</h2>
            {pagination && <span>{pagination.total} phòng phù hợp</span>}
          </div>
          {error && <p className="message error-message" role="alert">{error}</p>}
          {loadingResults && <p className="search-state" role="status">Đang tìm phòng phù hợp...</p>}
          {!loadingResults && !error && listings.length === 0 && (
            <div className="search-state">
              <h3>Chưa tìm thấy phòng phù hợp</h3>
              <p>Thử thay đổi hoặc bỏ bớt một vài bộ lọc.</p>
            </div>
          )}
          {!loadingResults && listings.length > 0 && (
            <div className="search-result-list">
              {listings.map(listing => <SearchResult key={listing.id} listing={listing} />)}
            </div>
          )}
        </section>
      </div>
      </main>
    </div>
  </div>;
}
