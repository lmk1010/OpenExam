import React, { useEffect, useState } from "react";
import PaperList from "./pages/PaperList.jsx";
import PracticeModule from "./pages/PracticeModule.jsx";
import PracticeHistory from "./pages/PracticeHistory.jsx";
import ExamRoom from "./pages/ExamRoom.jsx";
import ExamResult from "./pages/ExamResult.jsx";
import ImportPaper from "./pages/ImportPaper.jsx";
import Settings from "./pages/Settings.jsx";
import AITeacher from "./pages/AITeacher.jsx";
import AIGenerate from "./pages/AIGenerate.jsx";
import WrongBook from "./pages/WrongBook.jsx";
import Analytics from "./pages/Analytics.jsx";
import GrowthCenter from "./pages/GrowthCenter.jsx";
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
  const [practiceQuestions, setPracticeQuestions] = useState(null); // 专项练习题目
  const [practiceConfig, setPracticeConfig] = useState(null); // 练习配置

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (window.openexam?.setTheme) {
      window.openexam.setTheme(theme);
    }
  }, [theme]);

  const handleStartExam = async (paperId) => {
    await actions.startExam(paperId);
    setCurrentPaperId(paperId);
    setPage("exam");
  };

  const handleFinishExam = (result) => {
    setExamResult(result);
    setPage("result");
  };

  // 开始专项练习
  const handleStartPractice = async (category, subCategory, config) => {
    console.log('开始练习:', category, subCategory, config);

    if (!window.openexam?.db) {
      alert('数据库未连接');
      return;
    }

    try {
      const questions = await window.openexam.db.getQuestionsByCategory(
        category,
        subCategory,
        config?.questionCount || 10,
        config?.shuffle !== false
      );

      if (questions.length === 0) {
        alert('该分类暂无题目');
        return;
      }

      setPracticeQuestions(questions);
      setPracticeConfig({ ...config, category, subCategory });
      setPage("practice-exam");
    } catch (err) {
      console.error('加载题目失败:', err);
      alert('加载题目失败');
    }
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
    const tabPageMap = {
      "学习中心": "home",
      "题库练习": "practice",
      "模拟考试": "papers",
      "AI出卷": "ai-generate",
      "我的成长": "growth",
    };
    setPage(tabPageMap[tab] || "home");
  };

  // 考试模式全屏
  if (page === "exam" && currentPaperId) {
    return (
      <div className={`app theme-${theme}`}>
        <ExamRoom paperId={currentPaperId} onFinish={handleFinishExam} onExit={handleExitExam} />
      </div>
    );
  }

  // 专项练习模式
  if (page === "practice-exam" && practiceQuestions) {
    return (
      <div className={`app theme-${theme}`}>
        <ExamRoom
          questions={practiceQuestions}
          config={practiceConfig}
          onFinish={handleFinishExam}
          onExit={() => {
            if (confirm("确定退出吗？当前答题进度将丢失。")) {
              setPracticeQuestions(null);
              setPracticeConfig(null);
              setPage("practice");
            }
          }}
        />
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
            {/* 错题本 */}
            <button className={`rail-icon ${page === 'wrong-book' ? 'active' : ''}`} title="错题本" onClick={() => { setActiveTab(''); setPage('wrong-book'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/>
              </svg>
            </button>
            {/* 分析报告 */}
            <button className={`rail-icon ${page === 'analytics' ? 'active' : ''}`} title="分析报告" onClick={() => { setActiveTab(''); setPage('analytics'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
            </button>
            {/* AI 老师 */}
            <button className={`rail-icon ${page === 'ai-teacher' ? 'active' : ''}`} title="AI 老师" onClick={() => { setActiveTab(''); setPage('ai-teacher'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/>
                <path d="M8 10h.01M12 10h.01M16 10h.01"/>
              </svg>
            </button>
          </div>
          <div className="rail-divider" />
          <div className="rail-bottom">
            <button className={`rail-bottom-icon ${!['wrong-book','analytics','ai-teacher'].includes(page) ? 'active' : ''}`} title="工作区" onClick={() => { setActiveTab('学习中心'); setPage('home'); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10.5V6.5a2 2 0 00-2-2h-4a2 2 0 00-2 2v4a2 2 0 002 2h4"/>
                <path d="M14 17.5v-4a2 2 0 00-2-2H8a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2z"/>
              </svg>
            </button>
            <button className="rail-bottom-icon" title="设置" onClick={() => setPage('settings')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
          </div>
          <button className="rail-chat" title="AI 老师" onClick={() => { setActiveTab(''); setPage('ai-teacher'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14a2 2 0 01-2 2H9l-4 4V6a2 2 0 012-2h10a2 2 0 012 2v8z"/>
            </svg>
          </button>
        </aside>

        <section className="workspace">
          <header className="workspace-header">
            <nav className="tabs">
              {["学习中心", "题库练习", "模拟考试", "AI出卷", "我的成长"].map(tab => (
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
                <button className="settings-btn" onClick={() => setPage("settings")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              </div>
            </div>
          </header>

          <div className="workspace-body">
            {page === "papers" ? (
              <PaperList onStartExam={handleStartExam} />
            ) : page === "practice" ? (
              <PracticeModule onImport={() => setPage("import")} onStartPractice={handleStartPractice} onHistory={() => setPage("history")} />
            ) : page === "history" ? (
              <PracticeHistory onBack={() => setPage("practice")} />
            ) : page === "import" ? (
              <ImportPaper
                onBack={() => setPage("practice")}
                onImportComplete={(data) => { console.log('导入数据:', data); setPage("practice"); }}
              />
            ) : page === "settings" ? (
              <Settings onBack={() => setPage("home")} />
            ) : page === "ai-generate" ? (
              <AIGenerate />
            ) : page === "ai-teacher" ? (
              <AITeacher />
            ) : page === "wrong-book" ? (
              <WrongBook />
            ) : page === "analytics" ? (
              <Analytics />
            ) : page === "growth" ? (
              <GrowthCenter />
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
  const [stats, setStats] = useState({ totalQuestions: 0, totalDone: 0, accuracy: 0, wrongCount: 0, correctCount: 0, todayAdded: 0 });
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

  const categoryIcons = {
    yanyu: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
    shuliang: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
    panduan: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    ziliao: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
    changshi: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  };

  const totalQuestions = categories.reduce((sum, c) => sum + c.total, 0);

  return (
    <>
      <section className="main-panel">
        <div className="breadcrumb">学习中心 &gt; 行测专项</div>
        <div className="brand-row">
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
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
              <svg className="tips-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
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
                  {categoryIcons[cat.category] || <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
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
              <div className="list-icon exam">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <span>今日新增</span>
                <strong>{stats.todayAdded || 0}题</strong>
              </div>
            </div>
            <div className="list-item">
              <div className="list-icon news">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div>
                <span>今日已练</span>
                <strong>{stats.totalDone}题</strong>
              </div>
            </div>
            <div className="list-item">
              <div className="list-icon tips">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <span>正确数</span>
                <strong>{stats.correctCount}题</strong>
              </div>
            </div>
            <div className="list-item">
              <div className="list-icon policy">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/></svg>
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

