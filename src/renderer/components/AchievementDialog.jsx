import React, { useEffect } from 'react';
import { getAchievementGroupLabel, getAchievementTierStyle } from './AchievementVisuals.jsx';
import { AchievementRing } from './AchievementTile.jsx';

const card = { borderRadius: 14, padding: '10px 12px', background: 'var(--surface-overlay-soft)', border: '1px solid var(--surface-border-strong)' };

export default function AchievementDialog({ achievement, onClose }) {
  useEffect(() => {
    if (!achievement) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [achievement, onClose]);

  if (!achievement) return null;

  const tierStyle = getAchievementTierStyle(achievement.tier);
  const progressPercent = Math.round((achievement.progressRatio || 0) * 100);
  const statusColor = achievement.unlocked ? 'var(--success)' : 'var(--accent)';

  return (
    <div role="dialog" aria-modal="true" onClick={() => onClose?.()} style={{ position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(15,23,42,0.44)', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', padding: 18 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: 'min(580px, calc(100vw - 24px))', borderRadius: 24, background: 'var(--surface-overlay)', border: '1px solid var(--surface-border-strong)', boxShadow: 'var(--elevated-shadow)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 18px 14px', borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
          <div><div style={{ fontSize: 11, color: 'var(--muted)' }}>成就详情</div><div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{achievement.name}</div></div>
          <button type="button" onClick={() => onClose?.()} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--surface-border-strong)', background: 'var(--surface-overlay-soft)', color: 'var(--muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: 18 }}>
          <div style={{ width: 116, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <AchievementRing achievement={achievement} size={96} />
            <div style={{ padding: '4px 10px', borderRadius: 999, background: achievement.unlocked ? 'var(--success-soft)' : 'var(--accent-soft-bg)', color: statusColor, fontSize: 11, fontWeight: 800 }}>
              {achievement.unlocked ? '已解锁' : '解锁中'}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: tierStyle.color, background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, borderRadius: 999, padding: '3px 8px' }}>{tierStyle.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft-bg)', borderRadius: 999, padding: '3px 8px' }}>{getAchievementGroupLabel(achievement.group)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: achievement.unlocked ? 'var(--success-soft)' : 'var(--accent-soft-bg)', borderRadius: 999, padding: '3px 8px' }}>完成度 {progressPercent}%</span>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>{achievement.desc}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
              <div style={card}><div style={{ fontSize: 11, color: 'var(--muted)' }}>当前进度</div><div style={{ fontSize: 14, fontWeight: 800, color: statusColor, marginTop: 4 }}>{achievement.progressText}</div></div>
              <div style={card}><div style={{ fontSize: 11, color: 'var(--muted)' }}>当前状态</div><div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{achievement.unlocked ? '已完成，可继续挑战更高阶成就' : '继续练习，达成后自动解锁'}</div></div>
            </div>

            <div style={{ ...card, marginTop: 12, background: 'var(--achievement-dialog-progress-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><span style={{ fontSize: 11, color: 'var(--muted)' }}>解锁进度</span><span style={{ fontSize: 12, fontWeight: 800, color: statusColor }}>{progressPercent}%</span></div>
              <div style={{ height: 7, borderRadius: 999, background: 'var(--accent-soft-bg)', overflow: 'hidden', marginTop: 8 }}><div style={{ width: `${progressPercent}%`, height: '100%', borderRadius: 999, background: achievement.unlocked ? 'var(--success)' : 'linear-gradient(90deg, var(--accent), var(--accent-strong))' }} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
