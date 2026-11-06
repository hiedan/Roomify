export default function SocialLogo({ provider }) {
  if (provider === 'google') {
    return (
      <svg className="social-logo" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.35-2.59Z" />
        <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.35 2.59A5.99 5.99 0 0 1 12 5.96Z" />
      </svg>
    );
  }

  return (
    <svg className="social-logo" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path fill="#fff" d="M13.55 23V14.48h2.86l.43-3.32h-3.29V9.04c0-.96.27-1.61 1.65-1.61h1.76V4.46a23.5 23.5 0 0 0-2.56-.13c-2.54 0-4.28 1.55-4.28 4.39v2.44H7.25v3.32h2.87V23h3.43Z" />
    </svg>
  );
}
