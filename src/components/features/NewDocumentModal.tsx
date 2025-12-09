import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { synthesis } from '@/tasks';
import { useCustomDocumentTemplates } from '@/hooks/useCustomDocumentTemplates';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button-variants';

export type BuiltInTemplateKey = 'blank' | 'tailoredResume' | 'coverLetter';
export type CustomTemplateKey = `custom_${string}`;
export type DocumentTemplateKey = BuiltInTemplateKey | CustomTemplateKey;

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateKey: DocumentTemplateKey) => void;
}

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const { sortedTemplates, deleteTemplate } = useCustomDocumentTemplates();
  const {
    dialogState: confirmState,
    confirm,
    closeDialog: closeConfirm,
  } = useConfirmDialog();

  const handleSelect = (key: DocumentTemplateKey) => {
    onSelectTemplate(key);
    onClose();
  };

  const handleDelete = async (
    e: React.MouseEvent,
    templateId: string,
    templateName: string
  ): Promise<void> => {
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Delete Template',
      description: `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    });

    if (confirmed) {
      try {
        await deleteTemplate(templateId);
      } catch (error) {
        console.error('Failed to delete template:', error);
        // Show error feedback to user (toast would be ideal)
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  // Shared styles for template option buttons
  const templateOptionClasses =
    'flex flex-col items-start px-4 py-2 border border-border rounded-lg bg-background cursor-pointer transition-all duration-150 text-left shadow-sm hover:border-primary hover:bg-primary/10 hover:shadow-md active:bg-primary/20';

  // Build combined list: custom templates first (newest first), then built-ins
  const builtInTemplates: Array<{
    key: BuiltInTemplateKey;
    label: string;
    content: string;
  }> = [
    {
      key: 'tailoredResume',
      label: 'Resume',
      content: synthesis.templates.tailoredResume.trim(),
    },
    {
      key: 'coverLetter',
      label: 'Cover Letter',
      content: synthesis.templates.coverLetter.trim(),
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Document">
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {/* Blank template - full width at top */}
        <Button
          variant="ghost"
          className={`${templateOptionClasses} w-full`}
          onClick={() => handleSelect('blank')}
        >
          <span className="font-semibold text-sm text-foreground mb-2">
            Blank
          </span>
          <span className="italic text-muted-foreground text-sm">
            Start with an empty document
          </span>
        </Button>

        {/* Masonry layout: custom templates first, then built-ins */}
        <div className="columns-2 gap-3 mt-3">
          {/* Custom templates (newest first) */}
          {sortedTemplates.map((template) => (
            <div
              key={template.id}
              className="relative group mb-3 break-inside-avoid"
            >
              <Button
                variant="ghost"
                className={`${templateOptionClasses} w-full h-auto`}
                onClick={() => handleSelect(template.id as CustomTemplateKey)}
              >
                <span className="font-semibold text-sm text-foreground mb-2">
                  {template.name}
                </span>
                <pre className="font-mono text-xs leading-snug text-muted-foreground whitespace-pre-wrap break-words m-0 w-full">
                  {template.content}
                </pre>
              </Button>
              {/* Delete button (hover) - follows JobCard pattern */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, template.id, template.name)}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-muted-foreground text-background text-sm leading-none flex items-center justify-center opacity-0 group-hover:opacity-70 hover:bg-destructive hover:opacity-100 active:scale-90 transition-all duration-200 cursor-pointer border-none"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  Delete this template
                </TooltipContent>
              </Tooltip>
            </div>
          ))}

          {/* Built-in templates */}
          {builtInTemplates.map((template) => (
            <div key={template.key} className="mb-3 break-inside-avoid">
              <Button
                variant="ghost"
                className={`${templateOptionClasses} w-full h-auto`}
                onClick={() => handleSelect(template.key)}
              >
                <span className="font-semibold text-sm text-foreground mb-2">
                  {template.label}
                </span>
                <pre className="font-mono text-xs leading-snug text-muted-foreground whitespace-pre-wrap break-words m-0 w-full">
                  {template.content}
                </pre>
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmState.isOpen}
        onOpenChange={(open) => !open && closeConfirm()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirm}>
              {confirmState.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmState.onConfirm}
              className={
                confirmState.variant === 'destructive'
                  ? buttonVariants({ variant: 'danger' })
                  : undefined
              }
            >
              {confirmState.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Modal>
  );
};
