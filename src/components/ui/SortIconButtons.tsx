import type { ReactNode } from 'react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  BuildingIcon,
  DocumentIcon,
} from './icons';
import './SortIconButtons.css';

export type SortField = 'date' | 'company' | 'title';
export type SortDirection = 'asc' | 'desc';

interface SortIconButtonsProps {
  /** Current sort field */
  sortField: SortField;
  /** Current sort direction */
  sortDirection: SortDirection;
  /** Callback when sort changes */
  onChange: (field: SortField, direction: SortDirection) => void;
}

const icons: Record<SortField, ReactNode> = {
  date: CalendarIcon,
  company: BuildingIcon,
  title: DocumentIcon,
};

const tooltips: Record<SortField, string> = {
  date: 'Sort by date',
  company: 'Sort by company',
  title: 'Sort by title',
};

/**
 * Icon-based sort selector.
 * - Click an icon to sort by that field
 * - Click the same icon again to reverse direction
 * - Active sort shows direction arrow
 */
export function SortIconButtons({
  sortField,
  sortDirection,
  onChange,
}: SortIconButtonsProps) {
  const handleClick = (field: SortField) => {
    if (field === sortField) {
      // Same field - toggle direction
      onChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field - default to descending for date, ascending for text
      const defaultDirection = field === 'date' ? 'desc' : 'asc';
      onChange(field, defaultDirection);
    }
  };

  const fields: SortField[] = ['date', 'company', 'title'];

  return (
    <div className="sort-icon-buttons" role="group" aria-label="Sort options">
      {fields.map((field) => {
        const isActive = field === sortField;
        return (
          <button
            key={field}
            type="button"
            className={`sort-icon-btn ${isActive ? 'active' : ''}`}
            onClick={() => handleClick(field)}
            title={tooltips[field]}
            aria-label={`${tooltips[field]}${isActive ? ` (${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
            aria-pressed={isActive}
          >
            {icons[field]}
            {isActive && (
              <span className="sort-direction-arrow">
                {sortDirection === 'asc' ? ArrowUpIcon : ArrowDownIcon}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
