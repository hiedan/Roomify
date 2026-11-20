import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ListingLayout from '../components/ListingLayout';
import ListingPhoto from '../components/ListingPhoto';
import { getListingFilterOptions, searchListings } from '../api/listingApi';

const emptyCriteria = { keyword: '', district: '', roomType: '', maxPrice: '', minAreaM2: '', maxAreaM2: '', amenityIds: [] };
const formatPrice = value => `${new Intl.NumberFormat('vi-VN').format(value)} đ/tháng`;

function SearchResult({ listing }) {
  return <article className="search-result">
    <div className="search-result-photo">
      <ListingPhoto src={listing.coverImageUrl} alt={`Ảnh phòng ${listing.title}`} />
      <span className="search-result-badge">{listing.roomType?.name || 'Chưa phân loại'}</span>
    </div>
    <div className="search-result-content">
      <h3>{listing.title}</h3>
      <p className="search-result-facts"><strong>{formatPrice(listing.price)}</strong><span>· {listing.areaM2} m²</span></p>
      <p className="search-result-location">{listing.address}, {listing.district}</p>
      <Link className="primary-button search-result-link" to={`/listings/${listing.id}`}>Xem chi tiết</Link>
    </div>
  </article>;
}

export default function SearchPage() {
  const [criteria, setCriteria] = useState(emptyCriteria);
  const [appliedCriteria, setAppliedCriteria] = useState(emptyCriteria);
  const [options, setOptions] = useState({ districts: [], roomTypes: [], amenities: [] });
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [retryPage, setRetryPage] = useState(1);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState('');
  const request = useRef(null);

  const runSearch = useCallback(async (nextCriteria, page = 1) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setRetryPage(page);
    setListings([]);
    setPagination(null);
    setError('');
    setErrorKind('');
    if (nextCriteria.minAreaM2 !== '' && nextCriteria.maxAreaM2 !== '' &&
        Number(nextCriteria.minAreaM2) > Number(nextCriteria.maxAreaM2)) {
      setError('Diện tích tối thiểu không được lớn hơn diện tích tối đa.');
      setErrorKind('validation');
      setLoadingResults(false);
      return;
    }
    setAppliedCriteria(nextCriteria);
    setLoadingResults(true);
    try {
      const result = await searchListings({ ...nextCriteria, ...(page > 1 ? { page } : {}) }, controller.signal);
      if (!controller.signal.aborted) { setListings(result.listings); setPagination(result.pagination); }
    } catch (searchError) {
      if (!controller.signal.aborted) {
        setErrorKind(searchError.code === 'VALIDATION_ERROR' ? 'validation' : 'service');
        setError(searchError.code === 'VALIDATION_ERROR'
          ? 'Bộ lọc chưa hợp lệ. Vui lòng kiểm tra giá trị đã nhập rồi thử lại.'
          : 'Không thể tìm phòng lúc này. Vui lòng thử lại.');
      }
    } finally {
      if (!controller.signal.aborted) setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getListingFilterOptions(controller.signal)
      .then(data => setOptions(data))
      .catch(searchError => { if (searchError.name !== 'AbortError') setOptionsError('Không thể tải bộ lọc. Vui lòng thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setLoadingOptions(false); });
    runSearch(emptyCriteria);
    return () => { controller.abort(); request.current?.abort(); };
  }, [runSearch]);

  function updateCriteria(field, value) { setCriteria(current => ({ ...current, [field]: value })); }
  function toggleAmenity(id, checked) {
    setCriteria(current => ({ ...current, amenityIds: checked
      ? [...new Set([...current.amenityIds, id])]
      : current.amenityIds.filter(selected => selected !== id) }));
  }
  function clearFilters() { setCriteria(emptyCriteria); runSearch(emptyCriteria); }
  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  return <ListingLayout><main className="search-page" aria-label="Tìm kiếm phòng">
    <header className="search-heading"><h1>Tìm phòng phù hợp</h1><p>Lọc theo khu vực, giá và tiện ích để tìm phòng ưng ý.</p></header>
    <div className="search-layout">
      <form className="search-filters" aria-label="Bộ lọc tìm kiếm" onSubmit={event => { event.preventDefault(); runSearch(criteria); }}>
        <div className="search-filter-heading"><h2>Bộ lọc</h2></div>
        {loadingOptions && <p role="status">Đang tải bộ lọc...</p>}
        {optionsError && <p className="message error-message" role="alert">{optionsError} <button type="button" onClick={() => window.location.reload()}>Tải lại trang</button></p>}
        <label className="search-field"><span>Từ khóa</span><input type="search" value={criteria.keyword} onChange={event => updateCriteria('keyword', event.target.value)} placeholder="Tên đường, quận..." /></label>
        <label className="search-field"><span>Khu vực</span><select value={criteria.district} onChange={event => updateCriteria('district', event.target.value)}>
          <option value="">Tất cả khu vực</option>{options.districts.map(district => <option key={district} value={district}>{district}</option>)}
        </select></label>
        <label className="search-field"><span>Giá tối đa (VND/tháng)</span><input type="number" min="1" step="1" inputMode="numeric" value={criteria.maxPrice} onChange={event => updateCriteria('maxPrice', event.target.value)} /></label>
        <label className="search-field"><span>Loại phòng</span><select value={criteria.roomType} onChange={event => updateCriteria('roomType', event.target.value)}>
          <option value="">Tất cả loại phòng</option>{options.roomTypes.map(roomType => <option key={roomType.code} value={roomType.code}>{roomType.name}</option>)}
        </select></label>
        <div className="search-field-grid">
          <label className="search-field"><span>Diện tích tối thiểu (m²)</span><input type="number" min="0.01" step="any" inputMode="decimal" value={criteria.minAreaM2} onChange={event => updateCriteria('minAreaM2', event.target.value)} /></label>
          <label className="search-field"><span>Diện tích tối đa (m²)</span><input type="number" min="0.01" step="any" inputMode="decimal" value={criteria.maxAreaM2} onChange={event => updateCriteria('maxAreaM2', event.target.value)} /></label>
        </div>
        <fieldset className="search-amenities" disabled={loadingOptions || options.amenities.length === 0}>
          <legend>Tiện ích (phải có tất cả)</legend>
          {options.amenities.map(amenity => <label className="search-amenity" key={amenity.id}><input type="checkbox" checked={criteria.amenityIds.includes(amenity.id)} onChange={event => toggleAmenity(amenity.id, event.target.checked)} /><span>{amenity.name}</span></label>)}
          {!loadingOptions && options.amenities.length === 0 && <span>Chưa có tiện ích để lọc.</span>}
        </fieldset>
        <div className="search-filter-actions">
          <button className="primary-button search-submit" type="submit" disabled={loadingOptions || loadingResults}>Áp dụng bộ lọc</button>
          <button className="secondary-button" type="button" onClick={clearFilters} disabled={loadingResults}>Xóa bộ lọc</button>
        </div>
      </form>
      <section className="search-results" aria-label="Kết quả tìm kiếm" aria-live="polite">
        <div className="search-results-heading"><h2>{pagination ? `Tìm thấy ${pagination.total} phòng trọ phù hợp` : 'Kết quả tìm kiếm'}</h2></div>
        {loadingResults && <p className="search-state" role="status">Đang tìm phòng phù hợp...</p>}
        {!loadingResults && error && <div className="search-state search-state--error" role="alert"><p>{error}</p>{errorKind === 'service' && <button className="secondary-button" type="button" onClick={() => runSearch(appliedCriteria, retryPage)}>Thử lại</button>}</div>}
        {!loadingResults && !error && listings.length === 0 && <div className="search-state"><h3>Chưa tìm thấy phòng phù hợp</h3><p>Thử thay đổi hoặc bỏ bớt một vài bộ lọc.</p><button className="secondary-button" type="button" onClick={clearFilters}>Xóa bộ lọc</button></div>}
        {!loadingResults && !error && listings.length > 0 && <>
          <div className="search-result-list">{listings.map(listing => <SearchResult key={listing.id} listing={listing} />)}</div>
          {pageCount > 1 && <nav className="search-pagination" aria-label="Phân trang kết quả">
            <button type="button" disabled={pagination.page <= 1} onClick={() => runSearch(appliedCriteria, pagination.page - 1)}>Trước</button>
            <span>Trang {pagination.page} / {pageCount}</span>
            <button type="button" disabled={pagination.page >= pageCount} onClick={() => runSearch(appliedCriteria, pagination.page + 1)}>Tiếp theo</button>
          </nav>}
        </>}
      </section>
    </div>
  </main></ListingLayout>;
}
