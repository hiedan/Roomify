import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import Icon from './Icon';

const DEFAULT_LAT = 10.772583;
const DEFAULT_LNG = 106.657806;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const defaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function roundCoord(value) {
  return Number(Number(value).toFixed(6));
}

function normalizeLat(value, fallback = DEFAULT_LAT) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.min(90, Math.max(-90, num));
  return roundCoord(clamped);
}

function normalizeLng(value, fallback = DEFAULT_LNG) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num >= -180 && num <= 180) return roundCoord(num);
  const wrapped = ((((num + 180) % 360) + 360) % 360) - 180;
  return roundCoord(wrapped === -180 && num > 0 ? 180 : wrapped);
}

function extractLocationFields(payload) {
  const addr = payload?.address || {};
  const streetLine = [addr.house_number, addr.road].filter(Boolean).join(' ').trim();
  const ward = addr.quarter || addr.neighbourhood || addr.suburb || addr.village || '';
  const district =
    addr.city_district ||
    addr.district ||
    addr.county ||
    addr.town ||
    addr.city ||
    '';

  let addressText = [streetLine, ward].filter(Boolean).join(', ').trim();
  if (!addressText && typeof payload?.display_name === 'string') {
    addressText = payload.display_name
      .split(',')
      .slice(0, 3)
      .map(part => part.trim())
      .filter(Boolean)
      .join(', ');
  }

  return {
    address: addressText.slice(0, 255),
    district: String(district).trim().slice(0, 100),
  };
}

export default function MapLocationPicker({
  isOpen,
  initialLat,
  initialLng,
  initialAddress = '',
  initialDistrict = '',
  onConfirm,
  onClose,
}) {
  const startLat = normalizeLat(initialLat, DEFAULT_LAT);
  const startLng = normalizeLng(initialLng, DEFAULT_LNG);

  const [coords, setCoords] = useState({ lat: startLat, lng: startLng });
  const [address, setAddress] = useState(initialAddress || '');
  const [district, setDistrict] = useState(initialDistrict || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [reverseNotice, setReverseNotice] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchAbortRef = useRef(null);
  const reverseAbortRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setCoords({
      lat: normalizeLat(initialLat, DEFAULT_LAT),
      lng: normalizeLng(initialLng, DEFAULT_LNG),
    });
    setAddress(initialAddress || '');
    setDistrict(initialDistrict || '');
    setSearchQuery('');
    setSuggestions([]);
    setSearchError('');
    setReverseNotice('');
  }, [isOpen, initialLat, initialLng, initialAddress, initialDistrict]);

  const reverseGeocode = useCallback(async (lat, lng) => {
    reverseAbortRef.current?.abort();
    const controller = new AbortController();
    reverseAbortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 5000);

    setReversing(true);
    setReverseNotice('');

    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        addressdetails: '1',
        lat: lat.toFixed(6),
        lon: lng.toFixed(6),
      });
      const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'Accept-Language': 'vi' },
      });

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      if (controller.signal.aborted) return;
      const extracted = extractLocationFields(data);
      if (extracted.address) setAddress(extracted.address);
      if (extracted.district) setDistrict(extracted.district);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setReverseNotice('Không tự lấy được địa chỉ từ bản đồ. Bạn có thể tự nhập bên dưới.');
      } else if (timedOut) {
        setReverseNotice('Mạng phản hồi chậm khi lấy tên đường. Bạn vẫn có thể xác nhận tọa độ hoặc tự nhập địa chỉ.');
      }
    } finally {
      clearTimeout(timeoutId);
      if (reverseAbortRef.current === controller) {
        setReversing(false);
      }
    }
  }, []);

  const updatePinPosition = useCallback(
    (rawLat, rawLng, { shouldReverse = true, panMap = false, zoom } = {}) => {
      const nextLat = normalizeLat(rawLat, DEFAULT_LAT);
      const nextLng = normalizeLng(rawLng, DEFAULT_LNG);
      setCoords({ lat: nextLat, lng: nextLng });

      if (markerRef.current) {
        markerRef.current.setLatLng([nextLat, nextLng]);
      }
      if (panMap && mapInstanceRef.current) {
        mapInstanceRef.current.setView([nextLat, nextLng], zoom ?? mapInstanceRef.current.getZoom());
      }
      if (shouldReverse) {
        reverseGeocode(nextLat, nextLng);
      }
    },
    [reverseGeocode]
  );

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return undefined;

    const initialCenter = [
      normalizeLat(initialLat, DEFAULT_LAT),
      normalizeLng(initialLng, DEFAULT_LNG),
    ];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(initialCenter, {
      draggable: true,
      icon: defaultMarkerIcon,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      updatePinPosition(pos.lat, pos.lng, { shouldReverse: true });
    });

    map.on('click', event => {
      updatePinPosition(event.latlng.lat, event.latlng.lng, { shouldReverse: true });
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 50);

    return () => {
      clearTimeout(resizeTimer);
      searchAbortRef.current?.abort();
      reverseAbortRef.current?.abort();
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, initialLat, initialLng, updatePinPosition]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const runSearch = useCallback(async rawQuery => {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSearchError('');
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    setSearching(true);
    setSearchError('');

    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
        q: trimmed,
      });
      const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'Accept-Language': 'vi' },
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const results = await response.json();
      if (controller.signal.aborted) return;

      if (!Array.isArray(results) || results.length === 0) {
        setSuggestions([]);
        setSearchError('Không tìm thấy địa điểm phù hợp. Hãy thử từ khóa khác hoặc kéo ghim trực tiếp.');
      } else {
        setSuggestions(results);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setSuggestions([]);
        setSearchError('Không thể tìm kiếm địa chỉ lúc này. Bạn vẫn có thể chọn trực tiếp trên bản đồ.');
      }
    } finally {
      clearTimeout(timeoutId);
      if (searchAbortRef.current === controller) {
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      if (!trimmed) {
        setSuggestions([]);
        setSearchError('');
      }
      return undefined;
    }

    const timer = setTimeout(() => {
      runSearch(trimmed);
    }, 450);

    return () => clearTimeout(timer);
  }, [isOpen, searchQuery, runSearch]);

  if (!isOpen) return null;

  const handleSelectSuggestion = item => {
    const extracted = extractLocationFields(item);
    if (extracted.address) setAddress(extracted.address);
    if (extracted.district) setDistrict(extracted.district);
    setSuggestions([]);
    setSearchError('');
    setReverseNotice('');
    updatePinPosition(item.lat, item.lon, { shouldReverse: false, panMap: true, zoom: 16 });
  };

  const handleConfirm = () => {
    onConfirm?.({
      lat: roundCoord(coords.lat),
      lng: roundCoord(coords.lng),
      address: address.trim(),
      district: district.trim(),
    });
  };

  return (
    <div
      className="map-picker-backdrop"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="map-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-picker-title"
        data-testid="map-picker-modal"
      >
        <div className="map-picker-header">
          <div>
            <h2 id="map-picker-title">Chọn vị trí trên bản đồ</h2>
            <p>Tìm địa chỉ, nhấn lên bản đồ hoặc kéo ghim đến đúng vị trí phòng trọ.</p>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            aria-label="Đóng bản đồ"
            data-testid="map-close-button"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="map-search-section">
          <div className="map-search-bar">
            <input
              type="text"
              className="select-input"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runSearch(searchQuery);
                }
              }}
              placeholder="Nhập tên đường, trường học, quận... (VD: 268 Lý Thường Kiệt, Quận 10)"
              aria-label="Tìm kiếm địa chỉ"
              data-testid="map-search-input"
            />
            <button
              type="button"
              className="primary-button"
              onClick={() => runSearch(searchQuery)}
              disabled={searching || !searchQuery.trim()}
              data-testid="map-search-button"
            >
              {searching ? 'Đang tìm...' : 'Tìm'}
            </button>
          </div>

          {searchError && (
            <p className="field-hint map-picker-notice" role="status">
              {searchError}
            </p>
          )}

          {suggestions.length > 0 && (
            <ul className="map-search-results" data-testid="map-search-results" aria-label="Gợi ý địa chỉ">
              {suggestions.map(item => (
                <li key={`${item.place_id}-${item.lat}-${item.lon}`}>
                  <button
                    type="button"
                    className="map-search-result-btn"
                    onClick={() => handleSelectSuggestion(item)}
                    data-testid="map-search-result-item"
                  >
                    {item.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          ref={mapContainerRef}
          className="map-picker-canvas"
          data-testid="map-canvas"
          aria-label="Bản đồ tương tác"
        />

        <div className="map-picker-details">
          <div className="map-coords-bar" data-testid="map-coordinates">
            <span>
              Tọa độ đã chọn:{' '}
              <strong data-testid="map-lat">{coords.lat.toFixed(6)}</strong>,{' '}
              <strong data-testid="map-lng">{coords.lng.toFixed(6)}</strong>
            </span>
            {reversing && <span className="map-reversing-badge">Đang tra cứu địa chỉ...</span>}
          </div>

          {reverseNotice && (
            <p className="field-hint map-picker-notice" role="status">
              {reverseNotice}
            </p>
          )}

          <div className="field-grid">
            <div className="field-group">
              <label htmlFor="map-picker-address" className="field-label">
                Địa chỉ gợi ý
              </label>
              <input
                id="map-picker-address"
                type="text"
                className="select-input"
                value={address}
                onChange={event => setAddress(event.target.value)}
                placeholder="Số nhà, tên đường, phường..."
                data-testid="map-address-input"
              />
            </div>

            <div className="field-group">
              <label htmlFor="map-picker-district" className="field-label">
                Quận / Huyện
              </label>
              <input
                id="map-picker-district"
                type="text"
                className="select-input"
                value={district}
                onChange={event => setDistrict(event.target.value)}
                placeholder="VD: Quận 10"
                data-testid="map-district-input"
              />
            </div>
          </div>
        </div>

        <div className="dialog-actions map-picker-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            data-testid="map-cancel-button"
          >
            Hủy
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleConfirm}
            data-testid="map-confirm-button"
          >
            <Icon name="check" size={16} />
            Xác nhận vị trí
          </button>
        </div>
      </div>
    </div>
  );
}
