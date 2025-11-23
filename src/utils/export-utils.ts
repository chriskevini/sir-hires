/**
 * Document export utilities for Markdown and PDF
 */

import { markdownToHtml } from './markdown-utils';
import { escapeHtml } from './shared-utils';
import { browser } from 'wxt/browser';

export interface ExportDocument {
  title: string;
  text: string;
}

export type ToastType = 'success' | 'error' | 'info';

/**
 * Exports a document as Markdown file
 * @param doc - The document to export
 * @param onToast - Optional toast notification callback
 */
export const exportMarkdown = (
  doc: ExportDocument,
  onToast?: (message: string, type: ToastType) => void
): void => {
  if (!doc.text || !doc.text.trim()) {
    onToast?.('Document is empty. Nothing to export.', 'error');
    return;
  }

  const blob = new Blob([doc.text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;

  browser.downloads.download(
    {
      url: url,
      filename: filename,
      saveAs: true,
    },
    () => {
      if (browser.runtime.lastError) {
        console.error('Export failed:', browser.runtime.lastError);
        onToast?.(
          `Failed to export: ${browser.runtime.lastError.message}`,
          'error'
        );
      }
      URL.revokeObjectURL(url);
    }
  );
};

/**
 * Exports a document as PDF using the browser print dialog
 * @param doc - The document to export
 * @param onToast - Optional toast notification callback
 */
export const exportPDF = (
  doc: ExportDocument,
  onToast?: (message: string, type: ToastType) => void
): void => {
  if (!doc.text || !doc.text.trim()) {
    onToast?.('Document is empty. Nothing to export.', 'error');
    return;
  }

  try {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      onToast?.(
        'Failed to open print window. Please allow popups for this site.',
        'error'
      );
      return;
    }

    const htmlContent = markdownToHtml(doc.text);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHtml(doc.title)}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
          }
          h1 { font-size: 24px; margin-bottom: 10px; }
          h2 { font-size: 20px; margin-top: 20px; margin-bottom: 10px; }
          h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; }
          p { margin-bottom: 10px; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  } catch (error: any) {
    console.error('PDF export failed:', error);
    onToast?.(`Failed to export PDF: ${error.message}`, 'error');
  }
};
