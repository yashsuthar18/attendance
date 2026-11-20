import './globals.css';
export const metadata = { title: 'Event QR Manager', description: 'Independent event registration and attendance' };
export default function RootLayout({ children }) {
  return <html lang="en"><body><header className="top"><a href="/" className="brand">▦ Event QR Manager</a><nav><a href="/organizer">Organizer</a><a href="/my-card">My Card</a></nav></header><main className="container">{children}</main><footer>Independent Event QR System · Not connected to Gujarat Forms</footer></body></html>;
}
