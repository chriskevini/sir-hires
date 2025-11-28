import React, { useState, useCallback, useMemo } from 'react';
import { StatusFilterDots } from './StatusFilterDots';
import {
  SortIconButtons,
  type SortField,
  type SortDirection,
} from './SortIconButtons';
import { statusStyles, defaults } from '@/config';
import {
  getJobTitle,
  getCompanyName,
  type JobTemplateData,
} from '@/utils/job-parser';
import type { Job } from '@/entrypoints/job-details/hooks';
import { CloseIcon } from '../ui/icons';
import { Button } from '../ui/Button';
import './JobSelector.css';

interface JobSelectorProps {
  /** All jobs to display */
  jobs: Job[];
  /** Currently selected job ID */
  selectedJobId: string | null;
  /** Callback when a job is selected */
  onSelectJob: (jobId: string) => void;
  /** Callback when a job is deleted */
  onDeleteJob: (jobId: string) => void;
  /** Whether the selector is open */
  isOpen: boolean;
  /** Callback to close the selector */
  onClose: () => void;
  /** Function to get parsed job data (from ParsedJobProvider) */
  getParsedJob: (jobId: string) => JobTemplateData | null;
}

/**
 * JobSelector - Sliding overlay panel for selecting jobs
 *
 * Features:
 * - Search filter by title/company
 * - Status filter dots (multi-select)
 * - Sort by date/company/title
 * - Job cards with status badges
 * - CSS transition for open/close (width: 0 <-> 100%)
 */
export function JobSelector({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  isOpen,
  onClose,
  getParsedJob,
}: JobSelectorProps) {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  /**
   * Filter and sort jobs based on current filter settings
   */
  const filteredJobs = useMemo(() => {
    let filtered = jobs.filter((job: Job) => {
      const parsed = getParsedJob(job.id);
      if (!parsed) return true; // Include jobs with no content

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const jobTitle = getJobTitle(parsed);
        const company = getCompanyName(parsed);
        const matchesSearch =
          jobTitle?.toLowerCase().includes(searchLower) ||
          company?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter (multi-select: empty array = show all)
      if (statusFilters.length > 0) {
        const jobStatus = job.applicationStatus || defaults.status;
        if (!statusFilters.includes(jobStatus)) return false;
      }

      return true;
    });

    // Sort jobs
    const dirMult = sortDirection === 'asc' ? 1 : -1;

    if (sortField === 'date') {
      filtered = filtered.sort(
        (a: Job, b: Job) =>
          dirMult *
          (new Date(a.updatedAt || 0).getTime() -
            new Date(b.updatedAt || 0).getTime())
      );
    } else if (sortField === 'company') {
      filtered = filtered.sort((a: Job, b: Job) => {
        const parsedA = getParsedJob(a.id);
        const parsedB = getParsedJob(b.id);
        const companyA = parsedA ? getCompanyName(parsedA) || '' : '';
        const companyB = parsedB ? getCompanyName(parsedB) || '' : '';
        return dirMult * companyA.localeCompare(companyB);
      });
    } else if (sortField === 'title') {
      filtered = filtered.sort((a: Job, b: Job) => {
        const parsedA = getParsedJob(a.id);
        const parsedB = getParsedJob(b.id);
        const titleA = parsedA ? getJobTitle(parsedA) || '' : '';
        const titleB = parsedB ? getJobTitle(parsedB) || '' : '';
        return dirMult * titleA.localeCompare(titleB);
      });
    }

    return filtered;
  }, [jobs, searchTerm, statusFilters, sortField, sortDirection, getParsedJob]);

  /**
   * Handle job selection - select and close panel
   */
  const handleSelectJob = useCallback(
    (jobId: string) => {
      onSelectJob(jobId);
      onClose();
    },
    [onSelectJob, onClose]
  );

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback(
    (field: SortField, direction: SortDirection) => {
      setSortField(field);
      setSortDirection(direction);
    },
    []
  );

  /**
   * Handle backdrop click - close panel
   */
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Prevent click propagation from panel to backdrop
   */
  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Always render - CSS transition handles open/close
  return (
    <div
      className={`job-selector-panel ${isOpen ? '' : 'collapsed'}`}
      onClick={handlePanelClick}
    >
      {/* Invisible backdrop for closing when open */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          }}
          onClick={handleBackdropClick}
        />
      )}
      {/* Header with filters */}
      <div className="job-selector-header">
        <div className="job-selector-filters">
          <input
            type="text"
            className="job-selector-search"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <div className="job-selector-filter-row">
            <StatusFilterDots
              selectedStatuses={statusFilters}
              onChange={setStatusFilters}
            />
          </div>
          <div className="job-selector-filter-row">
            <SortIconButtons
              sortField={sortField}
              sortDirection={sortDirection}
              onChange={handleSortChange}
            />
          </div>
          <div className="job-selector-count">
            {filteredJobs.length} of {jobs.length} jobs
          </div>
        </div>
      </div>

      {/* Job list */}
      <div className="job-selector-list">
        {filteredJobs.map((job: Job) => {
          const isSelected = job.id === selectedJobId;
          const parsed = getParsedJob(job.id);
          const status = job.applicationStatus || defaults.status;
          const styles = statusStyles[status] || statusStyles['Researching'];

          return (
            <div
              key={job.id}
              className={`job-selector-card ${isSelected ? 'selected' : ''}`}
              style={{ backgroundColor: styles.cardBg }}
              onClick={() => handleSelectJob(job.id)}
            >
              <div className="job-selector-card-header">
                <div className="job-selector-card-title">
                  {parsed ? getJobTitle(parsed) || 'Untitled' : 'Untitled'}
                </div>
                <div className="job-selector-card-company">
                  {parsed ? getCompanyName(parsed) || 'Unknown' : 'Unknown'}
                </div>
                <span
                  className="job-selector-card-badge"
                  style={{
                    backgroundColor: styles.color,
                    color: '#fff',
                  }}
                >
                  {status}
                </span>
                {isSelected && (
                  <Button
                    variant="ghost"
                    className="job-selector-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteJob(job.id);
                    }}
                    title="Delete this job"
                  >
                    {CloseIcon}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="job-selector-empty">
            {jobs.length === 0
              ? 'No jobs yet. Extract a job to get started.'
              : 'No jobs match your filters.'}
          </div>
        )}
      </div>
    </div>
  );
}
