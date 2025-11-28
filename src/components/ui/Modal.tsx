import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const modal = (
    <div
      className={`synthesis-modal-overlay ${isOpen ? 'visible' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`synthesis-modal ${className}`}>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <Button
              variant="ghost"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              &times;
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
