import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PortalLayout } from '../components/AppLayout';
import Icon from '../components/Icon';
import ListingPhoto from '../components/ListingPhoto';
import DeleteListingModal from '../components/DeleteListingModal';
import { deleteListing, getMyListings } from '../api/listingManagementApi';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả', summaryKey: 'total' },
  { key: 'pending', label: 'Chờ duyệt', summaryKey: 'pending' },
  { key: 'approved', label: 'Đã duyệt', summaryKey: 'approved' },
  { key: 'rejected', label: 'Bị từ chối', summaryKey: 'rejected' },
];

const STATUS_LABELS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
};

const EMPTY_SUMMARY = { total: 0, pending: 0, approved: 0, rejected: 0 };

function formatPrice(value) {
  if (!Number.isFinite(Number(value))) return 'Liên hệ';
  return `${new Intl.NumberFormat('vi-VN').format(Number(value))} đ/tháng`;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function resolveCoverUrl(listing) {
  if (listing?.coverImageUrl) return listing.coverImageUrl;
  if (Array.isArray(listing?.images) && listing.images.length > 0) {
    const cover = listing.images.find(img => img.isCover);
    return cover?.url || listing.images[0]?.url || '';
  }
  return '';
}

export default function MyListingsPage() {
  const location = useLocation();
  const [notice, setNotice] = useState(() => location.state?.notice || '');
  const [activeStatus, setActiveStatus] = useState('all');
  const [listings, setListings] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
    }
  }, [location.state]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    getMyListings(activeStatus, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        setListings(Array.isArray(data?.listings) ? data.listings : []);
        setSummary({
          total: Number(data?.summary?.total) || 0,
          pending: Number(data?.summary?.pending) || 0,
          approved: Number(data?.summary?.approved) || 0,
          rejected: Number(data?.summary?.rejected) || 0,
        });
      })
      .catch(err => {
        if (err.name === 'AbortError' || controller.signal.aborted) return;
        setError(err?.message || 'Không thể tải danh sách tin đăng. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeStatus, reloadTick]);

  const handleRetry = useCallback(() => {
    setReloadTick(prev => prev + 1);
  }, []);

  const handleOpenDelete = useCallback(listing => {
    setDeleteError('');
    setListingToDelete(listing);
  }, []);

  const handleCloseDelete = useCallback(() => {
    if (isDeleting) return;
    setDeleteError('');
    setListingToDelete(null);
  }, [isDeleting]);

  const handleConfirmDelete = useCallback(async () => {
    if (!listingToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      await deleteListing(listingToDelete.id);
      const deleted = listingToDelete;
      setListings(prev => prev.filter(item => item.id !== deleted.id));
      setSummary(prev => ({
        total: Math.max(0, prev.total - 1),
        pending: deleted.status === 'pending' ? Math.max(0, prev.pending - 1) : prev.pending,
        approved: deleted.status === 'approved' ? Math.max(0, prev.approved - 1) : prev.approved,
        rejected: deleted.status === 'rejected' ? Math.max(0, prev.rejected - 1) : prev.rejected,
      }));
      setListingToDelete(null);
      setNotice(`Đã xóa vĩnh viễn tin "${deleted.title}".`);
    } catch (err) {
      setDeleteError(err?.message || 'Không thể xóa tin đăng. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  }, [listingToDelete, isDeleting]);

  return (
    <PortalLayout kind="landlord" sectionTitle="Tin của tôi">
      <main className="portal-content" aria-label="Tin đăng của tôi">
        <div className="portal-page-heading">
          <div>
            <p className="eyebrow">KHÔNG GIAN CHỦ TRỌ</p>
            <h1>Tin đăng của tôi</h1>
            <p>Theo dõi trạng thái kiểm duyệt, chỉnh sửa thông tin và quản lý danh sách phòng trọ.</p>
          </div>
          <Link
            to="/landlord/listings/create"
            className="primary-button"
            data-testid="create-listing-cta"
          >
            <Icon name="home" size={18} />
            Đăng tin mới
          </Link>
        </div>

        {notice && (
          <div className="message my-listings-notice" role="status" data-testid="listing-success-notice">
            <span>{notice}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => setNotice('')}
              aria-label="Đóng thông báo"
            >
              Đóng
            </button>
          </div>
        )}

        <section className="content-card my-listings-card" aria-label="Danh sách tin đăng của bạn">
          <div className="my-listings-tabs" role="tablist" aria-label="Lọc theo trạng thái duyệt">
            {STATUS_TABS.map(tab => {
              const count = summary[tab.summaryKey] ?? 0;
              const isActive = activeStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`status-tab-btn${isActive ? ' is-active' : ''}`}
                  onClick={() => setActiveStatus(tab.key)}
                  data-testid={`status-tab-${tab.key}`}
                >
                  <span>{tab.label}</span>
                  <span
                    className="status-tab-count"
                    data-testid={`summary-count-${tab.key}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="my-listings-skeleton-list" role="status" data-testid="my-listings-loading">
              <p className="my-listings-loading-label">Đang tải danh sách tin đăng...</p>
              {[1, 2, 3].map(item => (
                <div key={item} className="my-listing-skeleton" aria-hidden="true">
                  <div className="skeleton-thumb" />
                  <div className="skeleton-lines">
                    <div className="skeleton-line skeleton-line--lg" />
                    <div className="skeleton-line skeleton-line--md" />
                    <div className="skeleton-line skeleton-line--sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="my-listings-error-box" role="alert" data-testid="my-listings-error">
              <div className="message error-message">{error}</div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleRetry}
                data-testid="retry-listings-button"
              >
                <Icon name="refresh" size={16} />
                Thử lại
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="empty-state my-listings-empty" data-testid="my-listings-empty">
              <span className="empty-state-icon">
                <Icon name="building" size={30} />
              </span>
              <h3>
                {activeStatus === 'all'
                  ? 'Bạn chưa có tin đăng nào'
                  : `Không có tin nào ở trạng thái "${STATUS_LABELS[activeStatus]}"`}
              </h3>
              <p>
                {activeStatus === 'all'
                  ? 'Bắt đầu đăng tin phòng trọ đầu tiên để tiếp cận người thuê trên Roomify.'
                  : 'Bạn có thể chuyển sang tab Tất cả để xem toàn bộ tin hoặc đăng tin mới.'}
              </p>
              <div className="my-listings-empty-actions">
                <Link
                  to="/landlord/listings/create"
                  className="primary-button"
                  data-testid="empty-create-listing-cta"
                >
                  <Icon name="home" size={17} />
                  Đăng tin đầu tiên
                </Link>
                {activeStatus !== 'all' && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveStatus('all')}
                  >
                    Xem tất cả tin
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="my-listings-list" data-testid="my-listings-list">
              {listings.map(listing => {
                const statusClass =
                  listing.status === 'approved'
                    ? 'application-badge--approved'
                    : listing.status === 'rejected'
                      ? 'application-badge--rejected'
                      : 'application-badge--pending';

                return (
                  <article
                    key={listing.id}
                    className="my-listing-card"
                    data-testid={`my-listing-card-${listing.id}`}
                    data-listing-id={listing.id}
                  >
                    <div className="my-listing-thumb">
                      <ListingPhoto
                        src={resolveCoverUrl(listing)}
                        alt={`Ảnh bìa ${listing.title}`}
                      />
                    </div>

                    <div className="my-listing-body">
                      <div className="my-listing-header">
                        <div className="my-listing-title-wrap">
                          <h3>{listing.title}</h3>
                          <p className="my-listing-address">
                            {listing.address}
                            {listing.district ? `, ${listing.district}` : ''}
                          </p>
                        </div>
                        <span
                          className={`application-badge ${statusClass}`}
                          data-testid={`listing-status-badge-${listing.id}`}
                        >
                          {STATUS_LABELS[listing.status] || listing.status}
                        </span>
                      </div>

                      <div className="my-listing-meta">
                        <strong className="my-listing-price">{formatPrice(listing.price)}</strong>
                        <span>{listing.areaM2} m²</span>
                        <span>{listing.roomType?.name || 'Chưa phân loại'}</span>
                        <span>Đăng ngày: {formatDate(listing.createdAt)}</span>
                      </div>

                      {listing.status === 'rejected' && listing.rejectReason && (
                        <div
                          className="my-listing-reject-banner"
                          role="note"
                          data-testid={`reject-reason-banner-${listing.id}`}
                        >
                          <strong>Lý do từ chối từ quản trị viên:</strong>
                          <p>{listing.rejectReason}</p>
                        </div>
                      )}

                      <div className="my-listing-actions">
                        {listing.status === 'approved' && (
                          <Link
                            to={`/listings/${listing.id}`}
                            className="secondary-link-button"
                            data-testid={`view-public-listing-${listing.id}`}
                          >
                            Xem công khai
                          </Link>
                        )}
                        <Link
                          to={`/landlord/listings/${listing.id}/edit`}
                          className="secondary-link-button"
                          data-testid={`edit-listing-button-${listing.id}`}
                        >
                          Chỉnh sửa
                        </Link>
                        <button
                          type="button"
                          className="danger-text-button"
                          onClick={() => handleOpenDelete(listing)}
                          aria-pressed={listingToDelete?.id === listing.id}
                          data-testid={`delete-listing-button-${listing.id}`}
                        >
                          Xóa tin
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <DeleteListingModal
          isOpen={Boolean(listingToDelete)}
          listing={listingToDelete}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCloseDelete}
        />
      </main>
    </PortalLayout>
  );
}
