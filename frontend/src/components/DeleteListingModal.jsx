import { useEffect } from 'react';
import Icon from './Icon';

export default function DeleteListingModal({
  isOpen,
  listing,
  isDeleting = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape' && !isDeleting) {
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !listing) return null;

  return (
    <div
      className="map-picker-backdrop"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel?.();
        }
      }}
    >
      <div
        className="confirmation-dialog delete-listing-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-listing-modal-title"
        data-testid="delete-listing-modal"
      >
        <button
          type="button"
          className="dialog-close"
          onClick={onCancel}
          disabled={isDeleting}
          aria-label="Đóng hộp thoại xóa"
          data-testid="delete-close-button"
        >
          <Icon name="close" size={16} />
        </button>

        <span className="dialog-icon is-danger" aria-hidden="true">
          <Icon name="info" size={22} />
        </span>

        <h2 id="delete-listing-modal-title">Xóa vĩnh viễn tin đăng?</h2>
        <p>
          Bạn sắp xóa tin{' '}
          <strong data-testid="delete-modal-listing-title">{listing.title}</strong>.
        </p>

        <div className="lock-warning" role="note">
          <strong>Cảnh báo:</strong> Hành động này là <strong>xóa vĩnh viễn</strong> và không thể
          hoàn tác. Toàn bộ hình ảnh, tiện ích, thông tin lân cận và lượt lưu yêu thích của người
          thuê liên quan đến tin này sẽ bị xóa khỏi hệ thống.
        </div>

        {error && (
          <div
            className="message error-message delete-modal-error"
            role="alert"
            data-testid="delete-modal-error"
          >
            {error}
          </div>
        )}

        <div className="dialog-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={isDeleting}
            data-testid="delete-cancel-button"
          >
            Hủy
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="delete-confirm-button"
          >
            {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}
