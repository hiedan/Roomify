import { useEffect, useState } from 'react';

export default function ListingPhoto({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed
    ? <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />
    : <div className={`${className} listing-photo-empty`} role="img" aria-label="Phòng chưa có ảnh">Roomify</div>;
}
