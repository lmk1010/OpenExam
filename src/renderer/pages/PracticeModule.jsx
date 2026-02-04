import React, { useState, useEffect } from 'react';

// 分类配置
const categoryConfig = {
  yanyu: { name: '言语理解', color: '#3b82f6' },
  shuliang: { name: '数量关系', color: '#ec4899' },
  panduan: { name: '判断推理', color: '#8b5cf6' },
  ziliao: { name: '资料分析', color: '#f59e0b' },
  changshi: { name: '常识判断', color: '#10b981' },
};

// 简约图标组件
const Icons = {
  yanyu: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  shuliang: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  panduan: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  ziliao: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  changshi: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  default: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
    </svg>
  ),
  arrow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
};

// 检查是否在 Electron 环境
const isElectron = () => window.openexam?.db;

export default function PracticeModule({ onStartPractice }) {
  const [expandedId, setExpandedId] = useState(null);
  const [modules, setModules] = useState([]);
  const [stats, setStats] = useState({ totalQuestions: 0, totalDone: 0, accuracy: 0, wrongCount: 0 });
  const [subCategories, setSubCategories] = useState({});
  const [loading, setLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!isElectron()) {
        setLoading(false);
        return;
      }

      try {
        // 获取分类统计
        const categoryStats = await window.openexam.db.getCategoryStats();
        const practiceStats = await window.openexam.db.getPracticeStats();

        // 转换为模块数据
        const moduleData = categoryStats.map(cat => ({
          id: cat.category,
          name: categoryConfig[cat.category]?.name || cat.category,
          color: categoryConfig[cat.category]?.color || '#6b7280',
          count: cat.total,
          done: cat.done
        }));

        setModules(moduleData);
        setStats(practiceStats);
      } catch (err) {
        console.error('加载数据失败:', err);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  // 加载子分类
  const loadSubCategories = async (category) => {
    if (subCategories[category] || !isElectron()) return;

    try {
      const subs = await window.openexam.db.getSubCategoryStats(category);
      setSubCategories(prev => ({ ...prev, [category]: subs }));
    } catch (err) {
      console.error('加载子分类失败:', err);
    }
  };

  const handleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadSubCategories(id);
    }
  };

  if (loading) {
    return <div className="practice-page"><div className="loading-state">加载中...</div></div>;
  }

  const totalCount = modules.reduce((sum, m) => sum + m.count, 0);
  const totalDone = modules.reduce((sum, m) => sum + m.done, 0);

  return (
    <div className="practice-page">
      {/* 顶部统计 */}
      <div className="practice-summary">
        <div className="summary-item">
          <span className="summary-value">{totalCount.toLocaleString()}</span>
          <span className="summary-label">题库总量</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-value">{totalDone.toLocaleString()}</span>
          <span className="summary-label">已练习</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-value">{totalCount > 0 ? Math.round(totalDone / totalCount * 100) : 0}%</span>
          <span className="summary-label">完成度</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-value">{stats.accuracy}%</span>
          <span className="summary-label">正确率</span>
        </div>
      </div>

      {/* 模块列表 */}
      <div className="practice-list">
        {modules.length === 0 ? (
          <div className="empty-state">
            <p>暂无题目数据</p>
          </div>
        ) : (
          modules.map(mod => {
            const Icon = Icons[mod.id] || Icons.default;
            const isExpanded = expandedId === mod.id;
            const progress = mod.count > 0 ? Math.round(mod.done / mod.count * 100) : 0;
            const subs = subCategories[mod.id] || [];

            return (
              <div key={mod.id} className={`practice-item ${isExpanded ? 'expanded' : ''}`}>
                <div className="practice-item-main" onClick={() => handleExpand(mod.id)}>
                  <div className="practice-icon" style={{ color: mod.color }}>
                    <Icon />
                  </div>
                  <div className="practice-info">
                    <div className="practice-name">{mod.name}</div>
                    <div className="practice-meta">
                      <span>{mod.count.toLocaleString()} 题</span>
                      <span className="meta-dot">·</span>
                      <span>已做 {mod.done}</span>
                    </div>
                  </div>
                  <div className="practice-progress">
                    <div className="progress-bar-mini">
                      <div className="progress-fill-mini" style={{ width: `${progress}%`, background: mod.color }} />
                    </div>
                    <span className="progress-text">{progress}%</span>
                  </div>
                  <div className={`practice-arrow ${isExpanded ? 'rotated' : ''}`}>
                    <Icons.arrow />
                  </div>
                </div>

                {isExpanded && (
                  <div className="practice-subs">
                    {subs.map(sub => (
                      <button key={sub.subCategory} className="sub-item" onClick={() => onStartPractice?.(mod.id, sub.subCategory)}>
                        <span className="sub-name">{sub.subCategory || '未分类'}</span>
                        <span className="sub-count">{sub.count} 题</span>
                        <Icons.arrow />
                      </button>
                    ))}
                    <button className="sub-item primary" onClick={() => onStartPractice?.(mod.id, 'all')}>
                      <span className="sub-name">全部练习</span>
                      <span className="sub-count">{mod.count} 题</span>
                      <Icons.arrow />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
