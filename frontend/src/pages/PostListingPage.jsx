import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PortalLayout } from '../components/AppLayout';
import Icon from '../components/Icon';
import ListingForm from '../components/ListingForm';
import { createListing } from '../api/listingManagementApi';

export default function PostListingPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleCreate = async payload => {
    setSubmitting(true);
    setApiError('');

    try {
      await createListing(payload);
      navigate('/landlord/listings', {
        replace: true,
        state: {
          notice: 'Tin đăng đã được gửi thành công và đang ở trạng thái Chờ duyệt (pending).',
        },
      });
    } catch (error) {
      setApiError(error?.message || 'Không thể đăng tin lúc này. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout kind="landlord" sectionTitle="Đăng tin mới">
      <main className="portal-content" aria-label="Đăng tin mới">
        <div className="portal-page-heading">
          <div>
            <p className="eyebrow">KHÔNG GIAN CHỦ TRỌ</p>
            <h1>Đăng tin phòng trọ mới</h1>
            <p>
              Điền đầy đủ thông tin, chọn vị trí chính xác trên bản đồ và gửi tin để quản trị viên duyệt.
            </p>
          </div>
          <Link to="/landlord/listings" className="secondary-link-button">
            <Icon name="building" size={18} />
            Tin của tôi
          </Link>
        </div>

        <section className="content-card">
          <div className="card-heading">
            <div>
              <h2>Thông tin tin đăng mới</h2>
              <p>Tin sau khi tạo sẽ ở trạng thái Chờ duyệt (pending) trước khi hiển thị công khai.</p>
            </div>
            <span className="role-badge landlord">Chủ trọ</span>
          </div>

          <ListingForm
            submitLabel="Đăng tin mới"
            submittingLabel="Đang gửi tin..."
            submitting={submitting}
            apiError={apiError}
            onSubmit={handleCreate}
            formTestId="post-listing-form"
          />
        </section>
      </main>
    </PortalLayout>
  );
}
