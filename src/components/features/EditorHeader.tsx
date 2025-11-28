import React from 'react';
import './EditorHeader.css';

interface EditorHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Generic editor header component with title and action buttons.
 * Used in both researching and drafting views for consistent header layout.
 */
export const EditorHeader: React.FC<EditorHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <div className={`editor-header ${className}`}>
      <div className="editor-title">
        <strong>{title}</strong>
        {subtitle && <span> {subtitle}</span>}
      </div>
      {actions && <div className="editor-actions">{actions}</div>}
    </div>
  );
};
