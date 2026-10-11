import { useState } from 'react';
import FormField from '../FormField/FormField';

// Password input with a Show / Hide toggle.
function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="form-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}

export default PasswordField;
