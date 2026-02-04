import React, { useEffect, useState } from "react";
import PaperList from "./pages/PaperList.jsx";
import PracticeModule from "./pages/PracticeModule.jsx";
import ExamRoom from "./pages/ExamRoom.jsx";
import ExamResult from "./pages/ExamResult.jsx";
import { actions, getState } from "./store/examStore.js";

const ChartLines = () => (
  <svg className="chart-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="chartPrimary" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#6d5efb" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#6d5efb" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="chartGhost" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6d5efb" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#6d5efb" stopOpacity="0.05" />
      </linearGradient>
    </defs>
    <line x1="0" y1="15" x2="100" y2="15" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="40" x2="100" y2="40" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="65" x2="100" y2="65" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    <path d="M0 65 C12 50, 20 70, 32 58 C44 42, 52 60, 62 48 C74 30, 86 45, 100 52 L100 100 L0 100 Z" fill="url(#areaGradient)" />
    <path d="M0 65 C12 50, 20 70, 32 58 C44 42, 52 60, 62 48 C74 30, 86 45, 100 52" fill="none" stroke="url(#chartPrimary)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    <path d="M0 75 C12 62, 20 80, 32 70 C44 58, 56 75, 66 65 C78 55, 88 68, 100 72" fill="none" stroke="url(#chartGhost)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>
);

export default function App() {
  const [theme, setTheme] = useState("light");
  const [page, setPage] = useState("home");
  const [currentPaperId, setCurrentPaperId] = useState(null);
  const [examResult, setExamResult] = useState(null);
  const [activeTab, setActiveTab] = useState("学习中心");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (window.openexam?.setTheme) {
      window.openexam.setTheme(theme);
    }
  }, [theme]);

  const handleStartExam = (paperId) => {
    actions.startExam(paperId);
    setCurrentPaperId(paperId);
    setPage("exam");
  };

  const handleFinishExam = (result) => {
    setExamResult(result);
    setPage("result");
  };

  const handleExitExam = () => {
    if (confirm("确定退出吗？当前答题进度将丢失。")) {
      actions.resetExam();
      setPage("papers");
    }
  };

  const handleBackToList = () => {
    actions.resetExam();
    setExamResult(null);
    setPage("papers");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "题库练习") {
      setPage("practice");
    } else if (tab === "模拟考试") {
      setPage("papers");
    } else {
      setPage("home");
    }
  };

  // 考试模式全屏
  if (page === "exam" && currentPaperId) {
    return (
      <div className={`app theme-${theme}`}>
        <ExamRoom paperId={currentPaperId} onFinish={handleFinishExam} onExit={handleExitExam} />
      </div>
    );
  }

  // 结果页全屏
  if (page === "result" && examResult) {
    return (
      <div className={`app theme-${theme}`}>
        <ExamResult result={examResult} onBack={handleBackToList} />
      </div>
    );
  }

  return (
    <div className={`app theme-${theme}`}>
      <div className="frame">
        <aside className="rail">
          <button className="rail-menu" aria-label="菜单">
            <span /><span /><span />
          </button>
          <div className="rail-icons">
            <div className="rail-slider" />
            <button className="rail-icon bitcoin">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M13.5 4.5V3h-1.5v1.5h-1.5V3H9v1.5H7v1.5h1v12H7v1.5h2V21h1.5v-1.5H12V21h1.5v-1.5c2.5-.3 4.5-2.1 4.5-4.5 0-1.6-.9-3-2.2-3.8.8-.7 1.2-1.7 1.2-2.7 0-2.2-1.7-4-4-4.5V4.5h-1.5zm-3 3h3c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5h-3v-5zm0 6.5v5h3.5c1.4 0 2.5-1.1 2.5-2.5s-1.1-2.5-2.5-2.5h-3.5z"/>
              </svg>
            </button>
            <button className="rail-icon analytics">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 4a1 1 0 011 1v14a1 1 0 11-2 0V5a1 1 0 011-1zM7 8a1 1 0 011 1v10a1 1 0 11-2 0V9a1 1 0 011-1zm10 4a1 1 0 011 1v6a1 1 0 11-2 0v-6a1 1 0 011-1z"/>
              </svg>
            </button>
            <button className="rail-icon airbnb">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.5 2 6 5.5 6 9c0 2.5 1.5 5 3.5 7.5.8 1 1.7 2 2.5 3 .8-1 1.7-2 2.5-3C16.5 14 18 11.5 18 9c0-3.5-2.5-7-6-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z"/>
              </svg>
            </button>
          </div>
          <div className="rail-divider" />
          <div className="rail-bottom">
            <button className="rail-bottom-icon active">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10.5V6.5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4a2 2 0 002 2h4"/>
                <path d="M14 17.5v-4a2 2 0 00-2-2H8a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2z"/>
              </svg>
            </button>
            <button className="rail-bottom-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8"/>
                <path d="M12 8v4l2.5 2.5"/>
              </svg>
            </button>
          </div>
          <button className="rail-chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14a2 2 0 01-2 2H9l-4 4V6a2 2 0 012-2h10a2 2 0 012 2v8z"/>
            </svg>
          </button>
        </aside>

        <section className="workspace">
          <header className="workspace-header">
            <nav className="tabs">
              {["学习中心", "题库练习", "模拟考试"].map(tab => (
                <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => handleTabChange(tab)}>
                  {tab}
                </button>
              ))}
            </nav>
            <div className="header-actions">
              <button className="search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
              <div className="header-divider"></div>
              <div className="user">
                <span className="user-name">考生用户</span>
                <div className="avatar-wrap">
                  <div className="avatar" />
                  <svg className="avatar-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </div>
                <button className="theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                  {theme === "light" ? "☾" : "☀"}
                </button>
              </div>
            </div>
          </header>

          <div className="workspace-body">
            {page === "papers" ? (
              <PaperList onStartExam={handleStartExam} />
            ) : page === "practice" ? (
              <PracticeModule />
            ) : (
              <OriginalHomePage ChartLines={ChartLines} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// 原始主页组件
function OriginalHomePage({ ChartLines }) {
  const [stats, setStats] = useState({ totalQuestions: 0, totalDone: 0, accuracy: 0, wrongCount: 0, correctCount: 0 });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      if (!window.openexam?.db) return;
      try {
        const practiceStats = await window.openexam.db.getPracticeStats();
        const categoryStats = await window.openexam.db.getCategoryStats();
        setStats(practiceStats);
        setCategories(categoryStats);
      } catch (err) {
        console.error('加载统计数据失败:', err);
      }
    };
    loadData();
  }, []);

  const categoryNames = {
    yanyu: '言语理解',
    shuliang: '数量关系',
    panduan: '判断推理',
    ziliao: '资料分析',
    changshi: '常识判断'
  };

  const totalQuestions = categories.reduce((sum, c) => sum + c.total, 0);

  return (
    <>
      <section className="main-panel">
        <div className="breadcrumb">学习中心 &gt; 行测专项</div>
        <div className="brand-row">
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <h2>公考刷题</h2>
          <button className="add-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">
              <h4>刷题统计</h4>
              <svg className="tips-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <div className="chart-controls">
              <div className="chart-legend">
                <span className="chart-legend-line primary"></span>
                <span className="chart-legend-line ghost"></span>
              </div>
              <span>本月练习</span>
              <button className="chip">2025年2月</button>
            </div>
          </div>
          <div className="chart-grid">
            <div className="chart-scale">
              {["200题", "400题", "600题", "800题"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="chart-canvas">
              <ChartLines />
              <div className="chart-marker">
                <span className="tooltip">
                  <small>累计已做</small>
                  <strong>{stats.totalDone.toLocaleString()}</strong>
                  <em>道题</em>
                </span>
                <div className="marker-dot" />
                <div className="marker-line" />
              </div>
              <div className="chart-axis">
                {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((day, index) => (
                  <span key={index}>{day}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bottom-row">
          <div className="info-card distribution">
            <div className="info-header">
              <h4>题型分布</h4>
              <span className="info-dot" />
            </div>
            <div className="donut">
              <div className="donut-ring">
                <div className="donut-inner">
                  <span>{totalQuestions.toLocaleString()}</span>
                  <small>总题数</small>
                </div>
              </div>
            </div>
            <div className="legend">
              {categories.slice(0, 3).map((cat, idx) => (
                <div key={cat.category} className="legend-item">
                  <span className={`legend-dot ${idx === 1 ? 'mid' : idx === 2 ? 'light' : ''}`}></span>
                  <div className="legend-text">
                    <span className="legend-label">{categoryNames[cat.category] || cat.category}</span>
                    <strong>{cat.total.toLocaleString()} 道</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="info-card">
            <div className="info-header">
              <h4>正确率统计</h4>
              <span className="info-dot" />
            </div>
            <div className="accuracy-content">
              <div className="active-total">
                <strong>{stats.accuracy}%</strong>
                <span>综合正确率</span>
              </div>
              <div className="progress">
                <span className="progress-fill" style={{ width: `${stats.accuracy}%` }} />
              </div>
              <div className="active-split">
                <div className="split-item">
                  <span className="split-dot"></span>
                  <span className="split-label">已掌握</span>
                </div>
                <div className="split-item">
                  <span className="split-dot light"></span>
                  <span className="split-label">待加强</span>
                </div>
              </div>
              <div className="active-split values">
                <div><span className="split-value">{stats.correctCount.toLocaleString()} 道</span></div>
                <div><span className="split-value">{stats.wrongCount.toLocaleString()} 道</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="side-panel">
        <div className="side-section">
          <div className="side-section-title">
            <h4>热门题库</h4>
            <span className="info-dot" />
          </div>
          <div className="side-card list">
            {categories.map(cat => (
              <div key={cat.category} className="list-item">
                <div className={`list-icon ${cat.category === 'yanyu' ? 'exam' : cat.category === 'shuliang' ? 'math' : cat.category === 'panduan' ? 'logic' : cat.category === 'ziliao' ? 'policy' : 'tips'}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>
                </div>
                <div>
                  <span>{categoryNames[cat.category] || cat.category}</span>
                  <strong>{cat.total.toLocaleString()}题</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="side-section">
          <div className="side-section-title">
            <h4>学习进度</h4>
            <span className="info-dot" />
          </div>
          <div className="side-card income">
            <div className="income-left">
              <div className="income-ring">
                <span>{totalQuestions > 0 ? Math.round(stats.totalDone / totalQuestions * 100) : 0}%</span>
              </div>
            </div>
            <div className="income-center">
              <span className="income-label">完成进度</span>
            </div>
            <div className="income-right">
              <span className="income-change">+{stats.accuracy}%</span>
            </div>
          </div>
        </div>

        <div className="side-section">
          <div className="side-section-title">
            <h4>最近练习</h4>
            <span className="info-dot" />
          </div>
          <div className="side-card list">
            <div className="list-item">
              <div className="list-icon news">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
              </div>
              <div>
                <span>今日已练</span>
                <strong>{stats.totalDone}题</strong>
              </div>
            </div>
            <div className="list-item">
              <div className="list-icon tips">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <div>
                <span>正确数</span>
                <strong>{stats.correctCount}题</strong>
              </div>
            </div>
            <div className="list-item">
              <div className="list-icon policy">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </div>
              <div>
                <span>错题数</span>
                <strong>{stats.wrongCount}题</strong>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
