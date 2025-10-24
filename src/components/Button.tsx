import { forwardRef, type ButtonHTMLAttributes, type ForwardedRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = '', variant = 'primary', type = 'button', ...props },
    ref: ForwardedRef<HTMLButtonElement>
  ) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
    const variants: Record<'primary' | 'ghost', string> = {
      primary: 'bg-primary text-primary-foreground hover:bg-blue-600 focus-visible:outline-primary',
      ghost:
        'bg-transparent text-slate-900 hover:bg-slate-200/70 focus-visible:outline-slate-400 dark:text-slate-100 dark:hover:bg-slate-700/60'
    };
    const resolvedVariant = (variant ?? 'primary') as 'primary' | 'ghost';
    const composedClassName = [baseStyles, variants[resolvedVariant], className]
      .filter(Boolean)
      .join(' ');

    return <button ref={ref} type={type} className={composedClassName} {...props} />;
  }
);

Button.displayName = 'Button';
