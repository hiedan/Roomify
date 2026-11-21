import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import MapLocationPicker from './MapLocationPicker';
import {
  DEFAULT_AMENITIES,
  DEFAULT_ROOM_TYPES,
  isValidHttpUrl,
  loadListingCatalog,
  validateAndBuildListingPayload,
} from '../utils/listingCatalog';

const EMPTY_FORM = {
  title: '',
  description: '',
  price: '',
  areaM2: '',
  roomTypeId: String(DEFAULT_ROOM_TYPES[0].id),
  address: '',
  district: '',
  lat: '',
  lng: '',
  amenityIds: [],
  imageUrls: [''],
};

function ImagePreview({ url, index }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const trimmed = url.trim();
  if (!trimmed || !isValidHttpUrl(trimmed)) {
    return (
      <div className="listing-url-preview listing-url-preview--empty">
        Chưa có xem trước
      </div>
    );
  }

  if (failed) {
    return (
      <div className="listing-url-preview listing-url-preview--error">
        Không tải được ảnh
      </div>
    );
  }

  return (
    <div className="listing-url-preview">
      <img
        src={trimmed}
        alt={`Xem trước ảnh ${index + 1}`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function ListingForm({
  initialValues,
  submitLabel = 'Đăng tin ngay',
  submittingLabel = 'Đang gửi tin...',
  submitting = false,
  apiError = '',
  cancelTo = '/landlord/listings',
  formTestId = 'post-listing-form',
  onSubmit,
}) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...initialValues,
    imageUrls:
      Array.isArray(initialValues?.imageUrls) && initialValues.imageUrls.length > 0
        ? initialValues.imageUrls
        : [''],
    amenityIds: Array.isArray(initialValues?.amenityIds) ? initialValues.amenityIds : [],
  }));
  const [catalog, setCatalog] = useState({
    roomTypes: DEFAULT_ROOM_TYPES,
    amenities: DEFAULT_AMENITIES,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadListingCatalog(controller.signal)
      .then(data => setCatalog(data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const updateField = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const toggleAmenity = amenityId => {
    setForm(prev => {
      const exists = prev.amenityIds.includes(amenityId);
      return {
        ...prev,
        amenityIds: exists
          ? prev.amenityIds.filter(id => id !== amenityId)
          : [...prev.amenityIds, amenityId],
      };
    });
  };

  const updateImageUrl = (index, value) => {
    setForm(prev => {
      const next = [...prev.imageUrls];
      next[index] = value;
      return { ...prev, imageUrls: next };
    });
    setFieldErrors(prev => {
      if (!prev.imageUrls) return prev;
      const next = { ...prev };
      delete next.imageUrls;
      return next;
    });
  };

  const addImageRow = () => {
    setForm(prev => {
      if (prev.imageUrls.length >= 10) return prev;
      return { ...prev, imageUrls: [...prev.imageUrls, ''] };
    });
  };

  const removeImageRow = index => {
    setForm(prev => {
      if (prev.imageUrls.length <= 1) return prev;
      return {
        ...prev,
        imageUrls: prev.imageUrls.filter((_, idx) => idx !== index),
      };
    });
  };

  const makeCoverImage = index => {
    if (index <= 0) return;
    setForm(prev => {
      const target = prev.imageUrls[index];
      const remaining = prev.imageUrls.filter((_, idx) => idx !== index);
      return { ...prev, imageUrls: [target, ...remaining] };
    });
  };

  const handleMapConfirm = ({ lat, lng, address, district }) => {
    setForm(prev => ({
      ...prev,
      lat: Number(lat).toFixed(6),
      lng: Number(lng).toFixed(6),
      address: address || prev.address,
      district: district || prev.district,
    }));
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next.lat;
      delete next.lng;
      if (address) delete next.address;
      if (district) delete next.district;
      return next;
    });
    setMapOpen(false);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (submitting) return;

    const result = validateAndBuildListingPayload(form);
    if (!result.valid) {
      setFieldErrors(result.errors);
      return;
    }

    setFieldErrors({});
    await onSubmit(result.payload);
  };

  return (
    <>
      <form
        className="listing-form"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={submitting}
        data-testid={formTestId}
      >
        {apiError && (
          <div className="message error-message" role="alert" data-testid="form-error-banner">
            {apiError}
          </div>
        )}

        <div className="listing-form-section">
          <h2>Thông tin cơ bản</h2>

          <div className="field-group">
            <label htmlFor="listing-title" className="field-label">
              Tiêu đề tin đăng <span className="required-mark">*</span>
            </label>
            <input
              id="listing-title"
              type="text"
              className="select-input"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="VD: Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM"
              maxLength={150}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.title)}
              data-testid="listing-title-input"
            />
            {fieldErrors.title && (
              <p className="field-error-text" role="alert">{fieldErrors.title}</p>
            )}
          </div>

          <div className="field-grid">
            <div className="field-group">
              <label htmlFor="listing-price" className="field-label">
                Giá thuê (VNĐ/tháng) <span className="required-mark">*</span>
              </label>
              <input
                id="listing-price"
                type="number"
                min="1"
                step="1"
                className="select-input"
                value={form.price}
                onChange={e => updateField('price', e.target.value)}
                placeholder="VD: 3500000"
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.price)}
                data-testid="listing-price-input"
              />
              {fieldErrors.price && (
                <p className="field-error-text" role="alert">{fieldErrors.price}</p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="listing-area" className="field-label">
                Diện tích (m²) <span className="required-mark">*</span>
              </label>
              <input
                id="listing-area"
                type="number"
                min="0.1"
                step="0.1"
                className="select-input"
                value={form.areaM2}
                onChange={e => updateField('areaM2', e.target.value)}
                placeholder="VD: 25.5"
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.areaM2)}
                data-testid="listing-area-input"
              />
              {fieldErrors.areaM2 && (
                <p className="field-error-text" role="alert">{fieldErrors.areaM2}</p>
              )}
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="listing-room-type" className="field-label">
              Loại phòng <span className="required-mark">*</span>
            </label>
            <select
              id="listing-room-type"
              className="select-input"
              value={form.roomTypeId}
              onChange={e => updateField('roomTypeId', e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.roomTypeId)}
              data-testid="listing-room-type-select"
            >
              {catalog.roomTypes.map(type => (
                <option key={type.id} value={String(type.id)}>
                  {type.name}
                </option>
              ))}
            </select>
            {fieldErrors.roomTypeId && (
              <p className="field-error-text" role="alert">{fieldErrors.roomTypeId}</p>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="listing-description" className="field-label">
              Mô tả chi tiết <span className="optional-label">(tối đa 2000 ký tự)</span>
            </label>
            <textarea
              id="listing-description"
              className="select-input"
              rows={4}
              maxLength={2000}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Mô tả nội thất, giờ giấc, chi phí điện nước, an ninh..."
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.description)}
              data-testid="listing-description-input"
            />
            {fieldErrors.description && (
              <p className="field-error-text" role="alert">{fieldErrors.description}</p>
            )}
          </div>
        </div>

        <div className="listing-form-section">
          <div className="listing-section-header">
            <div>
              <h2>Vị trí &amp; Bản đồ</h2>
              <p>Chọn vị trí trên bản đồ để tự động điền tọa độ chính xác và gợi ý địa chỉ.</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setMapOpen(true)}
              disabled={submitting}
              data-testid="open-map-picker-button"
            >
              <Icon name="building" size={16} />
              Chọn vị trí trên bản đồ
            </button>
          </div>

          <div className="field-grid">
            <div className="field-group">
              <label htmlFor="listing-address" className="field-label">
                Địa chỉ <span className="required-mark">*</span>
              </label>
              <input
                id="listing-address"
                type="text"
                className="select-input"
                value={form.address}
                onChange={e => updateField('address', e.target.value)}
                placeholder="VD: 268 Lý Thường Kiệt, Phường 14"
                maxLength={255}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.address)}
                data-testid="listing-address-input"
              />
              {fieldErrors.address && (
                <p className="field-error-text" role="alert">{fieldErrors.address}</p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="listing-district" className="field-label">
                Quận / Huyện <span className="required-mark">*</span>
              </label>
              <input
                id="listing-district"
                type="text"
                className="select-input"
                value={form.district}
                onChange={e => updateField('district', e.target.value)}
                placeholder="VD: Quận 10"
                maxLength={100}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.district)}
                data-testid="listing-district-input"
              />
              {fieldErrors.district && (
                <p className="field-error-text" role="alert">{fieldErrors.district}</p>
              )}
            </div>
          </div>

          <div className="field-grid">
            <div className="field-group">
              <label htmlFor="listing-lat" className="field-label">
                Vĩ độ (lat) <span className="required-mark">*</span>
              </label>
              <input
                id="listing-lat"
                type="number"
                step="any"
                className="select-input"
                value={form.lat}
                onChange={e => updateField('lat', e.target.value)}
                placeholder="VD: 10.772583"
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.lat)}
                data-testid="listing-lat-input"
              />
              {fieldErrors.lat && (
                <p className="field-error-text" role="alert">{fieldErrors.lat}</p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="listing-lng" className="field-label">
                Kinh độ (lng) <span className="required-mark">*</span>
              </label>
              <input
                id="listing-lng"
                type="number"
                step="any"
                className="select-input"
                value={form.lng}
                onChange={e => updateField('lng', e.target.value)}
                placeholder="VD: 106.657806"
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.lng)}
                data-testid="listing-lng-input"
              />
              {fieldErrors.lng && (
                <p className="field-error-text" role="alert">{fieldErrors.lng}</p>
              )}
            </div>
          </div>
        </div>

        <div className="listing-form-section">
          <h2>Tiện ích phòng trọ</h2>
          <div className="amenities-checkbox-grid">
            {catalog.amenities.map(amenity => (
              <label key={amenity.id} className="amenity-checkbox-card">
                <input
                  type="checkbox"
                  checked={form.amenityIds.includes(amenity.id)}
                  onChange={() => toggleAmenity(amenity.id)}
                  disabled={submitting}
                  data-testid={`amenity-checkbox-${amenity.id}`}
                />
                <span>{amenity.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="listing-form-section">
          <div className="listing-section-header">
            <div>
              <h2>Hình ảnh phòng trọ (1–10 URL) <span className="required-mark">*</span></h2>
              <p>Ảnh đầu tiên (vị trí #1) tự động làm <strong>Ảnh bìa (Cover)</strong>.</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={addImageRow}
              disabled={submitting || form.imageUrls.length >= 10}
              data-testid="add-image-url-button"
            >
              + Thêm URL ảnh ({form.imageUrls.length}/10)
            </button>
          </div>

          {fieldErrors.imageUrls && (
            <p className="field-error-text" role="alert">{fieldErrors.imageUrls}</p>
          )}

          <div className="image-url-list">
            {form.imageUrls.map((url, index) => (
              <div key={index} className="image-url-row">
                <ImagePreview url={url} index={index} />

                <div className="image-url-fields">
                  <div className="image-url-label-row">
                    <label htmlFor={`listing-image-${index}`} className="field-label">
                      URL ảnh #{index + 1}
                    </label>
                    {index === 0 && (
                      <span className="cover-badge" data-testid="cover-badge">
                        Ảnh bìa (Cover)
                      </span>
                    )}
                  </div>
                  <input
                    id={`listing-image-${index}`}
                    type="url"
                    className="select-input"
                    value={url}
                    onChange={e => updateImageUrl(index, e.target.value)}
                    placeholder="https://example.com/photos/room.jpg"
                    disabled={submitting}
                    data-testid={`image-url-input-${index}`}
                  />
                  <div className="image-url-actions">
                    {index > 0 && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => makeCoverImage(index)}
                        disabled={submitting}
                        data-testid={`set-cover-button-${index}`}
                      >
                        Đặt làm ảnh bìa
                      </button>
                    )}
                    <button
                      type="button"
                      className="danger-text-button"
                      onClick={() => removeImageRow(index)}
                      disabled={submitting || form.imageUrls.length <= 1}
                      data-testid={`remove-image-url-button-${index}`}
                    >
                      Xóa dòng
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions listing-form-actions">
          <Link to={cancelTo} className="secondary-link-button">
            Hủy
          </Link>
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
            data-testid="submit-listing-button"
          >
            {submitting ? submittingLabel : submitLabel}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </form>

      <MapLocationPicker
        isOpen={mapOpen}
        initialLat={form.lat !== '' ? Number(form.lat) : undefined}
        initialLng={form.lng !== '' ? Number(form.lng) : undefined}
        initialAddress={form.address}
        initialDistrict={form.district}
        onConfirm={handleMapConfirm}
        onClose={() => setMapOpen(false)}
      />
    </>
  );
}
