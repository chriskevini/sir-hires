/**
 * Document export utilities for Markdown and PDF
 */

import { markdownToHtml } from './markdown-utils';
import { browser } from 'wxt/browser';
import { PrintService } from './print-service';

export interface ExportDocument {
  title: string;
  text: string;
}

export type ToastType = 'success' | 'error' | 'info';

/**
 * Detects if document has a letterhead (name, address, contact info, hr separator)
 * Pattern: # **[Name]** \n [Address] \n [Phone] | [Email] \n \n ---
 * @param text - Markdown text to check
 * @returns true if letterhead detected in first 10 lines
 */
function hasLetterhead(text: string): boolean {
  const lines = text.split('\n').slice(0, 10);
  const firstTenLines = lines.join('\n');

  // Look for pattern: H1 with bold, followed by hr within a few lines
  // Also check for pipe separator (contact info)
  const hasH1Bold = /^#\s+\*\*.*\*\*/m.test(firstTenLines);
  const hasHr = /^---+$/m.test(firstTenLines);
  const hasPipeSeparator = /\|/.test(firstTenLines);

  return hasH1Bold && hasHr && hasPipeSeparator;
}

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
 * @param onToast - Optional toast notification callback
 */
export const exportPDF = async (
  doc: ExportDocument,
  onToast?: (message: string, type: ToastType) => void
): Promise<void> => {
  if (!doc.text || !doc.text.trim()) {
    onToast?.('Document is empty. Nothing to export.', 'error');
    return;
  }

  try {
    const htmlContent = markdownToHtml(doc.text);
    const hasLettehead = hasLetterhead(doc.text);

    // Dynamic padding based on letterhead presence
    const bodyPadding = hasLettehead ? '0' : '20px';
    const firstElementMargin = hasLettehead ? '0' : '0';

    const printCSS = `
      /* Base Styles */
      * {
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
        line-height: 1.15;
        color: #1a1a1a;
        max-width: 100%;
        margin: 0;
        padding: ${bodyPadding};
        font-size: 12px;
      }

      /* Remove top margin from first element for letterheads */
      body > *:first-child {
        margin-top: ${firstElementMargin};
      }

      /* Typography */
      h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 12px;
        font-weight: 600;
        line-height: 1.3;
        color: #000;
      }

      h1 { font-size: 28px; }
      h2 { font-size: 22px; }
      h3 { font-size: 18px; }
      h4 { font-size: 16px; }
      h5 { font-size: 14px; }
      h6 { font-size: 13px; color: #6a737d; }

      p {
        margin-bottom: 12px;
        margin-top: 0;
      }

      /* Links */
      a {
        color: #0366d6;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      /* Lists */
      ul, ol {
        margin-top: 0;
        margin-bottom: 12px;
        padding-left: 2em;
      }

      li {
        margin-bottom: 4px;
      }

      li > p {
        margin-bottom: 4px;
      }

      /* Code */
      code {
        background-color: #f6f8fa;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        font-size: 85%;
      }

      pre {
        background-color: #f6f8fa;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        margin-bottom: 12px;
        line-height: 1.45;
      }

      pre code {
        background-color: transparent;
        padding: 0;
        font-size: 12px;
      }

      /* Blockquotes */
      blockquote {
        margin: 0 0 12px 0;
        padding: 0 1em;
        color: #6a737d;
        border-left: 4px solid #dfe2e5;
      }

      blockquote > :first-child {
        margin-top: 0;
      }

      blockquote > :last-child {
        margin-bottom: 0;
      }

      /* Tables */
      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 12px;
        font-size: 13px;
      }

      table th,
      table td {
        padding: 8px 12px;
        border: 1px solid #dfe2e5;
        text-align: left;
      }

      table th {
        background-color: #f6f8fa;
        font-weight: 600;
      }

      table tr:nth-child(even) {
        background-color: #f9f9f9;
      }

      /* Horizontal Rule */
      hr {
        height: 2px;
        padding: 0;
        margin: 24px 0;
        background-color: #e1e4e8;
        border: 0;
      }

      /* Page breaks for all HRs except the first (letterhead separator) */
      hr:not(:first-of-type) {
        page-break-after: always;
      }

      /* Images */
      img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 12px 0;
      }

      /* Print Styles */
      @media print {
        body {
          margin: 0;
          padding: ${bodyPadding};
          font-size: 12pt;
          max-width: 100%;
        }

        h1 { font-size: 20pt; page-break-after: avoid; }
        h2 { font-size: 16pt; page-break-after: avoid; }
        h3 { font-size: 14pt; page-break-after: avoid; }
        h4, h5, h6 { page-break-after: avoid; }

        p, blockquote, ul, ol, table {
          page-break-inside: avoid;
        }

        pre {
          page-break-inside: avoid;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        a {
          color: #000;
          text-decoration: underline;
        }

        a[href^="http"]:after {
          content: " (" attr(href) ")";
          font-size: 90%;
          color: #666;
        }

        /* First HR (letterhead separator) stays visible */
        hr:first-of-type {
          visibility: visible;
          height: 2px;
          margin: 24px 0;
          background-color: #e1e4e8;
          page-break-after: auto;
        }

        /* Subsequent HRs become invisible page breaks */
        hr:not(:first-of-type) {
          page-break-after: always;
          visibility: hidden;
          margin: 0;
          height: 0;
        }

        /* Page margins - portrait by default, 1 inch all around */
        @page {
          margin: 1in;
          size: letter portrait;
        }
      }
    `;

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
