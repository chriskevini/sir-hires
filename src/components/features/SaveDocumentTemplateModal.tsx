import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/input';
import { useCustomDocumentTemplates } from '@/hooks/useCustomDocumentTemplates';

interface SaveDocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (name: string) => Promise<void>;
}

export const SaveDocumentTemplateModal: React.FC<
  SaveDocumentTemplateModalProps
> = ({ isOpen, onClose, content, onSave }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { templates } = useCustomDocumentTemplates();

  // Validation: Check name uniqueness
  const validateName = (value: string): boolean => {
    const trimmed = value.trim();

    if (!trimmed) {
      setError('Template name is required');
      return false;
    }

    const isDuplicate = Object.values(templates).some(
      (t) => t.name?.toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setError('A template with this name already exists');
      return false;
    }

    setError('');
    return true;
  };

  const handleSave = async () => {
    if (!validateName(name)) return;

    setIsSaving(true);
    try {
      await onSave(name);
      setName('');
      setError('');
      onClose();
    } catch (err) {
      console.error('Failed to save template:', err);
      setError('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Save as Template">
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Template Name
          </label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) validateName(e.target.value);
            }}
            placeholder="e.g., My Tech Resume"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
