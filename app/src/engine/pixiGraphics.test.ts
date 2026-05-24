import { describe, it, expect } from 'vitest';
import * as PIXI from 'pixi.js';
import { attachOrUpdateSprite } from './pixiGraphics';

describe('attachOrUpdateSprite', () => {
  it('returns false when adversaryId is undefined', () => {
    const g = new PIXI.Graphics();
    const result = attachOrUpdateSprite(g, undefined, false, 'enemy');
    expect(result).toBe(false);
  });

  it('returns false when adversaryId has no sprite mapping', () => {
    const g = new PIXI.Graphics();
    const result = attachOrUpdateSprite(g, 'nonexistent-id', false, 'enemy');
    expect(result).toBe(false);
  });

  it('creates a sprite child when container has none (isNew=false)', () => {
    const g = new PIXI.Graphics();
    const result = attachOrUpdateSprite(g, 'hunter-killer', false, 'enemy');
    expect(result).toBe(true);
    const sprite = g.getChildByName('shipSprite') as PIXI.Sprite | null;
    expect(sprite).not.toBeNull();
    expect(sprite!.anchor.x).toBe(0.5);
    expect(sprite!.anchor.y).toBe(0.5);
    expect(sprite!.width).toBe(40);
    expect(sprite!.height).toBe(40);
  });

  it('creates a sprite child when container has none (isNew=true)', () => {
    const g = new PIXI.Graphics();
    const result = attachOrUpdateSprite(g, 'hunter-killer', true, 'enemy');
    expect(result).toBe(true);
    const sprite = g.getChildByName('shipSprite') as PIXI.Sprite | null;
    expect(sprite).not.toBeNull();
  });

  it('does not create duplicate sprite on second call', () => {
    const g = new PIXI.Graphics();
    attachOrUpdateSprite(g, 'hunter-killer', false, 'enemy');
    attachOrUpdateSprite(g, 'hunter-killer', false, 'enemy');
    const sprites = g.children.filter(c => c.name === 'shipSprite');
    expect(sprites).toHaveLength(1);
  });

  it('applies enemy tint to the sprite', () => {
    const g = new PIXI.Graphics();
    attachOrUpdateSprite(g, 'hunter-killer', false, 'enemy');
    const sprite = g.getChildByName('shipSprite') as PIXI.Sprite;
    expect(sprite.tint).toBe(0xFF6B6B);
  });

  it('applies player tint to the sprite', () => {
    const g = new PIXI.Graphics();
    attachOrUpdateSprite(g, 'vanguard', false, 'player');
    const sprite = g.getChildByName('shipSprite') as PIXI.Sprite;
    expect(sprite.tint).toBe(0x4DA3FF);
  });

  it('applies allied tint to the sprite', () => {
    const g = new PIXI.Graphics();
    attachOrUpdateSprite(g, 'ai-vanguard', false, 'allied');
    const sprite = g.getChildByName('shipSprite') as PIXI.Sprite;
    expect(sprite.tint).toBe(0x7CFFB2);
  });

  it('works with station adversaryId', () => {
    const g = new PIXI.Graphics();
    const result = attachOrUpdateSprite(g, 'hegemony-station-outpost', false, 'enemy');
    expect(result).toBe(true);
    const sprite = g.getChildByName('shipSprite') as PIXI.Sprite | null;
    expect(sprite).not.toBeNull();
  });

  it('recovers sprite after it was removed from container (ghost→normal transition)', () => {
    const g = new PIXI.Graphics();
    // First call adds sprite
    attachOrUpdateSprite(g, 'hunter-killer', false, 'enemy');
    // Simulate sprite being removed (as happens in ghost contact branch)
    const sprite = g.getChildByName('shipSprite') as PIXI.Sprite;
    g.removeChild(sprite);
    // Second call should re-add the sprite even though isNew=false
    const result = attachOrUpdateSprite(g, 'hunter-killer', false, 'enemy');
    expect(result).toBe(true);
    const newSprite = g.getChildByName('shipSprite') as PIXI.Sprite | null;
    expect(newSprite).not.toBeNull();
    expect(newSprite!.tint).toBe(0xFF6B6B);
  });
});
