import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  status: string;
  progressConfig: Record<
    string,
    { fill: number; color: string; textColor: string }
  >;
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
 * Uses progressConfig from config.ts:
 * - fill: percentage width (0-100)
 * - color: background color of the fill
 * - textColor: color of the status label text
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  status,
  progressConfig,
}) => {
  const config = progressConfig[status] || progressConfig['Researching'];
  const { fill, color, textColor } = config;

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
          color: textColor,
        }}
      >
        {status}
      </span>
    </div>
  );
};
