import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalOverlay from './ModalOverlay';
import { useUIStore } from '../store/useUIStore';

// Mock framer-motion so we don't have to deal with animation delays in JSDOM
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ModalOverlay', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  it('renders critical card modal when queued', async () => {
    const mockCard = {
      id: 'test-crit',
      name: 'Test Critical Hit Render',
      effect: 'This is a test effect to verify it renders',
      isRepaired: false
    };

    render(<ModalOverlay />);

    act(() => {
      useUIStore.getState().queueModal('critical', { card: mockCard });
    });

    // The modal delay is 750ms. 
    // We can just await waitFor with a longer timeout, or we can click to skip.
    // Let's await waitFor because framer-motion is mocked out, so only the setTimeout remains.
    await waitFor(() => {
      expect(screen.getByText('Test Critical Hit Render')).toBeInTheDocument();
      expect(screen.getByText('This is a test effect to verify it renders')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('renders fumble modal when queued', async () => {
    const mockFumble = {
      id: 'test-fumble',
      name: 'Test Fumble Render',
      flavorText: 'Oops!',
      effect: 'You fumbled.',
    };

    render(<ModalOverlay />);

    act(() => {
      useUIStore.getState().queueModal('fumble', { card: mockFumble });
    });

    await waitFor(() => {
      expect(screen.getByText('Test Fumble Render')).toBeInTheDocument();
      expect(screen.getByText('You fumbled.')).toBeInTheDocument();
    });
  });
});
