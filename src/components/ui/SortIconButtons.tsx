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

// Simple inline SVG icons (lightweight, consistent rendering)
const icons = {
  date: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="sort-icon-svg">
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="2"
        y1="6"
        x2="14"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="5"
        y1="1"
        x2="5"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="1"
        x2="11"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  company: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="sort-icon-svg">
      <rect
        x="3"
        y="4"
        width="10"
        height="11"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="6"
        y1="7"
        x2="6"
        y2="7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="7"
        x2="10"
        y2="7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="6"
        y1="10"
        x2="6"
        y2="10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="10"
        x2="10"
        y2="10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 15 L6 12 L10 12 L10 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  ),
  title: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="sort-icon-svg">
      <rect
        x="2"
        y="2"
        width="12"
        height="12"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="4"
        y1="5"
        x2="12"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="8"
        x2="10"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="11"
        x2="8"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
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
 * - Active sort shows direction arrow (▲/▼)
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
                {sortDirection === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
