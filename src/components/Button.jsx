import './Button.css';
import { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const Button = forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  ...props 
}, ref) => {
  return (
    <button
      ref={ref}
      className={clsx(
        'cmail-btn',
        `cmail-btn-${variant}`,
        `cmail-btn-${size}`,
        isLoading && 'cmail-btn-loading',
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="cmail-btn-spinner" size={16} />}
      <span className="cmail-btn-content">{children}</span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
