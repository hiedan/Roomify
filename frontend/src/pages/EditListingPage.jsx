import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PortalLayout } from '../components/AppLayout';
import Icon from '../components/Icon';
import ListingForm from '../components/ListingForm';
import { getMyListingById, updateListing } from '../api/listingManagementApi';

const ALLOWED_PATCH_FIELDS = [
  'title',
  'description',
  'price',
  'areaM2',
  'address',
  'district',
  'lat',
  'lng',
  'roomTypeId',
  'amenityIds',
  'imageUrls',
];

function mapListingToFormValues(listing) {
  const sortedImages = Array.isArray(listing?.images)
    ? [...listing.images]
        .sort((a, b) => (Number(a?.sortOrder) || 0) - (Number(b?.sortOrder) || 0))
        .map(img => img?.url)
        .filter(Boolean)
    : [];

  if (sortedImages.length === 0 && listing?.coverImageUrl) {
    sortedImages.push(listing.coverImageUrl);
  }

  const amenityIds = Array.isArray(listing?.amenities)
    ? listing.amenities.map(item => Number(item?.id)).filter(id => Number.isInteger(id) && id > 0)
    : [];

  return {
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    price: listing?.price !== undefined && listing?.price !== null ? String(listing.price) : '',
    areaM2: listing?.areaM2 !== undefined && listing?.areaM2 !== null ? String(listing.areaM2) : '',
    roomTypeId: String(listing?.roomType?.id ?? listing?.roomTypeId ?? 1),
    address: listing?.address ?? '',
    district: listing?.district ?? '',
    lat:
      listing?.lat !== undefined && listing?.lat !== null && Number.isFinite(Number(listing.lat))
        ? Number(listing.lat).toFixed(6)
        : '',
    lng:
      listing?.lng !== undefined && listing?.lng !== null && Number.isFinite(Number(listing.lng))
        ? Number(listing.lng).toFixed(6)
        : '',
    amenityIds,
    imageUrls: sortedImages.length > 0 ? sortedImages : [''],
  };
}

function buildStrictPatchPayload(payload) {
  const clean = {};
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (Object.hasOwn(payload, key)) {
      clean[key] = payload[key];
    }
  }
  return clean;
}

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setListing(null);

    getMyListingById(id, { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) {
          setListing(data);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError' || controller.signal.aborted) return;
        const status = err?.status || 0;
        const code = err?.code || '';
        let message = err?.message || 'Không thể tải thông tin tin đăng.';
        if (status === 403 || code === 'FORBIDDEN') {
          message = 'Bạn không có quyền truy cập hoặc chỉnh sửa tin đăng này (403 Forbidden).';
        } else if (status === 404 || code === 'NOT_FOUND') {
          message = 'Không tìm thấy tin đăng yêu cầu. Tin có thể đã bị xóa (404 Not Found).';
        }
        setLoadError({ status, code, message });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, reloadTick]);

  const initialFormValues = useMemo(
    () => (listing ? mapListingToFormValues(listing) : null),
    [listing]
  );

  const handleRetry = useCallback(() => {
    setReloadTick(prev => prev + 1);
  }, []);

  const handleUpdate = async payload => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const strictPayload = buildStrictPatchPayload(payload);
      await updateListing(id, strictPayload);
      navigate('/landlord/listings', {
        replace: true,
        state: {
          notice:
            'Đã cập nhật tin đăng thành công. Tin đã được chuyển về trạng thái Chờ duyệt (pending) để kiểm duyệt lại.',
        },
      });
    } catch (err) {
      setSubmitError(err?.message || 'Không thể cập nhật tin đăng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout kind="landlord" sectionTitle={`Chỉnh sửa tin #${id}`}>
      <main className="portal-content" aria-label="Chỉnh sửa tin đăng">
        <div className="portal-page-heading">
          <div>
            <p className="eyebrow">KHÔNG GIAN CHỦ TRỌ</p>
            <h1>Chỉnh sửa tin đăng #{id}</h1>
            <p>Cập nhật thông tin chi tiết, hình ảnh hoặc vị trí phòng trọ của bạn.</p>
          </div>
          <Link
            to="/landlord/listings"
            className="secondary-link-button"
            data-testid="back-to-listings-link"
          >
            <Icon name="building" size={18} />
            Quay lại Tin của tôi
          </Link>
        </div>

        {loading ? (
          <section className="content-card edit-listing-state" role="status" data-testid="edit-listing-loading">
            <p>Đang tải thông tin tin đăng...</p>
          </section>
        ) : loadError ? (
          <section className="content-card edit-listing-state" role="alert" data-testid="edit-load-error">
            <div className="message error-message">{loadError.message}</div>
            <div className="edit-error-actions">
              <Link to="/landlord/listings" className="primary-button" data-testid="error-back-to-listings">
                Quay lại Tin của tôi
              </Link>
              {loadError.status !== 403 && loadError.status !== 404 && (
                <button type="button" className="secondary-button" onClick={handleRetry}>
                  <Icon name="refresh" size={16} />
                  Thử lại
                </button>
              )}
            </div>
          </section>
        ) : (
          <>
            <div
              className="remoderation-notice-banner"
              role="note"
              data-testid="remoderation-notice-banner"
            >
              <Icon name="info" size={20} />
              <div>
                <strong>Lưu ý kiểm duyệt lại (Re-moderation)</strong>
                <p>
                  Khi bạn lưu thay đổi, tin đăng sẽ tự động chuyển về trạng thái{' '}
                  <strong>Chờ duyệt (pending)</strong>, xóa lý do từ chối cũ (nếu có) và tạm ẩn khỏi
                  tìm kiếm công khai cho đến khi quản trị viên duyệt lại.
                </p>
              </div>
            </div>

            {listing?.status === 'rejected' && listing?.rejectReason && (
              <div
                className="my-listing-reject-banner edit-reject-banner"
                role="note"
                data-testid="edit-reject-reason-banner"
              >
                <strong>Lý do tin đăng bị từ chối trước đó:</strong>
                <p>{listing.rejectReason}</p>
              </div>
            )}

            <section className="content-card">
              <div className="card-heading">
                <div>
                  <h2>Thông tin tin đăng</h2>
                  <p>
                    Trạng thái hiện tại:{' '}
                    <strong>
                      {listing?.status === 'approved'
                        ? 'Đã duyệt'
                        : listing?.status === 'rejected'
                          ? 'Bị từ chối'
                          : 'Chờ duyệt'}
                    </strong>
                  </p>
                </div>
                <span className="role-badge landlord">Chủ trọ</span>
              </div>

              <ListingForm
                key={listing.id}
                initialValues={initialFormValues}
                submitLabel="Lưu thay đổi"
                submittingLabel="Đang lưu thay đổi..."
                submitting={submitting}
                apiError={submitError}
                cancelTo="/landlord/listings"
                formTestId="edit-listing-form"
                onSubmit={handleUpdate}
              />
            </section>
          </>
        )}
      </main>
    </PortalLayout>
  );
}
