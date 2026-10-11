import './Button.css';

// variant: 'primary' | 'outline' | 'link'
function Button({ variant = 'primary', icon, iconRight, children, className = '', ...props }) {
  return (
    <button type="button" className={`btn btn--${variant} ${className}`} {...props}>
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
      {iconRight && <span className="btn__icon">{iconRight}</span>}
    </button>
  );
}

export default Button;
