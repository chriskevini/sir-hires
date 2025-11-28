/**
 * Shared SVG icons for UI components
 * Consistent style: viewBox="0 0 16 16", stroke-based, currentColor
 */

// Chevron icons for toggles/navigation
export const ChevronLeftIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M10 3 L5 8 L10 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronRightIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M6 3 L11 8 L6 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronUpIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M3 10 L8 5 L13 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronDownIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M3 6 L8 11 L13 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Arrow icons for sort direction
export const ArrowUpIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M8 3 L8 13 M4 7 L8 3 L12 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ArrowDownIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M8 3 L8 13 M4 9 L8 13 L12 9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Action icons
export const ExtractIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    {/* Download tray */}
    <path
      d="M3 10 L3 13 L13 13 L13 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Arrow down */}
    <path
      d="M8 2 L8 9 M5 6 L8 9 L11 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SpinnerIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M8 2 A6 6 0 1 1 2 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const CloseIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M4 4 L12 12 M12 4 L4 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const TrashIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    {/* Lid */}
    <path
      d="M3 4 L13 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6 4 L6 2.5 L10 2.5 L10 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Can body */}
    <path
      d="M4 4 L5 13.5 L11 13.5 L12 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const MaximizeIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    {/* Arrow pointing to top-right corner */}
    <path
      d="M5 11 L11 5 M7 5 L11 5 L11 9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Window frame */}
    <rect
      x="2"
      y="2"
      width="12"
      height="12"
      rx="1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

// Sort field icons
export const CalendarIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <rect
      x="2"
      y="3"
      width="12"
      height="11"
      rx="1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="2"
      y1="6"
      x2="14"
      y2="6"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="5"
      y1="1"
      x2="5"
      y2="4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="11"
      y1="1"
      x2="11"
      y2="4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const BuildingIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <rect
      x="3"
      y="4"
      width="10"
      height="11"
      rx="1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="6"
      y1="7"
      x2="6"
      y2="7.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="10"
      y1="7"
      x2="10"
      y2="7.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="6"
      y1="10"
      x2="6"
      y2="10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="10"
      y1="10"
      x2="10"
      y2="10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6 15 L6 12 L10 12 L10 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

export const DocumentIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <rect
      x="2"
      y="2"
      width="12"
      height="12"
      rx="1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="4"
      y1="5"
      x2="12"
      y2="5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="4"
      y1="8"
      x2="10"
      y2="8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="4"
      y1="11"
      x2="8"
      y2="11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Profile/User icon
export const ProfileIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    {/* Head */}
    <circle
      cx="8"
      cy="5"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Body */}
    <path
      d="M2 14 C2 10 5 9 8 9 C11 9 14 10 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Diagonal arrow pointing up-left (for EmptyState)
export const ArrowUpLeftIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="icon-svg">
    <path
      d="M11 11 L5 5 M5 10 L5 5 L10 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
