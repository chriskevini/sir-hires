/**
 * Document export utilities for Markdown and PDF
 */

import { markdownToHtml } from './markdown-utils';
import { browser } from 'wxt/browser';
import { PrintService } from './print-service';
import { getPDFStyleCSS, type PDFStyle } from './pdf-styles';

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
 * Uses hidden iframe to avoid opening new window/tab
 * @param doc - The document to export
 * @param style - The PDF style to use ('modern' or 'classic')
 * @param onToast - Optional toast notification callback
 */
export const exportPDF = async (
  doc: ExportDocument,
  style: PDFStyle,
  onToast?: (message: string, type: ToastType) => void
): Promise<void> => {
  if (!doc.text || !doc.text.trim()) {
    onToast?.('Document is empty. Nothing to export.', 'error');
    return;
  }

  try {
    const htmlContent = markdownToHtml(doc.text);
    const printCSS = getPDFStyleCSS(style);

    const printService = PrintService.getInstance();
    await printService.printContent({
      html: htmlContent,
      css: printCSS,
      title: doc.title,
      removeAfterPrint: true,
    });
  } catch (error: unknown) {
    console.error('PDF export failed:', error);
    const err = error as Error;
    onToast?.(`Failed to export PDF: ${err.message}`, 'error');
  }
};
