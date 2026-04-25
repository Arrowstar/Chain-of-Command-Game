import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActionSlot from './ActionSlot';
import type { ActionDefinition } from '../../types/game';
import { DndContext } from '@dnd-kit/core';

// dnd-kit context mocking can be complex, so we wrap it in a DndContext for simple render testing
const mockAction: ActionDefinition = {
  id: 'a1',
  station: 'tactical',
  name: 'Fire Missiles',
  ctCost: 1,
  stressCost: 2,
  effect: 'Boom',
};

describe('ActionSlot', () => {
  it('renders correctly without any assigned tokens', () => {
    render(
      <DndContext>
        <ActionSlot action={mockAction} assignedTokenIds={[]} onUnassign={() => {}} />
      </DndContext>
    );
    expect(screen.getByText('Fire Missiles')).toBeInTheDocument();
    expect(screen.getByText('1 CT')).toBeInTheDocument();
    expect(screen.getByText('2 STRESS')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.getByText('Drop CT Here')).toBeInTheDocument();
  });

  it('renders correctly with one assigned token', () => {
    render(
      <DndContext>
        <ActionSlot action={mockAction} assignedTokenIds={['ct-1']} onUnassign={() => {}} />
      </DndContext>
    );
    // Shows total stress and unassign button; count badge was removed
    expect(screen.getByText('2S total')).toBeInTheDocument();
    expect(screen.getByTestId('unassign-btn-a1-0')).toBeInTheDocument();
  });

  it('renders correctly with multiple assigned tokens and cumulative stress', () => {
    render(
      <DndContext>
        <ActionSlot action={mockAction} assignedTokenIds={['ct-1', 'ct-2', 'ct-3']} onUnassign={() => {}} />
      </DndContext>
    );
    // 3 assignments: 2 + 3 + 4 = 9 stress total
    expect(screen.getByText('9S total')).toBeInTheDocument();
    expect(screen.getByTestId('unassign-btn-a1-0')).toBeInTheDocument();
    expect(screen.getByTestId('unassign-btn-a1-1')).toBeInTheDocument();
    expect(screen.getByTestId('unassign-btn-a1-2')).toBeInTheDocument();
  });
});
