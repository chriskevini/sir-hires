import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { statusOrder, getStatusColor } from '@/config';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface StatusFilterDotsProps {
  /** Array of selected statuses. Empty array = all statuses shown */
  selectedStatuses: string[];
  /** Callback when selection changes */
  onChange: (statuses: string[]) => void;
}

/**
 * Status filter as a row of togglable colored dots.
 * Built on Radix ToggleGroup for keyboard navigation and accessibility.
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

  const handleValueChange = (newValues: string[]) => {
    // ToggleGroup gives us the new array directly
    onChange(newValues);
  };

  return (
    <ToggleGroupPrimitive.Root
      type="multiple"
      value={selectedStatuses}
      onValueChange={handleValueChange}
      className="flex items-center justify-center gap-1.5 py-1"
      aria-label="Filter by status"
    >
      {statusOrder.map((status) => {
        const color = getStatusColor(status);
        const isFilled = isAllSelected || selectedStatuses.includes(status);

        return (
          <Tooltip key={status}>
            <TooltipTrigger asChild>
              <ToggleGroupPrimitive.Item
                value={status}
                className={cn(
                  'w-3 h-3 rounded-full border-2 p-0 cursor-pointer',
                  'transition-all duration-150',
                  'hover:scale-125 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  isFilled ? 'border-transparent' : 'bg-transparent'
                )}
                style={
                  isFilled ? { backgroundColor: color } : { borderColor: color }
                }
                aria-label={`${status}${isFilled ? ' (active)' : ''}`}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">{status}</TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}
