import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './rooms.css';

const DEFAULT_CENTER = [10.7769, 106.7009];
const money = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' đ/tháng';

function RoomMap({ rooms, selectedId, onSelect }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const [tileError, setTileError] = useState(false);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const map = L.map(container.current).setView(DEFAULT_CENTER, 12);
    mapRef.current = map;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    tiles.on('tileerror', () => setTileError(true));
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const markers = new Map();
    for (const room of rooms) {
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = room.title;
      const price = document.createElement('p');
      price.textContent = money(room.price);
      const address = document.createElement('p');
      address.textContent = room.address;
      popup.append(title, price, address);
      const marker = L.circleMarker([room.lat, room.lng], {
        radius: 9, color: '#fff', weight: 3, fillColor: '#1263c5', fillOpacity: 1,
      }).addTo(layer).bindPopup(popup);
      marker.on('click', () => selectRef.current(room.id));
      markers.set(room.id, marker);
    }
    markersRef.current = markers;
    if (rooms.length) map.fitBounds(L.latLngBounds(rooms.map((r) => [r.lat, r.lng])), { padding: [40, 40], maxZoom: 15 });
    return () => { map.removeLayer(layer); markersRef.current = new Map(); };
  }, [rooms]);

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.setStyle({ fillColor: id === selectedId ? '#e45b28' : '#1263c5', radius: id === selectedId ? 12 : 9 });
    }
    const marker = markersRef.current.get(selectedId);
    if (marker) { mapRef.current.panTo(marker.getLatLng()); marker.openPopup(); }
  }, [selectedId, rooms]);

  return <section className="rooms-map" aria-label="Bản đồ vị trí phòng trọ">
    <div ref={container} className="map-canvas" />
    {tileError && <p className="map-notice" role="status">Không tải được một phần bản đồ. Kiểm tra kết nối mạng hoặc tải lại trang.</p>}
  </section>;
}

export default function RoomsPage({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const limit = 20;

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setLoading(true); setError(''); setRooms([]); setSelectedId(null);
      try {
        const response = await fetch('/api/v1/listings?page=' + page + '&limit=' + limit, { signal: abort.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || 'Không tải được danh sách phòng');
        if (!abort.signal.aborted) { setRooms(result.data); setTotal(result.pagination.total); }
      } catch (err) {
        if (!abort.signal.aborted) setError(err instanceof TypeError ? 'Không kết nối được máy chủ.' : err.message);
      } finally { if (!abort.signal.aborted) setLoading(false); }
    }
    load();
    return () => abort.abort();
  }, [page, retry]);

  return <main className="rooms-page">
    <header className="rooms-header"><div><strong className="rooms-brand">Roomify</strong><span>Tìm phòng trên bản đồ</span></div>
      <div><span className="rooms-user">{user.fullName}</span><button onClick={onLogout}>Đăng xuất</button></div>
    </header>
    <div className="rooms-layout">
      <aside className="rooms-sidebar" aria-label="Danh sách phòng trọ">
        <h1>Khám phá phòng trọ</h1><p className="rooms-subtitle">Các phòng đã được duyệt. Chọn một phòng để xem vị trí.</p>
        <div role="status">{loading ? 'Đang tải phòng…' : error ? error : total + ' phòng đã duyệt'}</div>
        {error && <button className="rooms-retry" onClick={() => setRetry(retry + 1)}>Thử lại</button>}
        {!loading && !error && !rooms.length && <p className="rooms-empty">Chưa có phòng trên trang này. Bản đồ vẫn mở để bạn khám phá khu vực.</p>}
        <ul className="room-list">{rooms.map((room) => <li key={room.id}><button
          className={'room-card' + (selectedId === room.id ? ' selected' : '')}
          aria-pressed={selectedId === room.id} onClick={() => setSelectedId(room.id)}>
          <strong>{room.title}</strong><span className="room-price">{money(room.price)}</span>
          <span>{room.areaM2} m² · {room.district}</span><span>{room.address}</span>
        </button></li>)}</ul>
        <nav className="rooms-pagination" aria-label="Phân trang phòng"><button disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Trước</button>
          <span>Trang {page} / {Math.max(1, Math.ceil(total / limit))}</span>
          <button disabled={loading || page * limit >= total || !!error} onClick={() => setPage(page + 1)}>Sau</button>
        </nav>
        <small>Bản đồ hiển thị các phòng trong trang hiện tại.</small>
      </aside>
      <RoomMap rooms={rooms} selectedId={selectedId} onSelect={setSelectedId} />
    </div>
  </main>;
}
