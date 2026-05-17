import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { HighScoreRecord } from '../types/campaignTypes';

// ══════════════════════════════════════════════════════════════════
// High Score Manager — IndexedDB backend
//
// Uses the same "ChainOfCommandDB" database as CampaignSaveManager
// but adds a new `high_scores` object store at DB version 2.
// ══════════════════════════════════════════════════════════════════

const DB_NAME = 'ChainOfCommandDB';
const DB_VERSION = 2; // Bumped from v1 to add the high_scores store
const HS_STORE = 'high_scores' as const;
const MAX_HIGH_SCORES = 50;

// ─── Difficulty Multipliers ───────────────────────────────────────

export const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  easy:   1.0,
  normal: 1.5,
  hard:   2.0,
};

// ─── Grade thresholds (applied to finalScore) ─────────────────────
// These are scored against the post-multiplier score.
// Baseline scoring from a full-game victory on Normal ≈ ~3,000–5,000.

const GRADE_THRESHOLDS: { grade: HighScoreRecord['grade']; min: number }[] = [
  { grade: 'S', min: 6000 },
  { grade: 'A', min: 4000 },
  { grade: 'B', min: 2500 },
  { grade: 'C', min: 1500 },
  { grade: 'D', min: 500  },
  { grade: 'F', min: 0    },
];

export function calculateGrade(finalScore: number): HighScoreRecord['grade'] {
  for (const { grade, min } of GRADE_THRESHOLDS) {
    if (finalScore >= min) return grade;
  }
  return 'F';
}

// ─── DB Schema ────────────────────────────────────────────────────

interface CoCSchemaV2 extends DBSchema {
  saves: {
    key: string;
    value: unknown;
    indexes: { 'by-date': number };
  };
  high_scores: {
    key: string;
    value: HighScoreRecord;
    indexes: { 'by-score': number };
  };
}

// ─── DB singleton ─────────────────────────────────────────────────

import { getDB } from './CampaignSaveManager';

function generateId(): string {
  return `hs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ══════════════════════════════════════════════════════════════════
// HighScoreManager
// ══════════════════════════════════════════════════════════════════

export class HighScoreManager {
  /**
   * Returns all high score records sorted by finalScore descending.
   */
  static async getHighScores(): Promise<HighScoreRecord[]> {
    const db = await getDB();
    const all = await db.getAll(HS_STORE);
    return all.sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Saves a completed run to the high scores store.
   * Automatically trims to MAX_HIGH_SCORES entries (keeping the best scores).
   */
  static async saveHighScore(record: Omit<HighScoreRecord, 'id'>): Promise<HighScoreRecord> {
    const db = await getDB();
    const full: HighScoreRecord = { id: generateId(), ...record };
    await db.put(HS_STORE, full);

    // Trim to max — keep top scores by finalScore
    const all = await db.getAll(HS_STORE);
    if (all.length > MAX_HIGH_SCORES) {
      const sorted = all.sort((a, b) => b.finalScore - a.finalScore);
      const toDelete = sorted.slice(MAX_HIGH_SCORES);
      for (const entry of toDelete) {
        await db.delete(HS_STORE, entry.id);
      }
    }

    return full;
  }

  /**
   * Deletes a single high score record by ID.
   */
  static async deleteHighScore(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(HS_STORE, id);
  }

  /**
   * Wipes all high score records.
   */
  static async clearHighScores(): Promise<void> {
    const db = await getDB();
    await db.clear(HS_STORE);
  }
}
