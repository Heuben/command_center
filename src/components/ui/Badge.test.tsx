/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DutyBadge } from './Badge';

describe('DutyBadge', () => {
  it('renders the translated duty state', () => {
    render(<DutyBadge availability="on_duty" />);
    expect(screen.getByText('On Duty')).toBeInTheDocument();
  });
});
