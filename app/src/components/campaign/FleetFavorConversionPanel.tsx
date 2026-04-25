import React, { useEffect, useMemo, useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';

interface Props {
  compact?: boolean;
  title?: string;
}

export default function FleetFavorConversionPanel({ compact = false, title = 'FLEET FAVOR CONVERSION' }: Props) {
  const campaign = useCampaignStore(s => s.campaign);
  const convertFleetFavorToRP = useCampaignStore(s => s.convertFleetFavorToRP);

  const convertibleFleetFavor = useMemo(() => Math.max(0, campaign?.fleetFavor ?? 0), [campaign?.fleetFavor]);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (convertibleFleetFavor <= 0) {
      setAmount(0);
      return;
    }
    setAmount(current => {
      if (current <= 0) return convertibleFleetFavor;
      return Math.min(current, convertibleFleetFavor);
    });
  }, [convertibleFleetFavor]);

  if (!campaign) return null;

  const rpPreview = amount * 10;
  const canConvert = convertibleFleetFavor > 0 && amount > 0;

  return (
    <div className="panel panel--raised" style={{ padding: compact ? 'var(--space-sm)' : 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
        <div className="label" style={{ color: 'var(--color-holo-cyan)' }}>{title}</div>
        <div className="mono" style={{ fontSize: compact ? '0.85rem' : '1rem', color: 'var(--color-text-dim)' }}>
          1 FF = 10 RP
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <div className="panel" style={{ padding: 'var(--space-sm)', textAlign: 'center' }}>
          <div className="label" style={{ color: 'var(--color-hostile-red)' }}>AVAILABLE FF</div>
          <div className="mono" style={{ fontSize: compact ? '1.25rem' : '1.6rem', color: 'var(--color-hostile-red)' }}>{convertibleFleetFavor}</div>
        </div>
        <div className="panel" style={{ padding: 'var(--space-sm)', textAlign: 'center' }}>
          <div className="label" style={{ color: 'var(--color-alert-amber)' }}>CONVERTING</div>
          <div className="mono" style={{ fontSize: compact ? '1.25rem' : '1.6rem', color: 'var(--color-alert-amber)' }}>{amount}</div>
        </div>
        {!compact && (
          <div className="panel" style={{ padding: 'var(--space-sm)', textAlign: 'center' }}>
            <div className="label" style={{ color: 'var(--color-holo-green)' }}>RP GAIN</div>
            <div className="mono" style={{ fontSize: '1.6rem', color: 'var(--color-holo-green)' }}>+{rpPreview}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr auto auto' : '1fr auto auto auto', gap: 'var(--space-sm)', alignItems: 'center' }}>
        <input
          type="number"
          min={0}
          max={convertibleFleetFavor}
          step={1}
          value={amount}
          disabled={convertibleFleetFavor <= 0}
          onChange={event => {
            const rawValue = Number(event.target.value);
            if (!Number.isFinite(rawValue)) {
              setAmount(0);
              return;
            }
            setAmount(Math.max(0, Math.min(convertibleFleetFavor, Math.floor(rawValue))));
          }}
          style={{
            width: '100%',
            minWidth: 0,
            background: 'rgba(8, 12, 24, 0.92)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: compact ? '8px 10px' : '10px 12px',
            fontSize: compact ? '0.95rem' : '1rem',
          }}
        />
        <button
          className="btn btn--secondary"
          disabled={convertibleFleetFavor <= 0}
          onClick={() => setAmount(Math.max(1, Math.floor(convertibleFleetFavor / 2)))}
        >
          HALF
        </button>
        <button
          className="btn btn--secondary"
          disabled={convertibleFleetFavor <= 0}
          onClick={() => setAmount(convertibleFleetFavor)}
        >
          MAX
        </button>
        {!compact && (
          <button
            className="btn"
            disabled={!canConvert}
            onClick={() => convertFleetFavorToRP(amount)}
          >
            CONVERT
          </button>
        )}
      </div>

      {compact && (
        <button
          className="btn"
          style={{ width: '100%', marginTop: 'var(--space-sm)' }}
          disabled={!canConvert}
          onClick={() => convertFleetFavorToRP(amount)}
        >
          CONVERT FOR +{rpPreview} RP
        </button>
      )}

      {convertibleFleetFavor <= 0 && (
        <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
          No positive Fleet Favor is available to convert right now.
        </div>
      )}
    </div>
  );
}
