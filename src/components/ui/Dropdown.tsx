import React, { useId, useRef, useCallback } from 'react';
import { ChevronDownIcon } from './icons';
import { Button } from './Button';
import './Dropdown.css';

interface DropdownItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownProps {
  buttonLabel: string;
  buttonIcon?: string;
  /** When true, only shows the icon (no label or caret) */
  iconOnly?: boolean;
  items: DropdownItem[];
  className?: string;
}

/**
 * Generic dropdown component using native HTML Popover API.
 * Handles click outside, escape key, and focus management automatically.
 */
export const Dropdown: React.FC<DropdownProps> = ({
  buttonLabel,
  buttonIcon,
  iconOnly = false,
  items,
  className = '',
}) => {
  // Generate unique ID for popover target (sanitize colons from useId)
  const rawId = useId();
  const popoverId = `dropdown-${rawId.replace(/:/g, '')}`;
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Position and toggle popover
  const handleToggle = useCallback(() => {
    const popover = popoverRef.current;
    const button = buttonRef.current;

    if (!popover || !button) return;

    // Position popover below and aligned to right edge of button
    const rect = button.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.top = `${rect.bottom + 4}px`;
    popover.style.right = `${window.innerWidth - rect.right}px`;
    popover.style.left = 'auto';

    popover.togglePopover();
  }, []);

  // Close popover after item click
  const handleItemClick = useCallback((onClick: () => void) => {
    const popover = popoverRef.current;
    if (popover) {
      popover.hidePopover();
    }
    onClick();
  }, []);

  return (
    <div className={`dropdown-container ${className}`}>
      <Button
        ref={buttonRef}
        variant={iconOnly ? 'ghost' : 'secondary'}
        className={
          iconOnly ? 'btn-dropdown btn-dropdown-icon-only' : 'btn-dropdown'
        }
        title={iconOnly ? buttonLabel : undefined}
        onClick={handleToggle}
      >
        {iconOnly ? (
          <span>{buttonIcon}</span>
        ) : (
          <>
            {buttonIcon && <span>{buttonIcon} </span>}
            {buttonLabel} {ChevronDownIcon}
          </>
        )}
      </Button>
      <div
        ref={popoverRef}
        id={popoverId}
        className="dropdown-menu"
        popover="auto"
      >
        {items.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className={`dropdown-item ${item.variant === 'danger' ? 'dropdown-item-danger' : ''}`}
            onClick={() => handleItemClick(item.onClick)}
          >
            {item.icon && <span>{item.icon} </span>}
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
