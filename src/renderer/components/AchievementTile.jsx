import React from 'react';
import { Ico, getAchievementIcon, getAchievementTierStyle } from './AchievementVisuals.jsx';

const lineClamp = (lines) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export function AchievementRing({ achievement, size = 68, compact = false }) {
  const tierStyle = getAchievementTierStyle(achievement?.tier);
  const progress = Math.max(0, Math.min(1, achievement?.progressRatio || 0));
  const isUnlocked = Boolean(achievement?.unlocked);
  const ringColor = isUnlocked ? 'var(--success)' : tierStyle.color;
  const trackColor = isUnlocked ? 'var(--success-soft)' : 'var(--accent-soft-bg)';
  const strokeWidth = compact ? 4 : 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const innerSize = Math.max(30, size - (compact ? 18 : 20));

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
      </svg>
      <div style={{ width: innerSize, height: innerSize, borderRadius: '50%', background: isUnlocked ? 'var(--achievement-tile-inner-unlocked-bg)' : 'var(--achievement-tile-inner-locked-bg)', border: `1px solid ${isUnlocked ? 'var(--success-border)' : 'var(--accent-border-soft)'}`, display: 'grid', placeItems: 'center', boxShadow: isUnlocked ? '0 8px 18px rgba(46,168,134,0.10)' : '0 6px 14px rgba(15,23,42,0.08)' }}>
        <Ico d={getAchievementIcon(achievement)} size={compact ? 16 : 18} col={isUnlocked ? ringColor : 'var(--accent)'} sw={1.9} />
      </div>
    </div>
  );
}

export default function AchievementTile({ achievement, compact = false, selected = false, onClick, showDetail = true }) {
  const tierStyle = getAchievementTierStyle(achievement?.tier);
  const isUnlocked = Boolean(achievement?.unlocked);
  const progressPercent = Math.round((achievement?.progressRatio || 0) * 100);
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={[achievement?.name, achievement?.desc, achievement?.progressText].filter(Boolean).join('\n')}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: compact ? 14 : 16,
        border: selected
          ? '1px solid var(--accent-border-soft)'
          : isUnlocked
            ? '1px solid rgba(117,109,232,0.10)'
            : '1px solid rgba(148,163,184,0.10)',
        background: isUnlocked
          ? 'var(--achievement-tile-unlocked-bg)'
          : 'var(--achievement-tile-locked-bg)',
        boxShadow: selected
          ? '0 8px 18px rgba(15,23,42,0.08)'
          : '0 2px 8px rgba(15,23,42,0.03)',
        padding: compact ? '8px 8px 10px' : '10px 10px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: compact ? 7 : 9,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'center',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease',
        transform: selected ? 'translateY(-1px)' : 'none',
      }}
    >
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 9, color: tierStyle.color, background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, borderRadius: 999, padding: '2px 6px', fontWeight: 700 }}>
          {tierStyle.label}
        </span>
        <span style={{ fontSize: 9, color: isUnlocked ? 'var(--success)' : 'var(--muted)', fontWeight: 700, opacity: isUnlocked ? 1 : 0.8 }}>
          {isUnlocked ? '已解锁' : `${progressPercent}%`}
        </span>
      </div>

      <AchievementRing achievement={achievement} size={compact ? 58 : 70} compact={compact} />

      <div style={{ width: '100%' }}>
        <div style={{ fontSize: compact ? 11 : 12, fontWeight: 800, color: 'var(--text)', ...lineClamp(2) }}>
          {achievement?.name}
        </div>
        {showDetail && (
          <div style={{ marginTop: 5, fontSize: 10, color: 'var(--muted)', lineHeight: 1.45, ...lineClamp(compact ? 1 : 2) }}>
            {achievement?.desc}
          </div>
        )}
      </div>

      <div style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: isUnlocked ? 'var(--success)' : 'var(--accent)', ...lineClamp(1) }}>
          {achievement?.progressText || (isUnlocked ? '已完成' : '进行中')}
        </div>
      </div>
    </Component>
  );
}
