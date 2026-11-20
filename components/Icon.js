const paths = {
  qr: <><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z" /><path d="M15 15h3v3h3M15 21v-3M21 12v3M12 3v3M3 12h3M12 9v6h-3M12 21v-3" /></>,
  organizer: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 5V3h8v2M3 11h18M10 11v3h4v-3" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="10" r="2" /><path d="M5 16c0-3 6-3 6 0M14 9h4M14 13h4" /></>,
  upload: <><path d="M12 16V3m-4 4 4-4 4 4M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
  camera: <><path d="m8 5 2-2h4l2 2h4a1 1 0 0 1 1 1v14H3V6a1 1 0 0 1 1-1z" /><circle cx="12" cy="12" r="4" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  warning: <><path d="m12 3 10 18H2zM12 9v5M12 17h.01" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3" /></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" /></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5 8a7 7 0 0 1 12-3l3 3M4 16l3 3a7 7 0 0 0 12-3" /></>,
  logout: <><path d="M9 3H3v18h6M9 12h12m-4-4 4 4-4 4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
};

export default function Icon({ name, className = '' }) {
  return (
    <svg className={`icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name] || paths.qr}
    </svg>
  );
}
