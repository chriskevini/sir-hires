import React, { useEffect, useRef } from 'react';
import './Dropdown.css';

interface DropdownItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  buttonLabel: string;
  buttonIcon?: string;
  /** When true, only shows the icon (no label or caret) */
  iconOnly?: boolean;
  items: DropdownItem[];
  className?: string;
}

/**
 * Generic dropdown component with toggle button and menu items.
 * Handles outside click detection and keyboard events.
 */
export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onToggle,
  onClose,
  buttonLabel,
  buttonIcon,
  iconOnly = false,
  items,
  className = '',
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={dropdownRef} className={`dropdown-container ${className}`}>
      <button
        className={`btn-dropdown ${iconOnly ? 'btn-dropdown-icon-only' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={iconOnly ? buttonLabel : undefined}
      >
        {iconOnly ? (
          <span>{buttonIcon}</span>
        ) : (
          <>
            {buttonIcon && <span>{buttonIcon} </span>}
            {buttonLabel} ▼
          </>
        )}
      </button>
      <div className={`dropdown-menu ${isOpen ? '' : 'hidden'}`}>
        {items.map((item) => (
          <button
            key={item.label}
            className={`dropdown-item ${item.variant === 'danger' ? 'dropdown-item-danger' : ''}`}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.icon && <span>{item.icon} </span>}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
