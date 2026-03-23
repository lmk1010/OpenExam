import React, { useState, useEffect } from 'react';

// 分类配置
const categoryConfig = {
  yanyu: { name: '言语理解', color: '#3b82f6' },
  shuliang: { name: '数量关系', color: '#ec4899' },
  panduan: { name: '判断推理', color: '#8b5cf6' },
  ziliao: { name: '资料分析', color: '#f59e0b' },
  changshi: { name: '常识判断', color: '#10b981' },
};

// 默认子分类配置
const defaultSubCategories = {
  yanyu: ['xuanci', 'yueduan', 'yuju', 'wenzhang'],
  shuliang: ['jisuan', 'tuili'],
  panduan: ['tuxing', 'dingyi', 'leibi', 'luoji'],
  ziliao: ['wenzi', 'biaoge', 'tubiao', 'zonghe', 'zengzhang'],
  changshi: ['zhengzhi', 'jingji', 'falv', 'keji', 'renwen', 'dili'],
};

// 子分类中文映射
const subCategoryNames = {
  // 言语理解
  xuanci: '选词填空',
  yueduan: '片段阅读',
  yuju: '语句表达',
  wenzhang: '文章阅读',
  // 数量关系
  jisuan: '数学运算',
  tuili: '数字推理',
  // 判断推理
  tuxing: '图形推理',
  dingyi: '定义判断',
  leibi: '类比推理',
  luoji: '逻辑判断',
  // 资料分析
  wenzi: '文字资料',
  biaoge: '表格资料',
  tubiao: '图形资料',
  zonghe: '综合资料',
  zengzhang: '增长率',
  // 常识判断
  zhengzhi: '政治',
  jingji: '经济',
  falv: '法律',
  keji: '科技',
  renwen: '人文',
  dili: '地理',
  gongcheng: '工程问题',
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

export default function PracticeModule({ onStartPractice, onImport, onHistory }) {
  const [expandedId, setExpandedId] = useState(null);
  const [modules, setModules] = useState([]);
  const [stats, setStats] = useState({ totalQuestions: 0, totalDone: 0, accuracy: 0, wrongCount: 0 });
  const [subCategories, setSubCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState({
    questionCount: 10,
    mode: 'practice', // practice | memorize
    shuffle: true,
    showAnswer: false, // 背题模式下立即显示答案
  });
  const [pendingPractice, setPendingPractice] = useState(null); // { category, subCategory }

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!isElectron()) {
        // 非 Electron 环境，显示所有默认分类
        const defaultModules = Object.entries(categoryConfig).map(([id, cfg]) => ({
          id,
          name: cfg.name,
          color: cfg.color,
          count: 0,
          done: 0
        }));
        setModules(defaultModules);
        setLoading(false);
        return;
      }

      try {
        // 获取分类统计
        const categoryStats = await window.openexam.db.getCategoryStats();
        const practiceStats = await window.openexam.db.getPracticeStats();

        // 合并默认分类和数据库统计，确保所有分类都显示
        const moduleData = Object.entries(categoryConfig).map(([id, cfg]) => {
          const dbStat = categoryStats.find(cat => cat.category === id);
          return {
            id,
            name: cfg.name,
            color: cfg.color,
            count: dbStat?.total || 0,
            done: dbStat?.done || 0
          };
        });

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
    if (subCategories[category]) return;

    // 获取默认子分类
    const defaultSubs = defaultSubCategories[category] || [];

    if (!isElectron()) {
      // 非 Electron 环境，显示默认子分类
      const subs = defaultSubs.map(sub => ({ subCategory: sub, count: 0 }));
      setSubCategories(prev => ({ ...prev, [category]: subs }));
      return;
    }

    try {
      const dbSubs = await window.openexam.db.getSubCategoryStats(category);

      // 合并默认子分类和数据库统计
      const mergedSubs = defaultSubs.map(sub => {
        const dbSub = dbSubs.find(s => s.subCategory === sub);
        return { subCategory: sub, count: dbSub?.count || 0 };
      });

      // 添加数据库中有但默认列表没有的子分类
      dbSubs.forEach(dbSub => {
        if (!defaultSubs.includes(dbSub.subCategory) && dbSub.subCategory) {
          mergedSubs.push(dbSub);
        }
      });

      setSubCategories(prev => ({ ...prev, [category]: mergedSubs }));
    } catch (err) {
      console.error('加载子分类失败:', err);
    }
  };

  // 开始练习（直接开始）
  const handleStartPractice = (category, subCategory) => {
    onStartPractice?.(category, subCategory, practiceConfig);
  };

  // 打开配置弹窗
  const openConfig = () => {
    setShowConfig(true);
  };

  // 保存配置
  const saveConfig = () => {
    setShowConfig(false);
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
        <div className="summary-actions">
          <button className="summary-btn outline" onClick={openConfig}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            练习设置
          </button>
          <button className="summary-btn outline" onClick={() => onHistory?.()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            练习历史
          </button>
          <button className="summary-btn" onClick={() => onImport?.()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            导入试卷
          </button>
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
                  <button
                    className="practice-start-btn"
                    onClick={(e) => { e.stopPropagation(); handleStartPractice(mod.id, 'all'); }}
                    disabled={mod.count === 0}
                  >
                    开始
                  </button>
                  <div className={`practice-arrow ${isExpanded ? 'rotated' : ''}`}>
                    <Icons.arrow />
                  </div>
                </div>

                {isExpanded && (
                  <div className="practice-subs">
                    {subs.map(sub => (
                      <button key={sub.subCategory} className="sub-item" onClick={() => handleStartPractice(mod.id, sub.subCategory)} disabled={sub.count === 0}>
                        <span className="sub-name">{subCategoryNames[sub.subCategory] || sub.subCategory || '未分类'}</span>
                        <span className="sub-count">{sub.count} 题</span>
                        <Icons.arrow />
                      </button>
                    ))}
                    <button className="sub-item primary" onClick={() => handleStartPractice(mod.id, 'all')} disabled={mod.count === 0}>
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

      {/* 练习配置弹窗 */}
      {showConfig && (
        <div className="config-overlay" onClick={() => setShowConfig(false)}>
          <div className="config-modal" onClick={e => e.stopPropagation()}>
            <h3>练习设置</h3>

            <div className="config-group">
              <label>练习模式</label>
              <div className="config-options">
                <button
                  className={`config-option ${practiceConfig.mode === 'practice' ? 'active' : ''}`}
                  onClick={() => setPracticeConfig(prev => ({ ...prev, mode: 'practice', showAnswer: false }))}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span className="option-label">做题模式</span>
                  <span className="option-desc">选择答案后显示对错</span>
                </button>
                <button
                  className={`config-option ${practiceConfig.mode === 'memorize' ? 'active' : ''}`}
                  onClick={() => setPracticeConfig(prev => ({ ...prev, mode: 'memorize', showAnswer: true }))}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                  <span className="option-label">背题模式</span>
                  <span className="option-desc">直接显示答案和解析</span>
                </button>
              </div>
            </div>

            <div className="config-group">
              <label>每次练习题数</label>
              <div className="config-counts">
                {[5, 10, 15, 20, 30, 50].map(num => (
                  <button
                    key={num}
                    className={`count-btn ${practiceConfig.questionCount === num ? 'active' : ''}`}
                    onClick={() => setPracticeConfig(prev => ({ ...prev, questionCount: num }))}
                  >
                    {num}题
                  </button>
                ))}
              </div>
            </div>

            <div className="config-group">
              <label>其他设置</label>
              <div className="config-toggles">
                <label className="toggle-item">
                  <input
                    type="checkbox"
                    checked={practiceConfig.shuffle}
                    onChange={e => setPracticeConfig(prev => ({ ...prev, shuffle: e.target.checked }))}
                  />
                  <span>随机打乱题目顺序</span>
                </label>
              </div>
            </div>

            <div className="config-actions">
              <button className="btn-secondary" onClick={() => setShowConfig(false)}>取消</button>
              <button className="btn-primary" onClick={saveConfig}>保存设置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
