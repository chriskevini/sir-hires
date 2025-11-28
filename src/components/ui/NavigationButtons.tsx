import React from 'react';
import './NavigationButtons.css';

interface NavigationButton {
  label: string;
  target: string;
}

interface NavigationButtonsProps {
  status: string;
  leftButton: NavigationButton | null;
  rightButtons: NavigationButton[];
  onNavigate: (targetStatus: string, direction: 'backward' | 'forward') => void;
  progressConfig: Record<
    string,
    { fill: number; color: string; textColor: string }
  >;
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
  progressConfig,
}) => {
  return (
    <div id="navButtonsContainer" className="nav-buttons-container">
      {/* Left button container */}
      <div className="nav-button-container left">
        {leftButton && (
          <div
            className="nav-button-wrapper"
            style={
              {
                '--nav-color': progressConfig[leftButton.target]?.color,
              } as React.CSSProperties
            }
          >
            <span className="nav-label">{leftButton.label}</span>
            <button
              className="nav-button"
              onClick={() => onNavigate(leftButton.target, 'backward')}
              data-target={leftButton.target}
              data-direction="backward"
            >
              <i className="nav-arrow left"></i>
            </button>
          </div>
        )}
      </div>

      {/* Right button(s) container */}
      <div
        className={`nav-button-container right${rightButtons.length > 1 ? ' multiple' : ''}`}
      >
        {rightButtons.map((button, index) => (
          <div
            key={index}
            className="nav-button-wrapper"
            style={
              {
                '--nav-color': progressConfig[button.target]?.color,
              } as React.CSSProperties
            }
          >
            <span className="nav-label">{button.label}</span>
            <button
              className="nav-button"
              onClick={() => onNavigate(button.target, 'forward')}
              data-target={button.target}
              data-direction="forward"
            >
              <i className="nav-arrow right"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
