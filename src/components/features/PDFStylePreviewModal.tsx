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
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
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

        <div className="grid grid-cols-2 gap-8 p-6">
          {PDF_STYLES.map((styleInfo) => (
            <StylePreviewCard
              key={styleInfo.id}
              style={styleInfo}
              htmlContent={htmlContent}
              onClick={() => handleStyleClick(styleInfo.id)}
            />
          ))}
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

  // US Letter aspect ratio: 8.5" x 11" = 0.773
  // With 0.8in margins on all sides: actual content area is 6.9" x 9.4" = 0.734
  // Target height 600px -> width = 600 * 0.773 = 464px
  const previewHeight = 600;
  const previewWidth = Math.round(previewHeight * 0.773);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 border-2 border-border rounded-lg hover:border-primary hover:shadow-lg transition-all cursor-pointer text-left group"
    >
      {/* Style name label */}
      <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
        {style.name}
      </div>

      {/* Preview - mimics printed page with exact aspect ratio */}
      <div
        className="preview-container bg-white shadow-lg overflow-hidden relative"
        style={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
        }}
      >
        {/* Page content with proper padding (0.8in = 76.8px at 96dpi) */}
        <div
          id={containerId}
          className="preview-content overflow-hidden"
          style={{
            padding: '76.8px', // 0.8in margins at 96dpi
            height: '100%',
            width: '100%',
          }}
        >
          {/* Scoped styles for this preview */}
          <style>{`
            #${containerId} * { 
              ${getPDFStyleCSS(style.id)}
            }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
      </div>
    </button>
  );
};
