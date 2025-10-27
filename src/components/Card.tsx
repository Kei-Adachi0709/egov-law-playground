import { forwardRef, type PropsWithChildren, type ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

import { Stack } from './Stack';

interface CardProps extends Omit<HTMLMotionProps<'section'>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Card = forwardRef<HTMLElement, PropsWithChildren<CardProps>>(
  (
    {
      title,
      actions,
      className = '',
      contentClassName = 'px-6 py-5',
      children,
      initial,
      animate,
      exit,
      transition,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = !prefersReducedMotion;

    const resolvedInitial = shouldAnimate ? initial ?? { opacity: 0, y: 12 } : initial;
    const resolvedAnimate = shouldAnimate ? animate ?? { opacity: 1, y: 0 } : animate;
    const resolvedExit = shouldAnimate ? exit ?? { opacity: 0, y: -12 } : exit;
    const resolvedTransition = shouldAnimate
      ? transition ?? { type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }
      : transition;

    return (
      <motion.section
        ref={ref}
        className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}
        initial={resolvedInitial}
        animate={resolvedAnimate}
        exit={resolvedExit}
        transition={resolvedTransition}
        {...rest}
      >
        {(title || actions) && (
          <header className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <Stack direction="row" align="center" justify="between" className="gap-3">
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</div>
              {actions}
            </Stack>
          </header>
        )}
        <div className={`${contentClassName} text-slate-700 dark:text-slate-200`}>{children}</div>
      </motion.section>
    );
  }
);

Card.displayName = 'Card';
