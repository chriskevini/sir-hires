import React from 'react';
import { statusStyles } from '@/config';
import { cn } from '@/lib/utils';

interface NavigationButton {
  label: string;
  target: string;
}

interface NavigationButtonsProps {
  status: string;
  leftButton: NavigationButton | null;
  rightButtons: NavigationButton[];
  onNavigate: (targetStatus: string, direction: 'backward' | 'forward') => void;
}

/**
 * @deprecated This component is replaced by JobFooter which includes
 * integrated navigation buttons with status colors. Will be removed in a future release.
 *
 * NavigationButtons - Status progression navigation with left/right buttons
 * Used in overlay container for both ResearchingView and DraftingView
 */
export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  leftButton,
  rightButtons,
  onNavigate,
}) => {
  return (
    <div
      id="navButtonsContainer"
      className="flex justify-between items-end px-6 mb-5 z-10"
    >
      {/* Left button container */}
      <div className="flex-shrink-0 z-10 flex flex-col items-center gap-2">
        {leftButton && (
          <div
            className="flex flex-col items-center gap-2"
            style={
              {
                '--nav-color': statusStyles[leftButton.target]?.color,
              } as React.CSSProperties
            }
          >
            <span className="text-xs font-semibold text-[var(--nav-color,var(--status-researching))] uppercase tracking-wide leading-tight text-center max-w-[100px] break-words">
              {leftButton.label}
            </span>
            <button
              className={cn(
                'flex items-center justify-center bg-background',
                'border-2 border-[var(--nav-color,var(--status-researching))] rounded-full',
                'w-20 h-20 cursor-pointer transition-all duration-200',
                'shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-0',
                'hover:bg-[var(--nav-color,var(--status-researching))] hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
                'group'
              )}
              onClick={() => onNavigate(leftButton.target, 'backward')}
              data-target={leftButton.target}
              data-direction="backward"
            >
              <i
                className={cn(
                  'w-0 h-0 border-solid border-[var(--nav-color,var(--status-researching))]',
                  'border-[0_3px_3px_0] inline-block p-2.5',
                  'transition-colors duration-200',
                  'rotate-[135deg]',
                  'group-hover:border-white'
                )}
              ></i>
            </button>
          </div>
        )}
      </div>

      {/* Right button(s) container */}
      <div
        className={cn(
          'flex-shrink-0 z-10 flex flex-col items-center gap-2',
          rightButtons.length > 1 && 'gap-4'
        )}
      >
        {rightButtons.map((button, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2"
            style={
              {
                '--nav-color': statusStyles[button.target]?.color,
              } as React.CSSProperties
            }
          >
            <span className="text-xs font-semibold text-[var(--nav-color,var(--status-researching))] uppercase tracking-wide leading-tight text-center max-w-[100px] break-words">
              {button.label}
            </span>
            <button
              className={cn(
                'flex items-center justify-center bg-background',
                'border-2 border-[var(--nav-color,var(--status-researching))] rounded-full',
                'w-20 h-20 cursor-pointer transition-all duration-200',
                'shadow-[0_2px_8px_rgba(0,0,0,0.1)] p-0',
                'hover:bg-[var(--nav-color,var(--status-researching))] hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
                'group'
              )}
              onClick={() => onNavigate(button.target, 'forward')}
              data-target={button.target}
              data-direction="forward"
            >
              <i
                className={cn(
                  'w-0 h-0 border-solid border-[var(--nav-color,var(--status-researching))]',
                  'border-[0_3px_3px_0] inline-block p-2.5',
                  'transition-colors duration-200',
                  '-rotate-45',
                  'group-hover:border-white'
                )}
              ></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
