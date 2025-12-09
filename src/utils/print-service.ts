/**
 * Print service for browser extensions
 * Provides print functionality without opening new windows using hidden iframe
 */

export interface PrintOptions {
  html: string;
  css?: string;
  title?: string;
  removeAfterPrint?: boolean;
}

/**
 * Print service using hidden iframe approach
 * Allows printing custom HTML/CSS without opening new windows
 */
export class PrintService {
  private static instance: PrintService;

  static getInstance(): PrintService {
    if (!PrintService.instance) {
      PrintService.instance = new PrintService();
    }
    return PrintService.instance;
  }

  /**
   * Print custom HTML content using hidden iframe
   * @param options - Print options including HTML content, CSS, and title
   * @returns Promise that resolves when printing is complete
   */
  async printContent(options: PrintOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: 0;
          height: 0;
          visibility: hidden;
          border: none;
        `;

        // Set iframe title for print dialog
        if (options.title) {
          iframe.title = options.title;
        }

        document.body.appendChild(iframe);

        iframe.onload = () => {
          try {
            const doc =
              iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) {
              throw new Error('Cannot access iframe document');
            }

            // Write content to iframe
            doc.open();
            doc.write(this.createPrintDocument(options));
            doc.close();

            // Allow content to render before printing
            setTimeout(() => {
              iframe.contentWindow?.print();

              // Cleanup after print dialog closes
              if (options.removeAfterPrint !== false) {
                setTimeout(() => {
                  document.body.removeChild(iframe);
                  resolve();
                }, 1000);
              } else {
                resolve();
              }
            }, 250);
          } catch (error) {
            document.body.removeChild(iframe);
            reject(error);
          }
        };

        iframe.onerror = () => {
          document.body.removeChild(iframe);
          reject(new Error('Failed to load iframe'));
        };

        // Use about:blank to avoid CSP issues
        iframe.src = 'about:blank';
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create complete HTML document for printing
   * @param options - Print options
   * @returns Complete HTML document string
   */
  private createPrintDocument(options: PrintOptions): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${this.escapeHtml(options.title || 'Print Document')}</title>
          <style>
            ${this.getBasePrintCSS()}
            ${options.css || ''}
          </style>
        </head>
        <body>
          ${options.html}
        </body>
      </html>
    `;
  }

  /**
   * Get base CSS for print documents
   * @returns Base CSS string
   */
  private getBasePrintCSS(): string {
    return `
      @media print {
        body { 
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
          line-height: 1.4;
          color: #000;
          background: #fff;
        }
        @page { 
          margin: 0.5in;
          size: letter portrait;
        }
        * { 
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        h1, h2, h3, h4, h5, h6 { 
          page-break-after: avoid;
          color: #000;
        }
        p, blockquote, ul, ol, table { 
          page-break-inside: avoid;
        }
        pre {
          page-break-inside: avoid;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        img { 
          max-width: 100%;
          height: auto;
          page-break-inside: avoid;
        }
      }
    `;
  }

  /**
   * Escape HTML to prevent XSS
   * @param str - String to escape
   * @returns Escaped string
   */
  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
