import { describe, it, expect } from 'vitest';
import { EVENT_NODES, getAllEvents, getEventById, drawRandomEvent } from './eventNodes';

describe('Event Node Data Integrity', () => {
  it('contains exactly 25 events', () => {
    expect(getAllEvents()).toHaveLength(25);
  });

  it('every event has a unique ID', () => {
    const ids = EVENT_NODES.map(e => e.id);
    expect(new Set(ids).size).toBe(25);
  });

  it('IDs follow the pattern event-01 through event-25', () => {
    for (let i = 1; i <= 25; i++) {
      const id = `event-${String(i).padStart(2, '0')}`;
      expect(EVENT_NODES.some(e => e.id === id), `Missing ${id}`).toBe(true);
    }
  });

  it('every event has a non-empty title and narrative', () => {
    for (const e of EVENT_NODES) {
      expect(e.title.length, `${e.id} missing title`).toBeGreaterThan(0);
      expect(e.narrative.length, `${e.id} missing narrative`).toBeGreaterThan(0);
    }
  });

  it('every event has 2 to 4 options', () => {
    for (const e of EVENT_NODES) {
      expect(e.options.length, `${e.id} option count wrong`).toBeGreaterThanOrEqual(2);
      expect(e.options.length, `${e.id} too many options`).toBeLessThanOrEqual(4);
    }
  });

  it('every option has a non-empty label', () => {
    for (const e of EVENT_NODES) {
      for (const o of e.options) {
        expect(o.label.length, `${e.id}/${o.id} missing label`).toBeGreaterThan(0);
      }
    }
  });

  it('every option has at least one effect source (effects OR goodEffects/badEffects)', () => {
    for (const e of EVENT_NODES) {
      for (const o of e.options) {
        const hasEffects = (o.effects && o.effects.length > 0)
          || (o.goodEffects && o.goodEffects.length > 0)
          || (o.badEffects && o.badEffects.length > 0);
        expect(hasEffects, `${e.id}/${o.id} has no effects`).toBe(true);
      }
    }
  });

  it('dice-roll options have both goodEffects and badEffects defined', () => {
    for (const e of EVENT_NODES) {
      for (const o of e.options) {
        if (o.requiresRoll) {
          expect(o.goodEffects, `${e.id}/${o.id} missing goodEffects`).toBeDefined();
          expect(o.badEffects, `${e.id}/${o.id} missing badEffects`).toBeDefined();
          // goodEffects may be empty (success = nothing bad happens) — that is valid
          // badEffects should always have at least one effect
          expect(o.badEffects!.length, `${e.id}/${o.id} badEffects empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('all dice-roll options have rollThreshold between 1 and 6', () => {
    for (const e of EVENT_NODES) {
      for (const o of e.options) {
        if (o.requiresRoll) {
          expect(o.rollThreshold, `${e.id}/${o.id} missing rollThreshold`).toBeDefined();
          expect(o.rollThreshold!).toBeGreaterThanOrEqual(1);
          expect(o.rollThreshold!).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  it('events granting tech have a type:"tech" effect', () => {
    // Events 08, 17, 24 still grant random tech in at least one branch
    const techGrantingEvents = ['event-08', 'event-17', 'event-24'];
    for (const eventId of techGrantingEvents) {
      const event = getEventById(eventId)!;
      const hasTechEffect = event.options.some(o =>
        [...(o.effects ?? []), ...(o.goodEffects ?? [])].some(eff => eff.type === 'tech')
      );
      expect(hasTechEffect, `${eventId} should have a tech effect`).toBe(true);
    }
  });

  it('no individual option grants more than one exclusive item', () => {
    for (const event of EVENT_NODES) {
      for (const option of event.options) {
        const itemEffects = [
          ...(option.effects ?? []),
          ...(option.goodEffects ?? []),
          ...(option.badEffects ?? []),
        ].filter(effect => effect.type === 'grantWeapon' || effect.type === 'grantSubsystem');
        expect(itemEffects.length, `${event.id}/${option.id} grants too many items`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gated options use officer requirements on the authored event set', () => {
    for (const eventId of ['event-01', 'event-02', 'event-05', 'event-06', 'event-11', 'event-14', 'event-15', 'event-16', 'event-19', 'event-22', 'event-24']) {
      const event = getEventById(eventId)!;
      const gatedOptions = event.options.filter(option => (option.requirements?.length ?? 0) > 0);
      expect(gatedOptions.length, `${eventId} should have a gated option`).toBeGreaterThan(0);
    }
  });

  it('events that can transform to combat have a type:"transformToCombat" effect', () => {
    // Events 06 (bad), 21 (option A)
    for (const eventId of ['event-06', 'event-21']) {
      const event = getEventById(eventId)!;
      const hasTransform = event.options.some(o =>
        [...(o.effects ?? []), ...(o.badEffects ?? [])].some(eff => eff.type === 'transformToCombat')
      );
      expect(hasTransform, `${eventId} should have transformToCombat`).toBe(true);
    }
  });

  it('Event 24 good outcome awards 2 tech (alien ruin)', () => {
    const e = getEventById('event-24')!;
    const explorationOpt = e.options.find(o => o.id === 'exploration-team')!;
    const techEffect = explorationOpt.goodEffects!.find(ef => ef.type === 'tech');
    expect(techEffect).toBeDefined();
    expect(techEffect!.value).toBe(2);
  });

  it('Event 01 "leave" option has type:"nothing"', () => {
    const e = getEventById('event-01')!;
    const leaveOpt = e.options.find(o => o.id === 'leave')!;
    expect(leaveOpt.effects![0].type).toBe('nothing');
  });

  it('Event 02 roll threshold is 3 (1-2 bad, 3-6 good)', () => {
    const e = getEventById('event-02')!;
    const bringOpt = e.options.find(o => o.id === 'bring-aboard')!;
    expect(bringOpt.requiresRoll).toBe(true);
    expect(bringOpt.rollThreshold).toBe(3);
  });

  it('Event 06 roll threshold is 4 (1-3 ambush, 4-6 jackpot)', () => {
    const e = getEventById('event-06')!;
    const investOpt = e.options.find(o => o.id === 'investigate')!;
    expect(investOpt.rollThreshold).toBe(4);
  });
});

describe('getEventById', () => {
  it('returns event-01 as The Derelict Transport', () => {
    const e = getEventById('event-01');
    expect(e).toBeDefined();
    expect(e!.title).toBe('The Derelict Transport');
  });

  it('returns undefined for unknown ID', () => {
    expect(getEventById('event-99')).toBeUndefined();
  });
});

describe('drawRandomEvent', () => {
  it('returns a valid event', () => {
    const e = drawRandomEvent();
    expect(e).not.toBeNull();
    expect(e!.id).toMatch(/^event-\d{2}$/);
  });

  it('respects the exclude list', () => {
    const allButFirst = EVENT_NODES.slice(1).map(e => e.id);
    const drawn = drawRandomEvent(allButFirst);
    expect(drawn!.id).toBe('event-01');
  });

  it('returns null when all events excluded', () => {
    const allIds = EVENT_NODES.map(e => e.id);
    expect(drawRandomEvent(allIds)).toBeNull();
  });
});
