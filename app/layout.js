import './globals.css';
import './fonts.css';
import './compact.css';
import Icon from '../components/Icon';

export const metadata = {
  title: 'Event QR Manager',
  description: 'Independent event registration and attendance system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="gu">
      <body>
        <header className="top">
          <a href="/" className="brand">
            <span className="brand-icon"><Icon name="qr" /></span>
            Event QR
          </a>
          <nav aria-label="Main navigation">
            <a href="/organizer" className="nav-link">
              <Icon name="organizer" /> Organizer
            </a>
            <a href="/my-card" className="nav-link-pill">
              <Icon name="card" /> My Card
            </a>
          </nav>
        </header>

        <main className="container">
          {children}
        </main>

        <footer>
          <span>Independent Event QR System</span>
          <span className="footer-detail"> &nbsp;·&nbsp; Gujarati + English Support &nbsp;·&nbsp; Not connected to Gujarat Forms</span>
        </footer>
      </body>
    </html>
  );
}
