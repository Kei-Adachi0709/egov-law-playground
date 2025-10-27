import { forwardRef, type ForwardedRef } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'ghost';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = '', variant = 'primary', type = 'button', transition, whileTap, ...props },
    ref: ForwardedRef<HTMLButtonElement>
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const baseStyles =
      'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60';
    const variants: Record<'primary' | 'ghost', string> = {
      primary:
        'bg-primary text-primary-foreground shadow-sm hover:bg-blue-600 dark:hover:bg-blue-500/90 focus-visible:ring-primary',
      ghost:
        'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-primary dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700/70'
    };
    const resolvedVariant = (variant ?? 'primary') as 'primary' | 'ghost';
    const composedClassName = [baseStyles, variants[resolvedVariant], className]
      .filter(Boolean)
      .join(' ');

    return (
      <motion.button
        ref={ref}
        type={type}
        className={composedClassName}
        whileTap={
          prefersReducedMotion
            ? whileTap
            : whileTap ?? { scale: 0.96 }
        }
        transition={
          prefersReducedMotion
            ? transition
            : transition ?? { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }
        }
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
