import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { documentTemplates } from '@/tasks';

export type DocumentTemplateKey = 'blank' | 'tailoredResume' | 'coverLetter';

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
  const handleSelect = (key: DocumentTemplateKey) => {
    onSelectTemplate(key);
    onClose();
  };

  // Shared styles for template option buttons
  const templateOptionClasses =
    'flex flex-col items-start p-3 px-4 border border-gray-200 rounded-lg bg-white cursor-pointer transition-all duration-150 text-left shadow-sm hover:border-blue-500 hover:bg-blue-50 hover:shadow-md active:bg-blue-100';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Document">
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        <p className="m-0 mb-4 text-gray-500 text-sm">
          Choose a template to get started:
        </p>

        {/* Blank template - full width at top */}
        <Button
          variant="ghost"
          className={`${templateOptionClasses} w-full`}
          onClick={() => handleSelect('blank')}
        >
          <span className="font-semibold text-sm text-gray-700 mb-2">
            Blank
          </span>
          <span className="italic text-gray-400 text-xs">
            Start with an empty document
          </span>
        </Button>

        {/* Resume and Cover Letter - side by side */}
        <div className="flex gap-3 mt-3">
          <Button
            variant="ghost"
            className={`${templateOptionClasses} flex-1 min-w-0`}
            onClick={() => handleSelect('tailoredResume')}
          >
            <span className="font-semibold text-sm text-gray-700 mb-2">
              Resume
            </span>
            <pre className="font-mono text-xs leading-snug text-gray-600 whitespace-pre-wrap break-words m-0 w-full">
              {documentTemplates.tailoredResume.trim()}
            </pre>
          </Button>

          <Button
            variant="ghost"
            className={`${templateOptionClasses} flex-1 min-w-0`}
            onClick={() => handleSelect('coverLetter')}
          >
            <span className="font-semibold text-sm text-gray-700 mb-2">
              Cover Letter
            </span>
            <pre className="font-mono text-xs leading-snug text-gray-600 whitespace-pre-wrap break-words m-0 w-full">
              {documentTemplates.coverLetter.trim()}
            </pre>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
