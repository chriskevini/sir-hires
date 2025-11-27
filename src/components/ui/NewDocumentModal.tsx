import React from 'react';
import { Modal } from './Modal';
import { documentTemplates } from '@/tasks';
import './NewDocumentModal.css';

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Document">
      <div className="new-document-modal-body">
        <p className="new-document-description">
          Choose a template to get started:
        </p>

        {/* Blank template - full width at top */}
        <button
          className="template-option template-option-blank"
          onClick={() => handleSelect('blank')}
        >
          <span className="template-label">Blank</span>
          <span className="template-preview template-preview-empty">
            Start with an empty document
          </span>
        </button>

        {/* Resume and Cover Letter - side by side */}
        <div className="template-options-row">
          <button
            className="template-option"
            onClick={() => handleSelect('tailoredResume')}
          >
            <span className="template-label">Resume</span>
            <pre className="template-preview">
              {documentTemplates.tailoredResume.trim()}
            </pre>
          </button>

          <button
            className="template-option"
            onClick={() => handleSelect('coverLetter')}
          >
            <span className="template-label">Cover Letter</span>
            <pre className="template-preview">
              {documentTemplates.coverLetter.trim()}
            </pre>
          </button>
        </div>
      </div>
    </Modal>
  );
};
