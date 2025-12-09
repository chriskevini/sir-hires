/**
 * PDF Export Style System
 *
 * Provides different styling options for PDF exports.
 * Each style includes complete CSS for rendering markdown to professional PDFs.
 */

export type PDFStyle = 'modern' | 'classic';

export interface PDFStyleMetadata {
  id: PDFStyle;
  name: string;
  description: string;
}

export const PDF_STYLES: PDFStyleMetadata[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean design with Inter font and blue accents',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional GitHub-style formatting',
  },
];

/**
 * Generate CSS for a given PDF style
 * @param style - The style to use ('modern' or 'classic')
 * @returns Complete CSS string for the style
 */
export function getPDFStyleCSS(style: PDFStyle): string {
  switch (style) {
    case 'modern':
      return getModernStyleCSS();
    case 'classic':
      return getClassicStyleCSS();
    default:
      return getModernStyleCSS();
  }
}

/**
 * Generate sample content for style preview
 * Takes first ~30 lines of document to fill 400px preview
 * @param markdown - Full markdown content
 * @returns First 30 lines of content
 */
export function generateSampleContent(markdown: string): string {
  const lines = markdown.split('\n');
  return lines.slice(0, 30).join('\n');
}

/**
 * Modern style CSS - Clean design with Inter font and blue accents
 */
function getModernStyleCSS(): string {
  return `
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
      padding: 0;
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
        padding: 0;
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
}

/**
 * Classic style CSS - Traditional GitHub-style formatting
 */
function getClassicStyleCSS(): string {
  return `
    /* Classic GitHub-Style CSS */
    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
      line-height: 1.15;
      color: #1a1a1a;
      max-width: 100%;
      margin: 0;
      padding: 0;
      font-size: 12px;
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
      @page {
        margin: 0.8in;
        size: letter portrait;
      }

      body {
        margin: 0;
        padding: 0;
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
    }
  `;
}
