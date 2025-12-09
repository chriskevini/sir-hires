import { useEffect, useState } from 'react';
import {
  customDocumentTemplatesStorage,
  CustomDocumentTemplate,
} from '@/utils/storage';

export function useCustomDocumentTemplates() {
  const [templates, setTemplates] = useState<
    Record<string, CustomDocumentTemplate>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const stored = await customDocumentTemplatesStorage.getValue();
        setTemplates(stored);
      } catch (err) {
        console.error('Failed to load custom templates:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();

    // Watch for changes (from other tabs/windows)
    const unwatch = customDocumentTemplatesStorage.watch((newValue) => {
      if (newValue) {
        setTemplates(newValue);
      }
    });

    return unwatch;
  }, []);

  // Add template
  const addTemplate = async (
    name: string,
    content: string
  ): Promise<string> => {
    const id = `custom_${Date.now()}`;
    const now = new Date().toISOString();

    const newTemplate: CustomDocumentTemplate = {
      id,
      name: name.trim(),
      content: content.trim(),
      createdAt: now,
    };

    const updated = { ...templates, [id]: newTemplate };
    await customDocumentTemplatesStorage.setValue(updated);
    setTemplates(updated);

    return id;
  };

  // Delete template
  const deleteTemplate = async (id: string): Promise<void> => {
    const updated = { ...templates };
    delete updated[id];
    await customDocumentTemplatesStorage.setValue(updated);
    setTemplates(updated);
  };

  // Get sorted array (custom templates newest first)
  const sortedTemplates = Object.values(templates).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    templates,
    sortedTemplates,
    addTemplate,
    deleteTemplate,
    isLoading,
    error,
  };
}
