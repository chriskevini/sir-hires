import React, { forwardRef } from 'react';
import './Button.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'subtle'
  | 'link'
  | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', className = '', children, ...props },
    ref
  ) {
    // Ghost variant skips .btn base class to avoid overriding component CSS
    const isGhost = variant === 'ghost';
    const classes = [
      isGhost ? '' : 'btn',
      `btn-${variant}`,
      !['subtle', 'link', 'ghost'].includes(variant) ? `btn-${size}` : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
