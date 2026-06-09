import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from '../drawer';

describe('Drawer (a11y)', () => {
  it('is a labelled modal dialog when open', () => {
    render(
      <Drawer open title="Edit slot" onClose={() => {}}>
        <input aria-label="field" />
      </Drawer>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // accessible name comes from the title heading via aria-labelledby
    expect(dialog).toHaveAccessibleName('Edit slot');
  });

  it('renders nothing when closed', () => {
    render(
      <Drawer open={false} title="Edit slot" onClose={() => {}}>
        <input aria-label="field" />
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves focus inside on open and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Edit slot" onClose={onClose}>
        <input aria-label="field" />
      </Drawer>,
    );
    // first focusable element receives focus
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
