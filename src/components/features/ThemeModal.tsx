/**
 * ThemeModal
 *
 * Modal for selecting theme mode (light/dark/system) and color theme.
 */

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import type { ThemeMode, ColorTheme } from '@/utils/storage';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Mode option for the mode selector
 */
interface ModeOption {
  value: ThemeMode;
  label: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/**
 * Color theme option with display info
 */
interface ColorThemeOption {
  value: ColorTheme;
  label: string;
  /** HSL color for swatch (use 500 shade for consistency) */
  swatchColor: string;
}

const COLOR_THEME_OPTIONS: ColorThemeOption[] = [
  {
    value: 'sir-hires',
    label: 'Sir Hires',
    swatchColor: 'hsl(101 31% 50%)', // Evergreen-500
  },
  {
    value: 'lancelot',
    label: 'Sir Lancelot',
    swatchColor: 'hsl(0 80% 50%)', // Crimson-500
  },
  {
    value: 'gawain',
    label: 'Sir Gawain',
    swatchColor: 'hsl(270 50% 50%)', // Royal Purple-500
  },
  {
    value: 'yvain',
    label: 'Sir Yvain',
    swatchColor: 'hsl(220 60% 48%)', // Sapphire-500
  },
];

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const { mode, colorTheme, setMode, setColorTheme } = useTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Theme">
      <div className="px-6 py-5 space-y-6">
        {/* Mode Selector */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Mode</h3>
          <div className="flex gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setMode(option.value)}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  'border',
                  mode === option.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Theme Selector */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Color</h3>
          <div className="grid grid-cols-2 gap-3">
            {COLOR_THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setColorTheme(option.value)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-md transition-colors',
                  'border',
                  colorTheme === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted'
                )}
              >
                {/* Color Swatch */}
                <span
                  className="w-5 h-5 rounded-full shrink-0 border border-border/50"
                  style={{ backgroundColor: option.swatchColor }}
                />
                {/* Theme Name */}
                <span className="text-sm font-medium text-foreground">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
