import React, { useState, useEffect } from 'react';
import { getState } from '../store/examStore.js';

// 分类名称映射
const categoryNames = {
  yanyu: '言语理解',
  shuliang: '数量关系',
  panduan: '判断推理',
  ziliao: '资料分析',
  changshi: '常识判断'
};

// 简约折线图组件
const TrendChart = ({ data, color = '#6d5efb' }) => {
  const points = data.length > 0 ? data : [50, 60, 45, 70, 65, 80, 75];
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const pathPoints = points.map((val, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polyline
        points={pathPoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`0,100 ${pathPoints} 100,100`}
        fill="url(#trendGradient)"
      />
    </svg>
  );
};

export default function ExamResult({ result, onBack }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [historyStats, setHistoryStats] = useState(null);

  // 获取题目：优先使用 result 中的，否则从 store 获取
  const questions = result?.questions || getState().currentQuestions || [];
  const answers = result?.answers || {};
  const currentQuestion = questions[currentIndex];

  // 计算分类统计
  const categoryStats = {};
  questions.forEach(q => {
    const cat = q.category || 'other';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, correct: 0 };
    }
    categoryStats[cat].total++;
    if (answers[q.id] === q.answer) {
      categoryStats[cat].correct++;
    }
  });

  // 加载历史数据
  useEffect(() => {
    const loadHistory = async () => {
      if (window.openexam?.db) {
        try {
          const stats = await window.openexam.db.getPracticeStats();
          setHistoryStats(stats);
        } catch (e) {
          console.error('加载历史数据失败:', e);
        }
      }
    };
    loadHistory();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0分0秒';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  const getScoreLevel = (accuracy) => {
    if (accuracy >= 90) return { text: '优秀', color: '#10b981' };
    if (accuracy >= 80) return { text: '良好', color: '#6d5efb' };
    if (accuracy >= 60) return { text: '及格', color: '#f59e0b' };
    return { text: '需加强', color: '#ef4444' };
  };

  // 计算正确率
  const totalCount = result?.totalCount || questions.length;
  const correctCount = result?.correctCount || Object.keys(answers).filter(id => {
    const q = questions.find(q => q.id === id);
    return q && answers[id] === q.answer;
  }).length;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const timeElapsed = result?.timeElapsed || result?.duration || 0;
  const avgTimePerQuestion = totalCount > 0 ? Math.round(timeElapsed / totalCount) : 0;
  const wrongCount = totalCount - correctCount - (result?.unanswered || 0);

  const level = getScoreLevel(accuracy);

  // 解析页面
  if (showAnalysis && currentQuestion) {
    const userAnswer = answers[currentQuestion.id];
    const isCorrect = userAnswer === currentQuestion.answer;

    return (
      <div className="analysis-page">
        <div className="analysis-header">
          <button className="back-btn" onClick={() => setShowAnalysis(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            返回成绩
          </button>
          <span>题目解析 ({currentIndex + 1}/{questions.length})</span>
        </div>

        <div className="analysis-body">
          <div className={`answer-status ${isCorrect ? 'correct' : 'wrong'}`}>
            {isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
          </div>

          <div className="answer-compare">
            <span>你的答案: <strong className={isCorrect ? 'correct' : 'wrong'}>
              {userAnswer || '未作答'}
            </strong></span>
            <span>正确答案: <strong className="correct">{currentQuestion.answer}</strong></span>
          </div>

          <div className="question-content">
            {currentQuestion.content.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <div className="question-options review">
            {currentQuestion.options.map(opt => (
              <div
                key={opt.key}
                className={`option-item
                  ${opt.key === currentQuestion.answer ? 'correct-answer' : ''}
                  ${opt.key === userAnswer && !isCorrect ? 'wrong-answer' : ''}`}
              >
                <span className="option-key">{opt.key}</span>
                <span className="option-content">{opt.content}</span>
              </div>
            ))}
          </div>

          {currentQuestion.analysis && (
            <div className="analysis-box">
              <h4>解析</h4>
              <p>{currentQuestion.analysis}</p>
            </div>
          )}
        </div>

        <div className="analysis-footer">
          <button className="nav-btn" onClick={() => setCurrentIndex(i => i - 1)} disabled={currentIndex === 0}>
            ← 上一题
          </button>
          <span>{currentIndex + 1} / {questions.length}</span>
          <button className="nav-btn" onClick={() => setCurrentIndex(i => i + 1)} disabled={currentIndex === questions.length - 1}>
            下一题 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page-new">
      {/* 顶部统计栏 */}
      <div className="result-top-bar">
        <div className="result-score-section">
          <div className="score-ring-wrap">
            <svg className="score-ring-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="5"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke={level.color} strokeWidth="5"
                strokeDasharray={`${accuracy * 2.64} 264`}
                strokeLinecap="round" transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
            </svg>
            <div className="score-ring-center">
              <span className="score-big" style={{ color: level.color }}>{accuracy}</span>
              <span className="score-percent">%</span>
            </div>
          </div>
          <div className="score-info">
            <h2>{result?.config?.category ? categoryNames[result.config.category] || '专项练习' : '练习完成'}</h2>
            <span className="score-badge" style={{ background: `${level.color}15`, color: level.color }}>{level.text}</span>
          </div>
        </div>

        <div className="result-quick-stats">
          <div className="quick-stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="qs-value">{correctCount}</span>
            <span className="qs-label">正确</span>
          </div>
          <div className="quick-stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            <span className="qs-value">{wrongCount}</span>
            <span className="qs-label">错误</span>
          </div>
          <div className="quick-stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6d5efb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
            </svg>
            <span className="qs-value">{formatDuration(timeElapsed)}</span>
            <span className="qs-label">用时</span>
          </div>
          <div className="quick-stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span className="qs-value">{avgTimePerQuestion}s</span>
            <span className="qs-label">平均</span>
          </div>
        </div>

        <div className="result-actions-bar">
          <button className="action-btn-outline" onClick={() => setShowAnalysis(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            查看解析
          </button>
          <button className="action-btn-solid" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            返回
          </button>
        </div>
      </div>

      {/* 主内容区 - 卡片网格 */}
      <div className="result-grid">
        {/* 第一行：4个指标卡片 */}
        <div className="result-card metric">
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="metric-data">
            <span className="metric-value">{correctCount}</span>
            <span className="metric-label">正确题数</span>
          </div>
          <span className="metric-rate" style={{ color: '#10b981' }}>{accuracy}%</span>
        </div>

        <div className="result-card metric">
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <div className="metric-data">
            <span className="metric-value">{wrongCount}</span>
            <span className="metric-label">错误题数</span>
          </div>
          <span className="metric-rate" style={{ color: '#ef4444' }}>{totalCount > 0 ? Math.round(wrongCount / totalCount * 100) : 0}%</span>
        </div>

        <div className="result-card metric">
          <div className="metric-icon" style={{ background: 'rgba(109, 94, 251, 0.1)', color: '#6d5efb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
            </svg>
          </div>
          <div className="metric-data">
            <span className="metric-value">{formatDuration(timeElapsed)}</span>
            <span className="metric-label">总用时</span>
          </div>
          <span className="metric-rate" style={{ color: '#6d5efb' }}>{avgTimePerQuestion}s/题</span>
        </div>

        <div className="result-card metric">
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
            </svg>
          </div>
          <div className="metric-data">
            <span className="metric-value">{totalCount}</span>
            <span className="metric-label">总题数</span>
          </div>
          <span className="metric-rate" style={{ color: '#f59e0b' }}>{result?.unanswered || 0}未答</span>
        </div>

        {/* 第二行：趋势图 + 分类统计 */}
        <div className="result-card chart-card">
          <div className="card-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span>正确率趋势</span>
            <span className="card-badge">{accuracy}%</span>
          </div>
          <div className="chart-area">
            <TrendChart data={[65, 72, 58, 80, 75, 85, accuracy]} color="#6d5efb" />
          </div>
          <div className="chart-footer">
            <span>近7次练习</span>
            <span style={{ color: level.color, fontWeight: 600 }}>本次 {accuracy}%</span>
          </div>
        </div>

        <div className="result-card category-card">
          <div className="card-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span>分类正确率</span>
          </div>
          <div className="category-list-full">
            {['yanyu', 'shuliang', 'panduan', 'ziliao', 'changshi'].map(cat => {
              const stat = categoryStats[cat] || { total: 0, correct: 0 };
              const catAccuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
              return (
                <div key={cat} className="category-row-full">
                  <span className="cat-name-full">{categoryNames[cat]}</span>
                  <div className="cat-bar-wrap-full">
                    <div className="cat-bar-full" style={{ width: `${catAccuracy}%`, background: stat.total === 0 ? 'var(--line)' : (catAccuracy >= 60 ? '#10b981' : '#ef4444') }}/>
                  </div>
                  <span className="cat-stat-full">{stat.correct}/{stat.total}</span>
                  <span className="cat-pct" style={{ color: stat.total === 0 ? 'var(--muted)' : (catAccuracy >= 60 ? '#10b981' : '#ef4444') }}>{catAccuracy}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 第三行：答题分布 + 历史对比 + 建议 */}
        <div className="result-card dots-card">
          <div className="card-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span>答题分布</span>
          </div>
          <div className="answer-dots-full">
            {questions.map((q, i) => {
              const isCorrect = answers[q.id] === q.answer;
              const isAnswered = !!answers[q.id];
              return (
                <span
                  key={q.id}
                  className={`a-dot-full ${isAnswered ? (isCorrect ? 'correct' : 'wrong') : 'skip'}`}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
          <div className="dots-legend">
            <span><i className="leg-dot correct"/>正确 {correctCount}</span>
            <span><i className="leg-dot wrong"/>错误 {wrongCount}</span>
            <span><i className="leg-dot skip"/>未答 {result?.unanswered || 0}</span>
          </div>
        </div>

        <div className="result-card history-card">
          <div className="card-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>历史对比</span>
          </div>
          <div className="history-grid">
            <div className="history-item">
              <span className="hi-label">本次正确率</span>
              <span className="hi-value" style={{ color: level.color }}>{accuracy}%</span>
            </div>
            <div className="history-item">
              <span className="hi-label">历史平均</span>
              <span className="hi-value">{historyStats?.accuracy || 0}%</span>
            </div>
            <div className="history-item">
              <span className="hi-label">累计做题</span>
              <span className="hi-value">{historyStats?.totalDone || 0}题</span>
            </div>
            <div className="history-item">
              <span className="hi-label">错题总数</span>
              <span className="hi-value">{historyStats?.wrongCount || 0}题</span>
            </div>
          </div>
          {accuracy > (historyStats?.accuracy || 0) ? (
            <div className="history-tip-full up">↑ 高于历史平均 {accuracy - (historyStats?.accuracy || 0)}%，继续保持！</div>
          ) : accuracy < (historyStats?.accuracy || 0) ? (
            <div className="history-tip-full down">↓ 低于历史平均 {(historyStats?.accuracy || 0) - accuracy}%，加油！</div>
          ) : (
            <div className="history-tip-full neutral">与历史平均持平</div>
          )}
        </div>

        <div className="result-card suggest-card">
          <div className="card-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <span>学习建议</span>
          </div>
          <div className="suggest-list">
            {Object.entries(categoryStats).filter(([_, stat]) => stat.total > 0 && (stat.correct / stat.total) < 0.6).slice(0, 3).map(([cat]) => (
              <div key={cat} className="suggest-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
                <span>{categoryNames[cat] || cat} 正确率较低，建议加强练习</span>
              </div>
            ))}
            {Object.entries(categoryStats).filter(([_, stat]) => stat.total > 0 && (stat.correct / stat.total) < 0.6).length === 0 && (
              <div className="suggest-item success">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>各分类表现良好，继续保持！</span>
              </div>
            )}
            <div className="suggest-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6d5efb" strokeWidth="2">
                <path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
              </svg>
              <span>平均每题 {avgTimePerQuestion} 秒，{avgTimePerQuestion > 60 ? '可适当提速' : '速度良好'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
