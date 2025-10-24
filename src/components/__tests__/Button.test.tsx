import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders the provided label', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('allows passing attributes to the underlying button element', () => {
    render(
      <Button type="submit" data-testid="submit-button">
        Submit
      </Button>
    );

    expect(screen.getByTestId('submit-button')).toHaveAttribute('type', 'submit');
  });
});
