import Card from '../../Common/Card/Card';
import './FormSection.css';

// Card with a tinted header band: icon + title on the left, subtitle on the right.
function FormSection({ icon, title, subtitle, children }) {
  return (
    <Card className="form-section">
      <div className="form-section__band">
        <h2 className="form-section__title">
          <span className="form-section__icon" aria-hidden="true">
            {icon}
          </span>
          {title}
        </h2>
        {subtitle && <p className="form-section__subtitle">{subtitle}</p>}
      </div>
      <div className="form-section__body">{children}</div>
    </Card>
  );
}

export default FormSection;
