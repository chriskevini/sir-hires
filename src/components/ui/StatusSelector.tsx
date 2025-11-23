import React from 'react';
import {
  statusOrder,
  statusColors,
} from '../../entrypoints/job-details/config';
import './StatusSelector.css';

interface StatusSelectorProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  className?: string;
}

/**
 * StatusSelector - Dropdown for changing job application status
 * Simple temporary solution until full navigation buttons are implemented
 */
export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus !== currentStatus) {
      onStatusChange(newStatus);
    }
  };

  const getStatusColor = (status: string) => {
    return (
      statusColors[status as keyof typeof statusColors] || {
        bg: '#f5f5f5',
        text: '#666',
      }
    );
  };

  return (
    <div className={`status-selector ${className}`}>
      <label htmlFor="status-select" className="status-label">
        Status:
      </label>
      <select
        id="status-select"
        value={currentStatus}
        onChange={handleChange}
        className="status-select"
        style={{
          backgroundColor: getStatusColor(currentStatus).bg,
          color: getStatusColor(currentStatus).text,
        }}
      >
        {statusOrder.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
};
