import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/Modal';
import { X } from 'lucide-react';
import { markdownToHtml } from '@/utils/markdown-utils';
import {
  PDF_STYLES,
  generateSampleContent,
  getPDFStyleCSS,
  type PDFStyle,
  type PDFStyleMetadata,
} from '@/utils/pdf-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PDFStylePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent: string;
  onSelectStyle: (style: PDFStyle) => void;
}

export const PDFStylePreviewModal: React.FC<PDFStylePreviewModalProps> = ({
  isOpen,
  onClose,
  documentContent,
  onSelectStyle,
}) => {
  // Generate sample content for one page
  const sampleContent = useMemo(
    () => generateSampleContent(documentContent),
    [documentContent]
  );

  // Convert to HTML once
  const htmlContent = useMemo(
    () => markdownToHtml(sampleContent),
    [sampleContent]
  );

  const handleStyleClick = (style: PDFStyle) => {
    onSelectStyle(style);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-6xl max-h-[90vh]"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Choose PDF Style</DialogTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogClose asChild>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close</TooltipContent>
          </Tooltip>
        </DialogHeader>

        <div className="overflow-x-auto p-6">
          <div className="flex gap-8 justify-center">
            {PDF_STYLES.map((styleInfo) => (
              <StylePreviewCard
                key={styleInfo.id}
                style={styleInfo}
                htmlContent={htmlContent}
                onClick={() => handleStyleClick(styleInfo.id)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface StylePreviewCardProps {
  style: PDFStyleMetadata;
  htmlContent: string;
  onClick: () => void;
}

const StylePreviewCard: React.FC<StylePreviewCardProps> = ({
  style,
  htmlContent,
  onClick,
}) => {
  // Generate unique ID for scoped styles
  const containerId = `preview-${style.id}`;

  // US Letter dimensions at 96dpi: 8.5" × 11" = 816px × 1056px
  // Scale to fit: 0.5 scale = 408px × 528px (fits nicely in modal)
  const scale = 0.5;
  const fullPageWidth = 816; // 8.5in at 96dpi
  const fullPageHeight = 1056; // 11in at 96dpi
  const displayWidth = Math.round(fullPageWidth * scale);
  const displayHeight = Math.round(fullPageHeight * scale);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 border-2 border-border rounded-lg hover:border-primary hover:shadow-lg transition-all cursor-pointer text-left group min-w-[440px] flex-shrink-0"
    >
      {/* Style name label */}
      <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
        {style.name}
      </div>

      {/* Preview wrapper - scaled down to fit */}
      <div
        className="preview-wrapper"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          overflow: 'hidden',
        }}
      >
        {/* Full-size page (will be scaled down) */}
        <div
          id={containerId}
          className="preview-container shadow-lg overflow-hidden relative"
          style={{
            width: `${fullPageWidth}px`,
            height: `${fullPageHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundColor: '#ffffff',
            color: '#2d2d2d',
          }}
        >
          {/* Scoped styles for this preview */}
          <style>{`
            /* Apply base styles to container */
            #${containerId} { 
              ${getPDFStyleCSS(style.id)}
            }
            
            /* Override HR styling specifically for Modern style */
            ${
              style.id === 'modern'
                ? `
              #${containerId} h1 + p + hr:first-of-type,
              #${containerId} h1 + hr:first-of-type {
                border: none !important;
                background-color: #2563eb !important;
                margin: 0.5em 0 1.5em 0 !important;
                height: 3px !important;
                visibility: visible !important;
                display: block !important;
              }
            `
                : ''
            }
            
            /* Force light theme colors */
            #${containerId} {
              background-color: #ffffff !important;
              color: #2d2d2d !important;
            }
          `}</style>

          {/* Page content with proper padding (0.8in = 76.8px at 96dpi) */}
          <div
            className="preview-content overflow-hidden"
            style={{
              padding: '76.8px', // 0.8in margins at 96dpi
              height: '100%',
              width: '100%',
              backgroundColor: '#ffffff',
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      </div>
    </button>
  );
};
