import { Link } from 'react-router-dom';
import './SectionHeader.css';

// Card heading with optional leading icon, subtitle and a "View …  →" link.
function SectionHeader({ icon, title, subtitle, linkLabel, linkTo, boxedIcon = false }) {
  return (
    <div className="section-header">
      {icon && (
        <span className={`section-header__icon ${boxedIcon ? 'section-header__icon--boxed' : ''}`}>{icon}</span>
      )}
      <div className="section-header__text">
        <h2 className="section-header__title">{title}</h2>
        {subtitle && <p className="section-header__subtitle">{subtitle}</p>}
      </div>
      {linkLabel && (
        <Link to={linkTo} className="section-header__link">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export default SectionHeader;
