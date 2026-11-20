import Icon from './Icon';

export default function AuthHeader({ icon, title, children }) {
  return (
    <div className="auth-header">
      <span className="auth-icon"><Icon name={icon} /></span>
      <h1>{title}</h1>
      <p className="muted">{children}</p>
    </div>
  );
}
