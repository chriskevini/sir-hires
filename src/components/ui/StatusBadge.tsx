import * as React from 'react';
import {
  statusOrder,
  getStatusConfig,
  getStatusColor,
  getStatusBackground,
} from '@/config';
import { cn } from '@/lib/utils';

export type ApplicationStatus = (typeof statusOrder)[number];

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** The application status to display */
  status: string;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show just a dot instead of full badge */
  variant?: 'badge' | 'dot';
}

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1.5',
};

const dotSizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

/**
 * StatusBadge - Display application status with consistent styling
 *
 * Uses colors from centralized status config for consistency across the app.
 *
 * @example
 * // Full badge
 * <StatusBadge status="Interviewing" />
 *
 * // Small badge
 * <StatusBadge status="Drafting" size="sm" />
 *
 * // Dot only (for filters, compact views)
 * <StatusBadge status="Accepted" variant="dot" />
 */
const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, size = 'md', variant = 'badge', className, ...props }, ref) => {
    const config = getStatusConfig(status);
    const color = getStatusColor(status);

    if (variant === 'dot') {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-block rounded-full',
            dotSizeClasses[size],
            className
          )}
          style={{ backgroundColor: color }}
          title={config.name}
          {...props}
        />
      );
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-semibold rounded-full whitespace-nowrap',
          sizeClasses[size],
          className
        )}
        style={{
          backgroundColor: color,
          color: 'white',
        }}
        {...props}
      >
        {config.name}
      </span>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

/**
 * Get all available statuses (useful for filters, selects)
 */
export const getAvailableStatuses = (): ApplicationStatus[] => {
  return [...statusOrder];
};

// Re-export helpers from config for convenience
export { getStatusColor, getStatusBackground };

export { StatusBadge };
