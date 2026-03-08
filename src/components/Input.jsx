import './Input.css';
import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(({ 
  className, 
  label, 
  error, 
  tail,
  id, 
  ...props 
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={clsx('cmail-input-wrapper', className)}>
      {label && (
        <label htmlFor={inputId} className="cmail-input-label">
          {label}
        </label>
      )}
      
      <div className={clsx('cmail-input-container', error && 'cmail-input-error', tail && 'cmail-input-has-tail')}>
        <input
          ref={ref}
          id={inputId}
          className="cmail-input-field"
          {...props}
        />
        {tail && <span className="cmail-input-tail">{tail}</span>}
      </div>

      {error && <span className="cmail-input-error-msg">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
