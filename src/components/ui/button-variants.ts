import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        // Primary - Purple accent (main CTA)
        primary:
          'bg-primary text-primary-foreground hover:bg-primary/90 border-none',
        // Secondary - Grey outline (cancel, back)
        secondary:
          'bg-transparent text-muted-foreground border border-border hover:bg-muted hover:border-border',
        // Danger - Red (delete, destructive actions)
        danger:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none',
        // Subtle - No background, grey text (dismiss, close)
        subtle:
          'bg-transparent border-none text-muted-foreground hover:text-foreground px-2 py-1',
        // Link - Blue text, no background (inline actions)
        link: 'bg-transparent border-none text-primary hover:text-primary/80 hover:underline px-2 py-1',
        // Ghost - Transparent, fully controlled by parent CSS
        ghost: 'bg-transparent border-none',
      },
      size: {
        sm: 'h-8 px-3 py-1.5 text-sm',
        md: 'h-10 px-6 py-2.5 text-sm',
        lg: 'h-11 px-7 py-3.5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
    compoundVariants: [
      // Subtle, link, and ghost variants don't use size classes
      {
        variant: 'subtle',
        className: 'h-auto',
      },
      {
        variant: 'link',
        className: 'h-auto',
      },
      {
        variant: 'ghost',
        className: 'h-auto px-0 py-0',
      },
    ],
  }
);
