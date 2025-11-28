import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary - Purple accent (main CTA)
        primary: 'bg-[#9c27b0] text-white hover:bg-[#7b1fa2] border-none',
        // Secondary - Grey outline (cancel, back)
        secondary:
          'bg-transparent text-[#666] border border-[#dadce0] hover:bg-[#f5f5f5] hover:border-[#c0c0c0]',
        // Danger - Red (delete, destructive actions)
        danger: 'bg-[#d93025] text-white hover:bg-[#c5221f] border-none',
        // Subtle - No background, grey text (dismiss, close)
        subtle:
          'bg-transparent border-none text-[#666] hover:text-[#333] px-2 py-1',
        // Link - Blue text, no background (inline actions)
        link: 'bg-transparent border-none text-[#1a73e8] hover:text-[#1557b0] hover:underline px-2 py-1',
        // Ghost - Transparent, fully controlled by parent CSS
        ghost: 'bg-transparent border-none cursor-pointer',
      },
      size: {
        sm: 'h-8 px-3 py-1.5 text-xs',
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

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'subtle'
  | 'link'
  | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
