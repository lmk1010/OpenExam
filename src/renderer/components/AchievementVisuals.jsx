import React from 'react';

export const Ico = ({ d, size = 14, col = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

export const ICONS = {
  trophy: <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>, streak: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  check: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>, clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>, star: <><path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>, chart: <><path d="M18 20V10M12 20V4M6 20v-6"/></>,
  growth: <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>, correct: <><polyline points="20 6 9 17 4 12"/></>,
  wrong: <><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/></>, days: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  ai: <><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73A2 2 0 0112 2z"/></>, first: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  speed: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, hundred: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  medal: <><circle cx="12" cy="8" r="5"/><path d="M8 14l-2 8 6-3 6 3-2-8"/></>, crown: <><path d="M3 18l2-10 7 5 7-5 2 10H3z"/><path d="M7 18v3h10v-3"/></>,
  shield: <><path d="M12 3l7 3v5c0 5-3.4 8.8-7 10-3.6-1.2-7-5-7-10V6l7-3z"/></>, compass: <><circle cx="12" cy="12" r="9"/><polygon points="14 10 16 8 14 14 8 16 10 10 8 8"/></>,
  gem: <><path d="M7 3h10l4 5-9 13L3 8l4-5z"/><path d="M3 8h18"/></>, rocket: <><path d="M14 4c3 1 5 3 6 6-2 2-4 4-6 6-3-1-5-3-6-6 1-3 3-5 6-6z"/><path d="M8 16l-3 3 1-4 2 1z"/><circle cx="14" cy="10" r="1.5"/></>,
  sparkles: <><path d="M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4z"/><path d="M18.5 14.5l.8 2 .2.1-2 .8-.8 2-.8-2-2-.8 2-.8z"/></>, flame: <><path d="M12 2s4 4 4 8a4 4 0 11-8 0c0-2 1-4 4-8z"/><path d="M12 11c1.5 1.4 2 2.4 2 3.5a2 2 0 11-4 0c0-1 .5-2 2-3.5z"/></>,
  leaf: <><path d="M19 4c-7 0-12 4-12 11 0 3 2 5 5 5 7 0 11-5 11-12V4h-4z"/><path d="M9 15c2-2 5-4 9-5"/></>, orbit: <><circle cx="12" cy="12" r="2"/><path d="M4 12c0-3.5 3.6-6 8-6s8 2.5 8 6-3.6 6-8 6-8-2.5-8-6z"/><path d="M8 5c2 1 4 4 4 7s-2 6-4 7"/></>,
  maze: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8v4h-4v4h4"/></>, eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/></>,
};

const GROUP_POOLS = { growth: ['first', 'book', 'chart', 'growth', 'hundred', 'compass', 'rocket', 'medal'], habit: ['days', 'clock', 'streak', 'leaf', 'flame', 'book', 'sparkles', 'compass'], accuracy: ['target', 'star', 'correct', 'speed', 'shield', 'gem', 'eye', 'sparkles'], mastery: ['crown', 'medal', 'shield', 'trophy', 'gem', 'rocket', 'maze', 'growth'], explore: ['ai', 'rocket', 'orbit', 'sparkles', 'compass', 'chart', 'gem', 'shield'] };
const GENERIC_KEYS = new Set(['book', 'chart', 'days', 'clock', 'growth', 'trophy']);
const DECORS = { flare: <><path d="M18.5 3.5v4"/><path d="M16.5 5.5h4"/></>, dot: <circle cx="18.5" cy="5.5" r="1.4"/>, ring: <circle cx="18.5" cy="5.5" r="2.1"/>, flag: <path d="M16.5 3.5h3v3l-3-1.2z"/>, wave: <path d="M16.5 6c.8-.8 1.6-.8 2.4 0s1.6.8 2.4 0"/>, gem: <path d="M18.5 3.8l1.7 1.7-1.7 1.7-1.7-1.7z"/>, tick: <polyline points="16.5 5.6 18 7.1 20.6 4.5"/>, arc: <path d="M16.3 7a3 3 0 013.9-3.9"/>, twin: <><circle cx="17.5" cy="5.2" r="1.2"/><circle cx="20.2" cy="7.8" r="1"/></> };
const DECOR_KEYS = Object.keys(DECORS);
const hashString = (value = '') => Array.from(value).reduce((sum, ch) => ((sum * 31) + ch.charCodeAt(0)) >>> 0, 7);

export const ACH_GROUP_LABELS = { growth: '刷题里程', habit: '习惯养成', accuracy: '准确效率', mastery: '深度掌握', explore: '进阶探索' };
export const ACH_TIER_STYLES = { bronze: { label: '青铜', color: '#b88449', bg: 'rgba(184,132,73,0.12)', border: 'rgba(184,132,73,0.2)' }, silver: { label: '白银', color: '#7f8a9d', bg: 'rgba(127,138,157,0.12)', border: 'rgba(127,138,157,0.2)' }, gold: { label: '黄金', color: '#c89b53', bg: 'rgba(200,155,83,0.12)', border: 'rgba(200,155,83,0.2)' }, master: { label: '大师', color: 'var(--accent)', bg: 'var(--accent-soft-bg)', border: 'var(--accent-border-soft)' } };

export const getAchievementTierStyle = (tier) => ACH_TIER_STYLES[tier] || ACH_TIER_STYLES.bronze;
export const getAchievementGroupLabel = (group) => ACH_GROUP_LABELS[group] || '成长成就';
export const getAchievementIcon = (achievement = {}) => {
  const pool = GROUP_POOLS[achievement.group] || GROUP_POOLS.growth;
  const seed = Number.isFinite(achievement.order) ? achievement.order : hashString(achievement.id || achievement.name || 'achievement');
  const preferred = achievement.iconKey && ICONS[achievement.iconKey] && !GENERIC_KEYS.has(achievement.iconKey) ? achievement.iconKey : null;
  const baseKey = preferred || pool[seed % pool.length] || 'trophy';
  const decorKey = DECOR_KEYS[Math.floor(seed / pool.length) % DECOR_KEYS.length] || DECOR_KEYS[0];
  return <>{ICONS[baseKey] || ICONS.trophy}{DECORS[decorKey]}</>;
};
