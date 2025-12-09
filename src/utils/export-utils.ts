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
      /* Modern Aesthetic Resume CSS */
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

      :root {
        --primary: #1a1a1a;
        --accent: #2563eb;
        --accent-light: #dbeafe;
        --text: #2d2d2d;
        --text-light: #525252;
        --bg: #ffffff;
        --border: #e2e8f0;
      }

      * {
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
        font-size: 10.5pt;
        line-height: 1.55;
        color: var(--text);
        background: var(--bg);
        max-width: 100%;
        margin: 0;
        padding: ${bodyPadding};
      }

      /* Remove top margin from first element for letterheads */
      body > *:first-child {
        margin-top: ${firstElementMargin};
      }

      /* Typography - Modern Aesthetic */
      h1 {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 32pt;
        font-weight: 700;
        color: var(--primary);
        margin: 0 0 0.3em 0;
        letter-spacing: -0.5px;
        line-height: 1.1;
        text-align: center;
      }

      /* Letterhead separator styling */
      h1 + p + hr:first-of-type,
      h1 + hr:first-of-type {
        border: 0;
        border-bottom: 3px solid var(--accent);
        margin: 0.5em 0 1.5em 0;
        height: 0;
      }

      h2 {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 13pt;
        font-weight: 600;
        color: var(--accent);
        margin: 1.8em 0 0.8em 0;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--border);
        position: relative;
        text-transform: uppercase;
        letter-spacing: 1.2px;
      }

      h2::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 50px;
        height: 3px;
        background: var(--accent);
      }

      h3 {
        font-size: 11pt;
        font-weight: 600;
        color: var(--primary);
        margin: 1.2em 0 0.3em 0;
      }

      h4 {
        font-size: 10pt;
        font-weight: 500;
        color: var(--text-light);
        margin: 0 0 0.2em 0;
        font-style: italic;
      }

      h5 {
        font-size: 10pt;
        font-weight: 500;
        color: var(--text);
        margin: 0.8em 0 0.3em 0;
      }

      h6 {
        font-size: 9.5pt;
        font-weight: 400;
        color: var(--text-light);
        margin: 0.5em 0 0.2em 0;
      }

      p {
        margin: 0.4em 0;
      }

      /* Contact info styling (first paragraph after h1) */
      h1 + p {
        text-align: center;
        font-size: 10pt;
        color: var(--text-light);
        margin: 0.8em 0 0 0;
        line-height: 1.6;
      }

      /* Links */
      a {
        color: var(--accent);
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: border 0.2s;
      }

      a:hover {
        border-bottom: 1px solid var(--accent);
      }

      /* Lists */
      ul, ol {
        margin: 0.5em 0;
        padding-left: 1.4em;
      }

      li {
        margin: 0.35em 0;
        line-height: 1.5;
      }

      li > p {
        margin: 0.2em 0;
      }

      /* Code */
      code {
        background-color: #f6f8fa;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        font-size: 85%;
        color: #d73a49;
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
        font-size: 9.5pt;
        color: var(--text);
      }

      /* Blockquotes */
      blockquote {
        margin: 0.8em 0;
        padding: 0.5em 1em;
        color: var(--text-light);
        border-left: 4px solid var(--accent);
        background: #f8fafc;
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
        margin-bottom: 1em;
        font-size: 10pt;
      }

      table th,
      table td {
        padding: 8px 12px;
        border: 1px solid var(--border);
        text-align: left;
      }

      table th {
        background-color: var(--accent-light);
        color: #1e40af;
        font-weight: 600;
      }

      table tr:nth-child(even) {
        background-color: #f8fafc;
      }

      /* Horizontal Rule - Default (letterhead separator) */
      hr {
        height: 0;
        padding: 0;
        margin: 1.5em 0;
        background-color: transparent;
        border: 0;
        border-bottom: 1px solid var(--border);
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

      /* Strong and emphasis */
      strong {
        font-weight: 600;
        color: var(--primary);
      }

      em {
        font-style: italic;
        color: var(--text);
      }

      /* Print Styles */
      @media print {
        @page {
          margin: 0.8in;
          size: letter portrait;
        }

        body {
          margin: 0;
          padding: ${bodyPadding};
          font-size: 10.5pt;
          max-width: 100%;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        h1 {
          font-size: 32pt;
          page-break-after: avoid;
        }

        h2 {
          font-size: 13pt;
          page-break-after: avoid;
        }

        h2::after {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        h3 {
          font-size: 11pt;
          page-break-after: avoid;
        }

        h4, h5, h6 {
          page-break-after: avoid;
        }

        p, blockquote, ul, ol, table {
          page-break-inside: avoid;
        }

        pre {
          page-break-inside: avoid;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        a {
          color: var(--accent);
          text-decoration: none;
        }

        a[href^="http"]:after {
          content: " (" attr(href) ")";
          font-size: 90%;
          color: var(--text-light);
        }

        /* Letterhead separator - styled accent bar */
        h1 + p + hr:first-of-type,
        h1 + hr:first-of-type {
          visibility: visible;
          border-bottom: 3px solid var(--accent);
          margin: 0.5em 0 1.5em 0;
          height: 0;
          page-break-after: auto;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Other first-level HRs that aren't letterhead separators */
        hr:first-of-type:not(h1 + p + hr):not(h1 + hr) {
          visibility: visible;
          border-bottom: 1px solid var(--border);
          height: 0;
          page-break-after: auto;
        }

        /* Subsequent HRs become invisible page breaks */
        hr:not(:first-of-type) {
          page-break-after: always;
          visibility: hidden;
          margin: 0;
          height: 0;
        }

        /* Ensure accent colors print correctly */
        h2,
        h2::after,
        a,
        table th {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
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
