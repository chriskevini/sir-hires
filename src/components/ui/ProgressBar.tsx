import React from 'react';
import { statusStyles } from '@/config';

interface ProgressBarProps {
  status: string;
}

/**
 * @deprecated This component is replaced by JobHeader which includes
 * an integrated progress bar. Will be removed in a future release.
 *
 * ProgressBar - Visual progress indicator for job application status
 *
 * Displays a horizontal bar with color-coded fill percentage indicating
 * the current stage in the application workflow.
 *
 * Uses statusStyles from config.ts:
 * - fill: percentage width (0-100)
 * - color: background color of the fill
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ status }) => {
  const styles = statusStyles[status] || statusStyles['Researching'];
  const { fill, color } = styles;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#f5f5f5] border-t border-[#ddd] overflow-hidden z-[100]">
      <div
        className="absolute left-0 top-0 h-full transition-[width,background-color] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          width: `${fill}%`,
          backgroundColor: color,
        }}
      />
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-sm whitespace-nowrap z-[1] transition-colors duration-400"
        style={{
          color: color,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        }}
      >
        {status}
      </span>
    </div>
  );
};
