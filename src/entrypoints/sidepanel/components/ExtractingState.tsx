import React from 'react';
import type { ExtractingJob } from '../hooks';

interface ExtractingStateProps {
  extractingJob: ExtractingJob;
}

/**
 * ExtractingState Component - Shows streaming extraction progress
 * Displays ephemeral job data before it's saved to storage
 */
export const ExtractingState: React.FC<ExtractingStateProps> = ({
  extractingJob,
}) => {
  const chunkCount = extractingJob.chunks.length;
  const previewText =
    extractingJob.chunks.length > 0
      ? extractingJob.chunks.join('').substring(0, 200) + '...'
      : 'Waiting for data...';

  return (
    <div className="container">
      <div className="job-card">
        <div className="detail-panel-content">
          <div className="job-header">
            <div>
              <div className="job-title">Extracting Job Data...</div>
              <div className="company">{extractingJob.url}</div>
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 500,
                marginBottom: '10px',
              }}
            >
              Streaming extraction in progress...
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Received {chunkCount} chunk{chunkCount !== 1 ? 's' : ''}
            </div>

            {previewText && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                {previewText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
