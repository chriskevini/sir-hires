import type { ReactNode } from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import {
  ArrowUp,
  ArrowDown,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

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
  date: <Calendar className="h-5 w-5" />,
  company: <Building2 className="h-5 w-5" />,
  title: <FileText className="h-5 w-5" />,
};

const tooltips: Record<SortField, string> = {
  date: 'Sort by date',
  company: 'Sort by company',
  title: 'Sort by title',
};

/**
 * Icon-based sort selector.
 * Built on Radix ToggleGroup for keyboard navigation and accessibility.
 * - Click an icon to sort by that field
 * - Click the same icon again to reverse direction
 * - Active sort shows direction arrow
 */
export function SortIconButtons({
  sortField,
  sortDirection,
  onChange,
}: SortIconButtonsProps) {
  const handleValueChange = (value: string) => {
    if (!value) {
      // Clicking active item again - toggle direction
      onChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    const field = value as SortField;
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
    <ToggleGroupPrimitive.Root
      type="single"
      value={sortField}
      onValueChange={handleValueChange}
      className="flex items-center justify-center gap-2 py-1"
      aria-label="Sort options"
    >
      {fields.map((field) => {
        const isActive = field === sortField;
        return (
          <Tooltip key={field}>
            <TooltipTrigger asChild>
              <ToggleGroupPrimitive.Item
                value={field}
                className={cn(
                  'relative flex items-center justify-center',
                  'w-8 h-7 p-1 border-none rounded',
                  'bg-transparent cursor-pointer',
                  'transition-colors duration-150',
                  'active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  isActive
                    ? 'text-primary hover:text-primary/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={`${tooltips[field]}${isActive ? ` (${sortDirection === 'asc' ? 'ascending' : 'descending'})` : ''}`}
              >
                {icons[field]}
                {isActive && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5">
                    {sortDirection === 'asc' ? (
                      <ArrowUp className="h-2.5 w-2.5" />
                    ) : (
                      <ArrowDown className="h-2.5 w-2.5" />
                    )}
                  </span>
                )}
              </ToggleGroupPrimitive.Item>
            </TooltipTrigger>
            <TooltipContent side="bottom">{tooltips[field]}</TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}
