import React, { useState, useEffect, useRef } from 'react';
import { CampaignSaveManager } from '../utils/CampaignSaveManager';
import type { SaveSlotMeta } from '../utils/CampaignSaveManager';
import { MAX_SAVE_SLOTS } from '../utils/CampaignSaveManager';

// ─── Types ────────────────────────────────────────────────────────

export type SaveSlotModalMode = 'save' | 'load';

interface SaveSlotModalProps {
  mode: SaveSlotModalMode;
  /** Called when user confirms a load — passes the slot ID */
  onLoad?: (slotId: string) => void;
  /** Called after a successful save */
  onSaved?: (meta: SaveSlotMeta) => void;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function difficultyLabel(d: string): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

const PHASE_SHORT: Record<string, string> = {
  story: 'Story',
  sectorMap: 'Sector Map',
  nodeResolution: 'Node',
  postCombat: 'Post-Combat',
  drydock: 'Drydock',
  gameOver: 'Game Over',
};

// ─── Sub-components ───────────────────────────────────────────────

interface SlotRowProps {
  meta: SaveSlotMeta;
  isSelected: boolean;
  confirmingDelete: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onExport: () => void;
  /** In save-mode we show "Overwrite" instead of "Load" */
  mode: SaveSlotModalMode;
  onOverwrite?: () => void;
}

function SlotRow({
  meta,
  isSelected,
  confirmingDelete,
  onSelect,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onExport,
  mode,
  onOverwrite,
}: SlotRowProps) {
  return (
    <div
      className={`save-slot-item${isSelected ? ' save-slot-item--selected' : ''}`}
      onClick={onSelect}
      data-testid={`save-slot-item-${meta.id}`}
    >
      <div className="save-slot-item-main">
        <div className="save-slot-item-name" title={meta.name}>{meta.name}</div>
        <div className="save-slot-item-meta">
          <span className="save-slot-badge">Sector {meta.sector}</span>
          <span className="save-slot-badge save-slot-badge--difficulty">{difficultyLabel(meta.difficulty)}</span>
          <span className="save-slot-badge save-slot-badge--phase">{PHASE_SHORT[meta.phase] ?? meta.phase}</span>
          <span className="save-slot-badge save-slot-badge--date">{formatDate(meta.savedAt)}</span>
        </div>
        <div className="save-slot-item-stats">
          <span>FF: {meta.fleetFavor > 0 ? '+' : ''}{meta.fleetFavor}</span>
          <span>RP: {meta.requisitionPoints}</span>
          <span>{meta.shipCount} ship{meta.shipCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="save-slot-item-actions" onClick={e => e.stopPropagation()}>
        {confirmingDelete ? (
          <>
            <span className="save-slot-delete-confirm-label">Delete?</span>
            <button
              className="btn save-slot-btn save-slot-btn--danger"
              onClick={onDeleteConfirm}
              data-testid={`confirm-delete-${meta.id}`}
            >
              YES
            </button>
            <button
              className="btn save-slot-btn save-slot-btn--cancel"
              onClick={onDeleteCancel}
            >
              NO
            </button>
          </>
        ) : (
          <>
            {mode === 'save' && (
              <button
                className="btn save-slot-btn save-slot-btn--overwrite"
                onClick={onOverwrite}
                data-testid={`overwrite-slot-${meta.id}`}
                title="Overwrite this save"
              >
                OVERWRITE
              </button>
            )}
            <button
              className="btn save-slot-btn save-slot-btn--export"
              onClick={onExport}
              data-testid={`export-slot-${meta.id}`}
              title="Export to disk"
            >
              ↓
            </button>
            <button
              className="btn save-slot-btn save-slot-btn--danger"
              onClick={onDeleteRequest}
              data-testid={`delete-slot-${meta.id}`}
              title="Delete this save"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────

export default function SaveSlotModal({ mode, onLoad, onSaved, onClose }: SaveSlotModalProps) {
  const [saves, setSaves] = useState<SaveSlotMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load saves list ──────────────────────────────────────────

  async function refreshSaves() {
    setSaves(await CampaignSaveManager.listSaves());
  }

  useEffect(() => {
    void refreshSaves();
    const autoName = CampaignSaveManager.generateSaveName();
    setSaveName(autoName);
  }, []);

  // Focus name input in save mode
  useEffect(() => {
    if (mode === 'save') {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [mode]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Handlers ────────────────────────────────────────────────

  const handleSelectSlot = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
    setConfirmingDeleteId(null);
  };

  const handleDeleteRequest = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmingDeleteId(id);
  };

  const handleDeleteConfirm = async (id: string) => {
    await CampaignSaveManager.deleteSave(id);
    if (selectedId === id) setSelectedId(null);
    setConfirmingDeleteId(null);
    await refreshSaves();
  };

  const handleExport = (id: string) => {
    void CampaignSaveManager.exportSlot(id);
  };

  const handleLoad = async () => {
    if (!selectedId) return;
    const success = await CampaignSaveManager.load(selectedId);
    if (success && onLoad) {
      onLoad(selectedId);
    }
  };

  const handleSaveNew = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const meta = await CampaignSaveManager.save(saveName);
    setIsSaving(false);
    if (meta) {
      await refreshSaves();
      if (onSaved) onSaved(meta);
    }
  };

  const handleOverwrite = async (slotId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    const meta = await CampaignSaveManager.overwrite(slotId, saveName);
    setIsSaving(false);
    if (meta) {
      await refreshSaves();
      if (onSaved) onSaved(meta);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const success = await CampaignSaveManager.importFromDisk(file);
    if (success) {
      refreshSaves();
      if (onLoad) onLoad('imported');
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Derived state ────────────────────────────────────────────

  const atSlotLimit = saves.length >= MAX_SAVE_SLOTS;
  const canLoad = !!selectedId;

  const title = mode === 'save' ? 'SAVE CAMPAIGN' : 'LOAD CAMPAIGN';

  // ── Render ────────────────────────────────────────────────────

  return (
    <div
      className="save-slot-modal-backdrop"
      onClick={onClose}
      data-testid="save-slot-modal-backdrop"
    >
      <div
        className="save-slot-modal panel panel--glow animate-fadeIn"
        onClick={e => e.stopPropagation()}
        data-testid="save-slot-modal"
      >
        {/* Header */}
        <div className="save-slot-modal-header">
          <h2 className="save-slot-modal-title">{title}</h2>
          <button
            className="save-slot-close-btn btn"
            onClick={onClose}
            aria-label="Close"
            data-testid="save-slot-close-btn"
          >
            ×
          </button>
        </div>

        {/* ── SAVE MODE: name input + save-as / overwrite prompt ── */}
        {mode === 'save' && (
          <div className="save-slot-name-section">
            <label className="save-slot-name-label label" htmlFor="save-name-input">
              SAVE NAME
            </label>
            <input
              id="save-name-input"
              ref={nameInputRef}
              className="save-name-input"
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              maxLength={60}
              placeholder="Enter a save name…"
              data-testid="save-name-input"
              onKeyDown={e => {
                if (e.key === 'Enter' && saveMode === 'new') handleSaveNew();
              }}
            />

            {/* Save-as vs overwrite selection */}
            <div className="save-slot-mode-selector">
              <button
                className={`btn save-slot-mode-btn${saveMode === 'new' ? ' save-slot-mode-btn--active' : ''}`}
                onClick={() => { setSaveMode('new'); setSelectedId(null); }}
                data-testid="save-mode-new-btn"
              >
                SAVE AS NEW
              </button>
              <button
                className={`btn save-slot-mode-btn${saveMode === 'overwrite' ? ' save-slot-mode-btn--active' : ''}`}
                onClick={() => setSaveMode('overwrite')}
                data-testid="save-mode-overwrite-btn"
              >
                OVERWRITE EXISTING
              </button>
            </div>

            {saveMode === 'overwrite' && (
              <p className="save-slot-overwrite-hint">
                Select a slot below, then click OVERWRITE on it.
              </p>
            )}

            {saveMode === 'new' && (
              <div className="save-slot-confirm-row">
                {atSlotLimit && (
                  <p className="save-slot-limit-warning">
                    ⚠ Max {MAX_SAVE_SLOTS} slots reached. Delete a save first.
                  </p>
                )}
                <button
                  className="btn btn--primary save-slot-confirm-btn"
                  onClick={handleSaveNew}
                  disabled={atSlotLimit || isSaving}
                  data-testid="save-confirm-btn"
                >
                  {isSaving ? 'SAVING…' : 'SAVE'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {mode === 'save' && saves.length > 0 && (
          <div className="save-slot-divider">
            <span className="label">EXISTING SAVES</span>
          </div>
        )}

        {/* ── Slot list ── */}
        <div className="save-slot-list" data-testid="save-slot-list">
          {saves.length === 0 ? (
            <div className="save-slot-empty" data-testid="save-slot-empty">
              <span>No saves found.</span>
              {mode === 'load' && (
                <span style={{ display: 'block', marginTop: '8px', fontSize: '0.82rem', color: 'var(--color-text-dim)' }}>
                  Import a save file from disk below.
                </span>
              )}
            </div>
          ) : (
            saves.map(meta => (
              <SlotRow
                key={meta.id}
                meta={meta}
                isSelected={selectedId === meta.id}
                confirmingDelete={confirmingDeleteId === meta.id}
                onSelect={() => handleSelectSlot(meta.id)}
                onDeleteRequest={() => handleDeleteRequest(meta.id)}
                onDeleteConfirm={() => handleDeleteConfirm(meta.id)}
                onDeleteCancel={() => setConfirmingDeleteId(null)}
                onExport={() => handleExport(meta.id)}
                mode={mode}
                onOverwrite={() => handleOverwrite(meta.id)}
              />
            ))
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="save-slot-footer">
          {mode === 'load' && (
            <button
              className="btn btn--primary"
              onClick={handleLoad}
              disabled={!canLoad}
              data-testid="load-confirm-btn"
            >
              LOAD SELECTED
            </button>
          )}

          <button
            className="btn btn--secondary"
            onClick={() => fileInputRef.current?.click()}
            data-testid="import-btn"
          >
            IMPORT FROM DISK
          </button>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImport}
            data-testid="import-file-input"
          />

          <button
            className="btn"
            onClick={onClose}
            data-testid="cancel-btn"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
