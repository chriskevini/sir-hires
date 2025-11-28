import { statusOrder, progressConfig } from '@/config';
import './StatusFilterDots.css';

interface StatusFilterDotsProps {
  /** Array of selected statuses. Empty array = all statuses shown */
  selectedStatuses: string[];
  /** Callback when selection changes */
  onChange: (statuses: string[]) => void;
}

/**
 * Status filter as a row of togglable colored dots.
 * - All dots filled = no filter (show all)
 * - Click a dot to select only that status
 * - Click more dots to add to selection
 * - Click selected dot to deselect
 * - When all deselected, returns to "show all" state
 */
export function StatusFilterDots({
  selectedStatuses,
  onChange,
}: StatusFilterDotsProps) {
  const isAllSelected = selectedStatuses.length === 0;

  const handleDotClick = (status: string) => {
    if (isAllSelected) {
      // Nothing selected = all shown. Click one to filter to just that status
      onChange([status]);
    } else if (selectedStatuses.includes(status)) {
      // Already selected - deselect it
      const newSelection = selectedStatuses.filter((s) => s !== status);
      // If nothing left, return to "all selected" state
      onChange(newSelection);
    } else {
      // Not selected - add to selection
      onChange([...selectedStatuses, status]);
    }
  };

  return (
    <div
      className="status-filter-dots"
      role="group"
      aria-label="Filter by status"
    >
      {statusOrder.map((status) => {
        const progress = progressConfig[status as keyof typeof progressConfig];
        const isFilled = isAllSelected || selectedStatuses.includes(status);

        return (
          <button
            key={status}
            type="button"
            className={`status-filter-dot ${isFilled ? 'filled' : ''}`}
            style={
              isFilled
                ? { backgroundColor: progress.color }
                : { borderColor: progress.color }
            }
            onClick={() => handleDotClick(status)}
            title={status}
            aria-label={`${status}${isFilled ? ' (active)' : ''}`}
            aria-pressed={isFilled}
          />
        );
      })}
    </div>
  );
}
