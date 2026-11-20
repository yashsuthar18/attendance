import Icon from '../components/Icon';
import styles from './home.module.css';

export default function Home() {
  return (
    <div className={styles.home}>
      <section className={`hero ${styles.intro}`} aria-labelledby="home-title">
        <p className={styles.eyebrow}>EVENT QR MANAGER</p>
        <h1 id="home-title">
          તમારી ઇવેન્ટ.<br />
          <span>બધું એક જ જગ્યાએ.</span>
        </h1>
        <p className={styles.description}>
          ઇવેન્ટનું સંચાલન કરો અથવા તમારું QR કાર્ડ ખોલો.
        </p>
      </section>

      <section className={`hero-actions ${styles.access}`} aria-label="Organizer and participant access">
        <article className={`feature-card ${styles.accessCard} ${styles.organizer}`} aria-labelledby="organizer-title">
          <div className={styles.role}>
            <span className={styles.roleIcon}><Icon name="organizer" /></span>
            <span>આયોજક માટે</span>
          </div>
          <h2 id="organizer-title">Organizer Dashboard</h2>
          <p>તમારા ઇવેન્ટ, સભ્યો અને મીટિંગની હાજરી એક જગ્યાએ સંભાળો.</p>
          <div className={styles.cardAction}>
            <a className="button btn-primary" href="/organizer">Dashboard ખોલો</a>
          </div>
        </article>

        <article className={`feature-card ${styles.accessCard}`} aria-labelledby="participant-title">
          <div className={styles.role}>
            <span className={styles.roleIcon}><Icon name="card" /></span>
            <span>સભ્ય માટે</span>
          </div>
          <h2 id="participant-title">Participant Card</h2>
          <p>તમારું ડિજિટલ QR કાર્ડ જુઓ, ડાઉનલોડ કરો અથવા પ્રિન્ટ કાઢો.</p>
          <div className={styles.cardAction}>
            <a className="button btn-secondary" href="/my-card">મારું QR કાર્ડ ખોલો</a>
          </div>
        </article>
      </section>

      <aside className={`info ${styles.loginNote}`} aria-labelledby="participant-login-note">
        <Icon name="lock" />
        <div>
          <h2 id="participant-login-note">પહેલી વખત login કરો છો?</h2>
          <p>Login માટે આયોજકે મોકલેલી ઇવેન્ટ લિંકનો ઉપયોગ કરો.</p>
        </div>
      </aside>
    </div>
  );
}
