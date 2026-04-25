import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import SkillProcResolution from './SkillProcResolution';

describe('SkillProcResolution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('renders proc metadata and reveals outcome details', () => {
    render(
      <SkillProcResolution
        data={{
          title: 'Precision Maneuvering',
          officerName: 'Lt. "Slick" Jones',
          station: 'helm',
          actionName: 'Evasive Pattern',
          result: {
            dieType: 'd6',
            roll: 6,
            successThreshold: 4,
            maxFace: 6,
            isSuccess: true,
            isCritical: true,
          },
          standardEffect: '+3 Base Evasion this round.',
          criticalEffect: '+3 Base Evasion and 2 Stress refunded.',
        }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Precision Maneuvering')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('Lt. "Slick" Jones')).toBeInTheDocument();
    expect(screen.getByText('Evasive Pattern')).toBeInTheDocument();
    expect(screen.queryByText('GATED')).not.toBeInTheDocument();

    expect(screen.queryByText('+3 Base Evasion this round.')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('+3 Base Evasion this round.')).toBeInTheDocument();
    expect(screen.getByText('+3 Base Evasion and 2 Stress refunded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
  });

  it('shows gated critical text for rookie dice', () => {
    render(
      <SkillProcResolution
        data={{
          title: 'Miracle Work',
          officerName: 'Chief O\'Bannon',
          station: 'engineering',
          actionName: 'Damage Control',
          result: {
            dieType: 'd4',
            roll: 4,
            successThreshold: 4,
            maxFace: 4,
            isSuccess: true,
            isCritical: false,
          },
          standardEffect: 'Repair 2 Hull instead of 1.',
          failureEffect: 'Base action resolves at 1 Hull repaired.',
          criticalEffect: 'Repair 2 Hull and gain +1 Command Token immediately.',
        }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('GATED')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Not triggered.')).toBeInTheDocument();
  });
});
