import * as React from 'react';
import { statusStyles, statusOrder } from '@/config';
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
 * Uses colors from config.statusStyles for consistency across the app.
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
    // Normalize status (capitalize first letter of each word)
    const normalizedStatus = status
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Get style from config, fallback to Researching
    const styles =
      statusStyles[normalizedStatus] || statusStyles['Researching'];

    if (variant === 'dot') {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-block rounded-full',
            dotSizeClasses[size],
            className
          )}
          style={{ backgroundColor: styles.color }}
          title={normalizedStatus}
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
          backgroundColor: styles.color,
          color: 'white',
        }}
        {...props}
      >
        {normalizedStatus}
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

/**
 * Get status color (useful for custom styling)
 */
export const getStatusColor = (status: string): string => {
  const normalizedStatus = status
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return (
    statusStyles[normalizedStatus]?.color || statusStyles['Researching'].color
  );
};

/**
 * Get status background color with opacity (for cards, highlights)
 */
export const getStatusBackground = (status: string): string => {
  const normalizedStatus = status
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return (
    statusStyles[normalizedStatus]?.cardBg || statusStyles['Researching'].cardBg
  );
};

export { StatusBadge };
