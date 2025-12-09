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
  // Generate sample content (first 30 lines)
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
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
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

        <div className="grid grid-cols-2 gap-6 p-6">
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

  return (
    <button
      onClick={onClick}
      className="flex flex-col border-2 border-border rounded-lg hover:border-primary hover:shadow-lg transition-all cursor-pointer bg-white overflow-hidden text-left"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-base text-foreground">
          {style.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {style.description}
        </p>
      </div>

      {/* Preview */}
      <div className="flex-1 p-4 bg-white overflow-hidden">
        <div
          className="preview-container border border-border rounded bg-white shadow-sm overflow-hidden relative"
          style={{
            height: '400px',
          }}
        >
          {/* Scaled preview content */}
          <div
            id={containerId}
            className="preview-content"
            style={{
              transform: 'scale(0.8)',
              transformOrigin: 'top left',
              width: '125%', // Compensate for 0.8 scale (1/0.8 = 1.25)
              height: '125%',
            }}
          >
            {/* Scoped styles for this preview */}
            <style>{`#${containerId} { ${getPDFStyleCSS(style.id)} }`}</style>
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      </div>

      {/* Select button */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <span className="text-sm font-medium text-primary">
          Select {style.name} →
        </span>
      </div>
    </button>
  );
};
