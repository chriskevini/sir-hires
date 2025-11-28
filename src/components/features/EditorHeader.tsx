import React from 'react';
import { cn } from '@/lib/utils';

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
    <div
      className={cn(
        'py-3 px-4 bg-neutral-100 border-b border-neutral-200',
        'flex justify-between items-center flex-shrink-0 gap-3',
        className
      )}
    >
      <div className="text-sm font-semibold text-neutral-800 flex-1 min-w-0">
        <strong>{title}</strong>
        {subtitle && <span> {subtitle}</span>}
      </div>
      {actions && (
        <div className="flex gap-2 items-center flex-shrink-0">{actions}</div>
      )}
    </div>
  );
};
