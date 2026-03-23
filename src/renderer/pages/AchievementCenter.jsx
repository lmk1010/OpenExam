import React, { useEffect, useMemo, useState } from 'react';
import { ACH_GROUP_LABELS, ICONS, Ico, getAchievementGroupLabel } from '../components/AchievementVisuals.jsx';
import AchievementTile, { AchievementRing } from '../components/AchievementTile.jsx';
import AchievementDialog from '../components/AchievementDialog.jsx';
import { normalizeAchievements } from '../utils/achievementUtils.js';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'unlocked', label: '已解锁' },
  { key: 'locked', label: '待解锁' },
];

const GROUP_ICONS = {
  growth: ICONS.book,
  habit: ICONS.days,
  accuracy: ICONS.target,
  mastery: ICONS.crown,
  explore: ICONS.ai,
};

const cardStyle = {
  borderRadius: 16,
  border: '1px solid var(--surface-border-strong)',
  background: 'var(--surface-elevated)',
  boxShadow: 'var(--elevated-shadow)',
};

const compactText = {
  fontSize: 10,
  color: 'var(--muted)',
};

export default function AchievementCenter({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [detailAchievementId, setDetailAchievementId] = useState(null);

  useEffect(() => {
    (async () => {
      if (!window.openexam?.db?.getGrowthData) {
        setLoading(false);
        return;
      }
      try {
        setData(await window.openexam.db.getGrowthData());
      } catch (error) {
        console.error('加载成就数据失败:', error);
      }
      setLoading(false);
    })();
  }, []);

  const achievements = normalizeAchievements(data?.achievements, data || {});
  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  const lockedCount = Math.max(0, achievements.length - unlockedCount);
  const completionRate = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  const filterCounts = useMemo(() => ({
    all: achievements.length,
    unlocked: unlockedCount,
    locked: lockedCount,
  }), [achievements.length, unlockedCount, lockedCount]);

  const filteredAchievements = useMemo(() => achievements.filter((item) => {
    if (filter === 'unlocked') return item.unlocked;
    if (filter === 'locked') return !item.unlocked;
    return true;
  }), [achievements, filter]);

  const groups = useMemo(() => Object.entries(ACH_GROUP_LABELS).map(([key]) => {
    const allItems = achievements.filter((item) => item.group === key);
    const visibleItems = filteredAchievements
      .filter((item) => item.group === key)
      .sort((a, b) => (Number(b.unlocked) - Number(a.unlocked)) || ((b.progressRatio || 0) - (a.progressRatio || 0)) || ((a.order || 0) - (b.order || 0)));

    return {
      key,
      label: getAchievementGroupLabel(key),
      items: visibleItems,
      total: allItems.length,
      unlocked: allItems.filter((item) => item.unlocked).length,
    };
  }).filter((group) => group.total > 0), [achievements, filteredAchievements]);

  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const nextUnlocks = achievements
    .filter((item) => !item.unlocked)
    .sort((a, b) => (b.progressRatio || 0) - (a.progressRatio || 0))
    .slice(0, 5);
  const nextUnlock = nextUnlocks[0] || null;
  const detailAchievement = achievements.find((item) => item.id === detailAchievementId) || null;

  if (loading) {
    return (
      <section className="main-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--muted)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <span style={{ fontSize: 11 }}>加载成就列表…</span>
        </div>
      </section>
    );
  }

  return (
    <section className="main-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => onBack?.()}
            style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)', flexShrink: 0 }}
          >
            ←
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>我的 › 成长中心 › 成就列表</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--warning) 0%, #d8ad69 100%)', display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}>
                <Ico d={ICONS.trophy} size={14} col="#fff" sw={2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>成就列表</h2>
                <div style={{ ...compactText, marginTop: 2 }}>已解锁 {unlockedCount} 项，待完成 {lockedCount} 项</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 999,
                border: filter === item.key ? '1px solid var(--accent-border-soft)' : '1px solid var(--line)',
                background: filter === item.key ? 'var(--accent-soft-bg)' : 'var(--surface)',
                color: filter === item.key ? 'var(--accent)' : 'var(--muted)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{item.label}</span>
              <span style={{ minWidth: 16, textAlign: 'center', color: filter === item.key ? 'var(--accent)' : 'var(--text)' }}>{filterCounts[item.key]}</span>
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 20px' }}>
        <div style={{ ...cardStyle, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>总体进度</span>
                <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-soft-bg)', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>
                  完成度 {completionRate}%
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {[
                  { label: '总成就', value: achievements.length, color: 'var(--accent)', bg: 'var(--accent-soft-bg)', border: 'var(--accent-border-soft)' },
                  { label: '已解锁', value: unlockedCount, color: 'var(--success)', bg: 'var(--success-soft)', border: 'var(--success-border)' },
                  { label: '待完成', value: lockedCount, color: 'var(--muted)', bg: 'var(--neutral-soft-bg)', border: 'rgba(148,163,184,0.18)' },
                ].map((item) => (
                  <div key={item.label} style={{ padding: '8px 10px', borderRadius: 12, background: item.bg, border: `1px solid ${item.border}`, minWidth: 88 }}>
                    <div style={{ ...compactText }}>{item.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: item.color, marginTop: 3 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, ...compactText }}>
                  <span>整体完成度</span>
                  <span>{completionRate}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--accent-soft-bg)', overflow: 'hidden' }}>
                  <div style={{ width: `${completionRate}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--accent), var(--accent-strong))' }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 12px 12px 14px', borderRadius: 16, background: 'linear-gradient(135deg, var(--accent-soft-bg-strong) 0%, var(--accent-soft-bg) 100%)', border: '1px solid var(--accent-border-soft)' }}>
              <div style={{ ...compactText }}>最近冲刺目标</div>
              {nextUnlock ? (
                <button type="button" onClick={() => setDetailAchievementId(nextUnlock.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, width: '100%', padding: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                  <AchievementRing achievement={nextUnlock} size={74} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{nextUnlock.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>{nextUnlock.progressText}</span>
                    </div>
                    <div style={{ ...compactText, marginTop: 5, lineHeight: 1.55 }}>{nextUnlock.desc}</div>
                  </div>
                </button>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 700, marginTop: 8 }}>当前所有成就均已解锁</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleGroups.map((group) => {
            const groupRate = group.total > 0 ? Math.round((group.unlocked / group.total) * 100) : 0;
            return (
              <section key={group.key} style={{ ...cardStyle, padding: '12px 14px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent-soft-bg)', display: 'grid', placeItems: 'center' }}>
                      <Ico d={GROUP_ICONS[group.key] || ICONS.growth} size={12} col="var(--accent)" sw={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{group.label}</div>
                      <div style={{ ...compactText }}>{group.unlocked}/{group.total} 已解锁{filter !== 'all' ? ` · 当前显示 ${group.items.length} 项` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 132 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--accent-soft-bg)', overflow: 'hidden' }}>
                      <div style={{ width: `${groupRate}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--accent), var(--accent-strong))' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>{groupRate}%</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
                  {group.items.map((item) => (
                    <AchievementTile key={item.id} achievement={item} showDetail={false} onClick={() => setDetailAchievementId(item.id)} />
                  ))}
                </div>
              </section>
            );
          })}

          {visibleGroups.length === 0 && (
            <div style={{ ...cardStyle, padding: '32px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>当前筛选下暂无成就</div>
              <div style={{ ...compactText, marginTop: 6 }}>可切换到“全部”查看完整成就列表</div>
            </div>
          )}

          {nextUnlocks.length > 1 && (
            <div style={{ ...cardStyle, padding: '12px 14px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>接近解锁</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))', gap: 10, marginTop: 10 }}>
                {nextUnlocks.slice(1).map((item) => (
                  <AchievementTile key={item.id} achievement={item} compact showDetail={false} onClick={() => setDetailAchievementId(item.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AchievementDialog achievement={detailAchievement} onClose={() => setDetailAchievementId(null)} />
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
    </section>
  );
}
