import { forwardRef, type HTMLAttributes } from 'react';

export type StackDirection = 'row' | 'column';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: StackDirection;
  gap?: string;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
}

const directionClass: Record<StackDirection, string> = {
  row: 'flex-row',
  column: 'flex-col'
};

const alignClass: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
};

const justifyClass: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
};

const resolveGap = (value?: string): string => {
  if (!value) {
    return 'gap-4';
  }
  if (value.startsWith('gap-')) {
    return value;
  }
  return `gap-${value}`;
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      direction = 'column',
      gap,
      align = 'stretch',
      justify = 'start',
      wrap = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const tokens = [
      'flex',
      directionClass[direction],
      resolveGap(gap),
      alignClass[align],
      justifyClass[justify],
      wrap ? 'flex-wrap' : 'flex-nowrap',
      className
    ];

    return <div ref={ref} className={tokens.filter(Boolean).join(' ')} {...props} />;
  }
);

Stack.displayName = 'Stack';
