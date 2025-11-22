/**
 * Hook for managing document metadata and initialization
 * Extracts document-related logic from DraftingView
 */

import { useEffect } from 'react';
import { defaultDocuments } from '@/utils/document-config';
import { formatSaveTime } from '@/utils/date-utils';
import { documentTemplates } from '../config';

interface Document {
  title: string;
  text: string;
  lastEdited: string | null;
  order: number;
}

interface Job {
  documents?: Record<string, Document>;
}

interface UseDocumentManagerProps {
  job: Job;
  jobIndex: number;
  parsedJob: {
    jobTitle?: string;
    company?: string;
  };
  onInitializeDocuments: (
    index: number,
    documents: Record<string, Document>
  ) => void;
}

interface UseDocumentManagerReturn {
  documentKeys: string[];
  getDocument: (key: string) => Document;
  getInitialSaveStatus: (doc: Document) => string;
}

/**
 * Custom hook for document management
 * Handles document initialization, sorting, and status formatting
 */
export const useDocumentManager = ({
  job,
  jobIndex,
  parsedJob,
  onInitializeDocuments,
}: UseDocumentManagerProps): UseDocumentManagerReturn => {
  /**
   * Get sorted document keys by order
   * Falls back to default keys if no documents exist
   */
  const getDocumentKeys = (): string[] => {
    if (!job.documents) {
      return ['tailoredResume', 'coverLetter'];
    }

    return Object.keys(job.documents).sort((a, b) => {
      const orderA = job.documents![a]?.order ?? 999;
      const orderB = job.documents![b]?.order ?? 999;
      return orderA - orderB;
    });
  };

  /**
   * Get document with fallback to defaults
   * Creates a minimal document structure if not found
   */
  const getDocument = (documentKey: string): Document => {
    if (!job.documents) {
      return {
        title:
          defaultDocuments[documentKey]?.defaultTitle(
            parsedJob.jobTitle,
            parsedJob.company
          ) || 'Untitled',
        text: '',
        lastEdited: null,
        order: defaultDocuments[documentKey]?.order || 0,
      };
    }

    if (job.documents[documentKey]) {
      return job.documents[documentKey];
    }

    const config = defaultDocuments[documentKey];
    return {
      title: config
        ? config.defaultTitle(parsedJob.jobTitle, parsedJob.company)
        : 'Untitled Document',
      text: '',
      lastEdited: null,
      order: config ? config.order : 0,
    };
  };

  /**
   * Format initial save status from document metadata
   * Returns human-readable last edited time
   */
  const getInitialSaveStatus = (doc: Document): string => {
    if (!doc.lastEdited) {
      return 'No changes yet';
    }
    const lastEditedDate = new Date(doc.lastEdited);
    return `Last saved ${formatSaveTime(lastEditedDate)}`;
  };

  /**
   * Initialize documents with templates if they don't exist
   * Runs once on mount
   */
  useEffect(() => {
    if (!job.documents) {
      const newDocuments = {
        tailoredResume: {
          title: defaultDocuments.tailoredResume.defaultTitle(
            parsedJob.jobTitle,
            parsedJob.company
          ),
          text: documentTemplates.tailoredResume,
          lastEdited: null,
          order: 0,
        },
        coverLetter: {
          title: defaultDocuments.coverLetter.defaultTitle(
            parsedJob.jobTitle,
            parsedJob.company
          ),
          text: documentTemplates.coverLetter,
          lastEdited: null,
          order: 1,
        },
      };
      onInitializeDocuments(jobIndex, newDocuments);
    }
  }, []); // Empty deps - only run on mount

  return {
    documentKeys: getDocumentKeys(),
    getDocument,
    getInitialSaveStatus,
  };
};
