/**
 * Hook for managing document metadata and initialization
 * Extracts document-related logic from DraftingView
 */

import { useCallback, useMemo } from 'react';
import {
  defaultDocuments,
  documentTemplates,
} from '@/utils/document-templates';
import { formatSaveTime } from '@/utils/date-utils';
import type { DocumentTemplateKey } from '@/components/ui/NewDocumentModal';

interface Document {
  title: string;
  text: string;
  lastEdited: string | null;
  order: number;
}

interface JobWithDocuments {
  documents?: Record<string, Document>;
}

interface UseDocumentManagerProps {
  job: JobWithDocuments;
  jobId: string;
  parsedJob: {
    jobTitle?: string;
    company?: string;
  };
  onAddDocument?: (
    jobId: string,
    documentKey: string,
    document: { title: string; text: string; order: number }
  ) => void;
  onDeleteDocument?: (jobId: string, documentKey: string) => void;
}

interface UseDocumentManagerReturn {
  documentKeys: string[];
  getDocument: (key: string) => Document;
  getInitialSaveStatus: (doc: Document) => string;
  addDocument: (templateKey: DocumentTemplateKey) => string;
  deleteDocument: (documentKey: string) => void;
}

/**
 * Custom hook for document management
 * Handles document sorting, status formatting, and CRUD operations
 */
export const useDocumentManager = ({
  job,
  jobId,
  parsedJob,
  onAddDocument,
  onDeleteDocument,
}: UseDocumentManagerProps): UseDocumentManagerReturn => {
  /**
   * Get sorted document keys by order
   * Returns empty array if no documents exist
   * Memoized to prevent unnecessary re-renders
   */
  const documentKeys = useMemo((): string[] => {
    if (!job.documents) {
      return [];
    }

    return Object.keys(job.documents).sort((a, b) => {
      const orderA = job.documents![a]?.order ?? 999;
      const orderB = job.documents![b]?.order ?? 999;
      return orderA - orderB;
    });
  }, [job.documents]);

  /**
   * Get document with fallback to defaults
   * Creates a minimal document structure if not found
   * Memoized with useCallback to maintain stable reference
   */
  const getDocument = useCallback(
    (documentKey: string): Document => {
      if (job.documents?.[documentKey]) {
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
    },
    [job.documents, parsedJob.jobTitle, parsedJob.company]
  );

  /**
   * Format initial save status from document metadata
   * Returns human-readable last edited time
   * Memoized with useCallback to maintain stable reference
   */
  const getInitialSaveStatus = useCallback((doc: Document): string => {
    if (!doc.lastEdited) {
      return 'No changes yet';
    }
    const lastEditedDate = new Date(doc.lastEdited);
    return `Last saved ${formatSaveTime(lastEditedDate)}`;
  }, []);

  /**
   * Add a new document from a template
   * Returns the unique key for the new document
   */
  const addDocument = useCallback(
    (templateKey: DocumentTemplateKey): string => {
      // Generate unique key with timestamp
      const newKey = `doc_${Date.now()}`;

      // Get template config and content
      const config = defaultDocuments[templateKey] || defaultDocuments.blank;
      const templateContent =
        documentTemplates[templateKey as keyof typeof documentTemplates] || '';

      // Calculate order (add to end)
      const existingDocs = job.documents || {};
      const docOrders = Object.values(existingDocs).map((d) => d.order);
      const maxOrder = docOrders.length > 0 ? Math.max(...docOrders) : -1;

      // Create new document (only pass fields the save handler expects)
      const newDocument = {
        title: config.defaultTitle(parsedJob.jobTitle, parsedJob.company),
        text: templateContent,
        order: maxOrder + 1,
      };

      // Save the document
      if (onAddDocument) {
        onAddDocument(jobId, newKey, newDocument);
      }

      return newKey;
    },
    [job.documents, jobId, onAddDocument, parsedJob.jobTitle, parsedJob.company]
  );

  /**
   * Delete a document by key
   */
  const deleteDocument = useCallback(
    (documentKey: string): void => {
      if (onDeleteDocument) {
        onDeleteDocument(jobId, documentKey);
      }
    },
    [jobId, onDeleteDocument]
  );

  return {
    documentKeys,
    getDocument,
    getInitialSaveStatus,
    addDocument,
    deleteDocument,
  };
};
