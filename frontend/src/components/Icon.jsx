const paths = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1z',
  mail: 'M4 5h16v14H4z M4 6l8 6 8-6',
  lock: 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  eyeOff: 'm3 3 18 18 M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3.1 4 M6.2 6.2A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.8-1.6 M10 10a3 3 0 0 0 4 4',
  arrow: 'M5 12h14 m-6-6 6 6-6 6',
  chevron: 'm6 9 6 6 6-6',
  logout: 'M9 21H4V3h5 M10 12h12 m-5-5 5 5-5 5',
  building: 'M3 21V9h6 M9 21V3h10v18 M1 21h22 M12 7h4 M12 11h4 M12 15h4 M5 13h1 M5 17h1 M13 21v-3h2v3',
  key: 'M15 3a6 6 0 1 1-4.7 9.7L3 20H0v-3l7.3-7.3A6 6 0 0 1 15 3 M17 7h.01',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  shield: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z m-4 10 3 3 5-6',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M4 12a8 8 0 0 0 14 6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
  info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12 M6 18 18 6',
};

export default function Icon({ name, size = 20, className = '' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d={paths[name] || paths.info} />
  </svg>;
}
