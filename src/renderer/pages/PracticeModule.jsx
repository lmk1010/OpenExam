import React, { useState } from 'react';

// 专项练习模块
const modules = [
  {
    id: 'yanyu',
    name: '言语理解',
    color: '#3b82f6',
    count: 1245,
    done: 328,
    subModules: [
      { name: '选词填空', count: 420 },
      { name: '片段阅读', count: 385 },
      { name: '语句排序', count: 220 },
      { name: '逻辑填空', count: 220 }
    ]
  },
  {
    id: 'shuliang',
    name: '数量关系',
    color: '#ec4899',
    count: 986,
    done: 156,
    subModules: [
      { name: '数字推理', count: 245 },
      { name: '数学运算', count: 320 },
      { name: '工程问题', count: 186 },
      { name: '行程问题', count: 235 }
    ]
  },
  {
    id: 'panduan',
    name: '判断推理',
    color: '#8b5cf6',
    count: 1593,
    done: 412,
    subModules: [
      { name: '图形推理', count: 380 },
      { name: '定义判断', count: 425 },
      { name: '类比推理', count: 388 },
      { name: '逻辑判断', count: 400 }
    ]
  },
  {
    id: 'ziliao',
    name: '资料分析',
    color: '#f59e0b',
    count: 756,
    done: 89,
    subModules: [
      { name: '增长率', count: 186 },
      { name: '比重', count: 195 },
      { name: '倍数', count: 175 },
      { name: '综合分析', count: 200 }
    ]
  },
  {
    id: 'changshi',
    name: '常识判断',
    color: '#10b981',
    count: 2100,
    done: 567,
    subModules: [
      { name: '政治', count: 350 },
      { name: '法律', count: 380 },
      { name: '经济', count: 320 },
      { name: '历史', count: 360 },
      { name: '地理', count: 340 },
      { name: '科技', count: 350 }
    ]
  },
];

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
  arrow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
};

export default function PracticeModule({ onStartPractice }) {
  const [expandedId, setExpandedId] = useState(null);

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
          <span className="summary-value">{Math.round(totalDone / totalCount * 100)}%</span>
          <span className="summary-label">完成度</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-value">78%</span>
          <span className="summary-label">正确率</span>
        </div>
      </div>

      {/* 模块列表 */}
      <div className="practice-list">
        {modules.map(mod => {
          const Icon = Icons[mod.id];
          const isExpanded = expandedId === mod.id;
          const progress = Math.round(mod.done / mod.count * 100);

          return (
            <div key={mod.id} className={`practice-item ${isExpanded ? 'expanded' : ''}`}>
              <div className="practice-item-main" onClick={() => setExpandedId(isExpanded ? null : mod.id)}>
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
                  {mod.subModules.map(sub => (
                    <button key={sub.name} className="sub-item" onClick={() => onStartPractice?.(mod.id, sub.name)}>
                      <span className="sub-name">{sub.name}</span>
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
        })}
      </div>
    </div>
  );
}
