import React from 'react';
import { statusStyles } from '@/config';
import './ProgressBar.css';

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
    <div className="progress-bar-container">
      <div
        className="progress-bar-fill"
        style={{
          width: `${fill}%`,
          backgroundColor: color,
        }}
      />
      <span
        className="progress-bar-label"
        style={{
          color: color,
        }}
      >
        {status}
      </span>
    </div>
  );
};
