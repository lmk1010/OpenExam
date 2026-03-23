import React, { useState, useEffect } from 'react';
import { getState } from '../store/examStore.js';

const categoryNames = {
  yanyu: '言语理解',
  shuliang: '数量关系',
  panduan: '判断推理',
  ziliao: '资料分析',
  changshi: '常识判断'
};

const categoryOrder = ['yanyu', 'shuliang', 'panduan', 'ziliao', 'changshi'];

const TrendChart = ({ data, color = 'var(--accent)' }) => {
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
      <polygon points={`0,100 ${pathPoints} 100,100`} fill="url(#trendGradient)" />
    </svg>
  );
};

export default function ExamResult({ result, onBack }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [historyStats, setHistoryStats] = useState(null);

  const questions = result?.questions || getState().currentQuestions || [];
  const rawAnswers = result?.answers || {};
  const answers = Object.entries(rawAnswers).reduce((acc, [questionId, value]) => {
    if (typeof value === 'string') {
      acc[questionId] = value;
      return acc;
    }
    if (value && typeof value === 'object') {
      acc[questionId] = value.userAnswer || value.answer || '';
      return acc;
    }
    acc[questionId] = '';
    return acc;
  }, {});
  const currentQuestion = questions[currentIndex];

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
    if (accuracy >= 90) return { text: '优秀', color: 'var(--success)', bg: 'var(--success-soft)' };
    if (accuracy >= 80) return { text: '良好', color: 'var(--accent)', bg: 'var(--accent-soft-bg)' };
    if (accuracy >= 60) return { text: '及格', color: 'var(--warning)', bg: 'var(--warning-soft)' };
    return { text: '需加强', color: 'var(--danger)', bg: 'var(--danger-soft)' };
  };

  const totalCount = result?.totalCount || questions.length;
  const correctCount = result?.correctCount || Object.keys(answers).filter(id => {
    const q = questions.find(item => item.id === id);
    return q && answers[id] === q.answer;
  }).length;
  const answeredCount = questions.filter(q => Boolean(answers[q.id])).length;
  const unansweredCount = result?.unanswered ?? Math.max(totalCount - answeredCount, 0);
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const timeElapsed = result?.timeElapsed || result?.duration || 0;
  const avgTimePerQuestion = totalCount > 0 ? Math.round(timeElapsed / totalCount) : 0;
  const wrongCount = result?.wrongCount ?? Math.max(answeredCount - correctCount, 0);

  const level = getScoreLevel(accuracy);
  const resultTitle = result?.paperTitle || result?.config?.title || (result?.config?.category ? categoryNames[result.config.category] || '专项练习' : '练习完成');
  const resultSubtitle = `${correctCount} 正确 · ${wrongCount} 错误 · ${formatDuration(timeElapsed)}`;
  const historyAccuracy = historyStats?.accuracy || 0;
  const historyDelta = accuracy - historyAccuracy;
  const historyReady = Boolean(historyStats?.totalDone);

  const categoryRows = categoryOrder.map(cat => {
    const stat = categoryStats[cat] || { total: 0, correct: 0 };
    const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    return {
      key: cat,
      name: categoryNames[cat],
      total: stat.total,
      correct: stat.correct,
      pct
    };
  });

  const weakCategories = categoryRows.filter(item => item.total > 0 && item.pct < 60);
  const trendSeed = historyReady ? historyAccuracy : Math.max(accuracy - 8, 54);
  const trendData = [
    trendSeed - 7,
    trendSeed + 2,
    trendSeed - 4,
    trendSeed + 6,
    Math.max(accuracy - 5, 0),
    Math.round((trendSeed + accuracy) / 2),
    accuracy
  ].map(value => Math.max(18, Math.min(100, value)));

  const suggestions = [];
  if (unansweredCount > 0) {
    suggestions.push({ type: 'warning', text: `本次仍有 ${unansweredCount} 题未作答，先补齐基础准确率。` });
  }
  weakCategories.slice(0, 2).forEach(item => {
    suggestions.push({ type: 'warning', text: `${item.name} 正确率仅 ${item.pct}%，建议单独刷题巩固。` });
  });
  suggestions.push({
    type: avgTimePerQuestion > 60 ? 'info' : 'success',
    text: `平均每题 ${avgTimePerQuestion} 秒，${avgTimePerQuestion > 60 ? '节奏偏慢，建议限时训练。' : '节奏稳定，可继续保持。'}`
  });
  if (suggestions.length < 3) {
    suggestions.push({ type: 'success', text: '当前表现较稳，继续按分类循环练习即可。' });
  }

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
            <span>你的答案: <strong className={isCorrect ? 'correct' : 'wrong'}>{userAnswer || '未作答'}</strong></span>
            <span>正确答案: <strong className="correct">{currentQuestion.answer}</strong></span>
          </div>

          <div className="question-content">
            {currentQuestion.content.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>

          <div className="question-options review">
            {currentQuestion.options.map(opt => (
              <div
                key={opt.key}
                className={`option-item ${opt.key === currentQuestion.answer ? 'correct-answer' : ''} ${opt.key === userAnswer && !isCorrect ? 'wrong-answer' : ''}`}
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
          <button className="nav-btn" onClick={() => setCurrentIndex(index => index - 1)} disabled={currentIndex === 0}>
            ← 上一题
          </button>
          <span>{currentIndex + 1} / {questions.length}</span>
          <button className="nav-btn" onClick={() => setCurrentIndex(index => index + 1)} disabled={currentIndex === questions.length - 1}>
            下一题 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page-new">
      <div className="result-shell">
        <div className="result-top-bar">
          <div className="result-score-section">
            <div className="score-ring-wrap">
              <svg className="score-ring-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="5"/>
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={level.color}
                  strokeWidth="5"
                  strokeDasharray={`${accuracy * 2.64} 264`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
              </svg>
              <div className="score-ring-center">
                <div className="score-ring-value">
                  <span className="score-big" style={{ color: level.color }}>{accuracy}</span>
                  <span className="score-percent">%</span>
                </div>
              </div>
            </div>
            <div className="score-info">
              <div className="score-info-row">
                <h2>{resultTitle}</h2>
                <span className="score-badge" style={{ background: level.bg, color: level.color }}>{level.text}</span>
              </div>
              <span className="score-subtext">{resultSubtitle}</span>
            </div>
          </div>

          <div className="result-quick-stats">
            <div className="quick-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="qs-value">{correctCount}</span>
              <span className="qs-label">正确</span>
            </div>
            <div className="quick-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <span className="qs-value">{wrongCount}</span>
              <span className="qs-label">错误</span>
            </div>
            <div className="quick-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 2"/>
              </svg>
              <span className="qs-value">{formatDuration(timeElapsed)}</span>
              <span className="qs-label">用时</span>
            </div>
            <div className="quick-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        <div className="result-body">
          <div className="result-board">
            <div className="result-strip">
              <div className="strip-cell">
                <div className="strip-icon success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div className="strip-copy">
                  <span className="strip-value">{correctCount}</span>
                  <span className="strip-label">答对题数</span>
                </div>
                <span className="strip-meta success">{accuracy}%</span>
              </div>

              <div className="strip-cell">
                <div className="strip-icon danger">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </div>
                <div className="strip-copy">
                  <span className="strip-value">{wrongCount}</span>
                  <span className="strip-label">答错题数</span>
                </div>
                <span className="strip-meta danger">{totalCount > 0 ? Math.round((wrongCount / totalCount) * 100) : 0}%</span>
              </div>

              <div className="strip-cell">
                <div className="strip-icon accent">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 7v5l3 2"/>
                  </svg>
                </div>
                <div className="strip-copy">
                  <span className="strip-value">{formatDuration(timeElapsed)}</span>
                  <span className="strip-label">总用时</span>
                </div>
                <span className="strip-meta accent">{avgTimePerQuestion}s/题</span>
              </div>

              <div className="strip-cell">
                <div className="strip-icon warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M9 21V9"/>
                  </svg>
                </div>
                <div className="strip-copy">
                  <span className="strip-value">{totalCount}</span>
                  <span className="strip-label">总题数</span>
                </div>
                <span className="strip-meta warning">{unansweredCount} 未答</span>
              </div>
            </div>

            <div className="result-main-row">
              <section className="board-section section-trend">
                <div className="section-heading">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  <span>正确率趋势</span>
                  <span className="heading-badge" style={{ color: level.color }}>{level.text}</span>
                </div>
                <div className="trend-summary-line">
                  <span>{historyReady ? '结合历史练习趋势' : '开始积累你的练习趋势'}</span>
                  <strong style={{ color: level.color }}>本次 {accuracy}%</strong>
                </div>
                <div className="chart-area dense">
                  <TrendChart data={trendData} color="var(--accent)" />
                </div>
                <div className="chart-footer dense">
                  <span>{historyReady ? `历史均值 ${historyAccuracy}%` : '暂无历史均值'}</span>
                  <span>{resultSubtitle}</span>
                </div>
              </section>

              <section className="board-section section-category">
                <div className="section-heading">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <span>分类正确率</span>
                </div>
                <div className="category-table-dense">
                  {categoryRows.map(item => (
                    <div key={item.key} className="category-row-dense">
                      <span className="cat-name-dense">{item.name}</span>
                      <div className="cat-progress-dense">
                        <div className="cat-bar-wrap-dense">
                          <div
                            className="cat-bar-dense"
                            style={{
                              width: `${item.pct}%`,
                              background: item.total === 0 ? 'var(--line)' : (item.pct >= 60 ? 'var(--success)' : 'var(--danger)')
                            }}
                          />
                        </div>
                        <span className="cat-stat-dense">{item.correct}/{item.total}</span>
                      </div>
                      <span className={`cat-pct-dense ${item.pct >= 60 ? 'good' : 'weak'} ${item.total === 0 ? 'empty' : ''}`}>
                        {item.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="result-detail-row">
              <section className="board-section section-answer">
                <div className="section-heading">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  <span>答题分布</span>
                  <span className="heading-badge subtle">共 {totalCount} 题</span>
                </div>
                <div className="dots-legend dense">
                  <span><i className="leg-dot correct"/>正确 {correctCount}</span>
                  <span><i className="leg-dot wrong"/>错误 {wrongCount}</span>
                  <span><i className="leg-dot skip"/>未答 {unansweredCount}</span>
                </div>
                <div className="answer-dots-full dense">
                  {questions.map((question, index) => {
                    const answered = Boolean(answers[question.id]);
                    const correct = answers[question.id] === question.answer;
                    return (
                      <span
                        key={question.id}
                        className={`a-dot-full ${answered ? (correct ? 'correct' : 'wrong') : 'skip'}`}
                      >
                        {index + 1}
                      </span>
                    );
                  })}
                </div>
              </section>

              <div className="result-side-panel">
                <section className="board-section section-history">
                  <div className="section-heading">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>历史对比</span>
                  </div>
                  <div className="history-compact-grid">
                    <div className="history-cell">
                      <span className="hi-label">本次正确率</span>
                      <span className="hi-value" style={{ color: level.color }}>{accuracy}%</span>
                    </div>
                    <div className="history-cell">
                      <span className="hi-label">历史平均</span>
                      <span className="hi-value">{historyAccuracy}%</span>
                    </div>
                    <div className="history-cell">
                      <span className="hi-label">累计做题</span>
                      <span className="hi-value">{historyStats?.totalDone || 0}题</span>
                    </div>
                    <div className="history-cell">
                      <span className="hi-label">错题总数</span>
                      <span className="hi-value">{historyStats?.wrongCount || 0}题</span>
                    </div>
                  </div>
                  <div className={`history-inline-tip ${historyDelta > 0 ? 'up' : historyDelta < 0 ? 'down' : 'neutral'}`}>
                    {historyReady ? (historyDelta > 0 ? `高于历史平均 ${historyDelta}%` : historyDelta < 0 ? `低于历史平均 ${Math.abs(historyDelta)}%` : '与历史平均持平') : '完成更多练习后显示历史对比'}
                  </div>
                </section>

                <section className="board-section section-suggest">
                  <div className="section-heading">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4"/>
                      <path d="M12 8h.01"/>
                    </svg>
                    <span>学习建议</span>
                  </div>
                  <div className="suggest-rows">
                    {suggestions.slice(0, 4).map((item, index) => (
                      <div key={`${item.text}-${index}`} className={`suggest-row ${item.type}`}>
                        <span className="suggest-dot"/>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
