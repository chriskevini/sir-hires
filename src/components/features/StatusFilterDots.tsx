import { statusOrder, statusStyles } from '@/config';
import { cn } from '@/lib/utils';

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
      className="flex items-center justify-center gap-1.5 py-1"
      role="group"
      aria-label="Filter by status"
    >
      {statusOrder.map((status) => {
        const styles = statusStyles[status] || statusStyles['Researching'];
        const isFilled = isAllSelected || selectedStatuses.includes(status);

        return (
          <button
            key={status}
            type="button"
            className={cn(
              'w-3 h-3 rounded-full border-2 p-0 cursor-pointer',
              'transition-all duration-150',
              'hover:scale-125 active:scale-95',
              isFilled ? 'border-transparent' : 'bg-transparent'
            )}
            style={
              isFilled
                ? { backgroundColor: styles.color }
                : { borderColor: styles.color }
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
