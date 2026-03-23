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
import AchievementCenter from "./pages/AchievementCenter.jsx";
import OnboardingTour from "./components/OnboardingTour.jsx";
import { actions, getState } from "./store/examStore.js";
import { normalizeAISettings } from "./store/aiSettings.js";

const DynamicChart = ({ data, onHover }) => {
  const containerRef = React.useRef(null);
  const [dims, setDims] = React.useState({ w: 600, h: 130 });
  const [animated, setAnimated] = React.useState(false);
  const [hoverIdx, setHoverIdx] = React.useState(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) setDims({ w: width, h: height });
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, [data, dims.w]);

  const W = dims.w, H = dims.h;
  const PAD_R = 8, PAD_T = 10, PAD_B = 8;
  const chartW = W - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const hasData = data && data.length > 0 && data.some(d => d.total > 0);

  if (!hasData) {
    return (
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
        <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.5 }}>开始练习后将显示趋势</span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.total), 1);

  const pts = data.map((d, i) => ({
    x: data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW,
    y: PAD_T + chartH * (1 - d.total / maxVal),
    ...d
  }));

  const toPath = (points) => points.map((p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const prev = points[i - 1];
    const cpx = ((prev.x + p.x) / 2).toFixed(1);
    return `C${cpx},${prev.y.toFixed(1)} ${cpx},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  const linePath = toPath(pts);
  const bottomY = (PAD_T + chartH).toFixed(1);
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${bottomY} L${pts[0].x.toFixed(1)},${bottomY} Z`;
  const pathLen = W * 2;
  const gridYs = [0.25, 0.5, 0.75].map(t => PAD_T + chartH * (1 - t));
  const activeIdx = hoverIdx !== null ? hoverIdx : pts.length - 1;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}
      onMouseLeave={() => { setHoverIdx(null); onHover?.(null); }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="dcLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#6d5efb" stopOpacity="0.65"/>
            <stop offset="100%" stopColor="#8b7dfc" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="dcArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d5efb" stopOpacity="0.16"/>
            <stop offset="100%" stopColor="#6d5efb" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* 网格线 */}
        {gridYs.map((y, i) => (
          <line key={i} x1="0" y1={y.toFixed(1)} x2={W} y2={y.toFixed(1)}
            stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"/>
        ))}
        <line x1="0" y1={bottomY} x2={W} y2={bottomY}
          stroke="currentColor" strokeOpacity="0.1" strokeWidth="1"/>

        {/* 面积 */}
        <path d={areaPath} fill="url(#dcArea)"/>

        {/* 折线动画 */}
        <path d={linePath} fill="none" stroke="url(#dcLine)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={`${pathLen} ${pathLen}`}
          strokeDashoffset={animated ? 0 : pathLen}
          style={{ transition: animated ? 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' : 'none' }}
        />

        {/* 活跃竖虚线 */}
        {pts[activeIdx] && (
          <line x1={pts[activeIdx].x.toFixed(1)} y1={PAD_T}
            x2={pts[activeIdx].x.toFixed(1)} y2={bottomY}
            stroke="#6d5efb" strokeWidth="1" strokeDasharray="3,3" opacity="0.3"/>
        )}

        {/* hover 触发热区 */}
        {pts.map((p, i) => {
          const prevX = i > 0 ? (pts[i-1].x + p.x) / 2 : 0;
          const nextX = i < pts.length - 1 ? (pts[i+1].x + p.x) / 2 : W;
          return (
            <rect key={i} x={prevX} y={0} width={nextX - prevX} height={H}
              fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={() => { setHoverIdx(i); onHover?.(p); }}/>
          );
        })}
      </svg>

      {/* 正圆数据点 — 用 div 避免 SVG 变形 */}
      {animated && pts.map((p, i) => {
        const active = i === activeIdx;
        return (
          <div key={i} style={{
            position: 'absolute', pointerEvents: 'none',
            left: p.x, top: p.y,
            transform: 'translate(-50%, -50%)',
            width: active ? 10 : 6, height: active ? 10 : 6,
            borderRadius: '50%',
            background: active ? '#fff' : 'rgba(109,94,251,0.7)',
            border: active ? '2.5px solid #6d5efb' : 'none',
            boxShadow: active ? '0 0 0 3px rgba(109,94,251,0.15), 0 2px 8px rgba(109,94,251,0.3)' : 'none',
            transition: 'all 0.15s ease',
          }}/>
        );
      })}
    </div>
  );
};


export default function App() {
  const ONBOARDING_STORAGE_KEY = "openexam_onboarding_done_v1";
  const [theme, setTheme] = useState("light");
  const [page, setPage] = useState("home");
  const [currentPaperId, setCurrentPaperId] = useState(null);
  const [examResult, setExamResult] = useState(null);
  const [resultReturnPage, setResultReturnPage] = useState("papers");
  const [activeTab, setActiveTab] = useState("学习中心");
  const [practiceQuestions, setPracticeQuestions] = useState(null); // 专项练习题目
  const [practiceConfig, setPracticeConfig] = useState(null); // 练习配置
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (window.openexam?.setTheme) {
      window.openexam.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    const syncAISettingsFromSQLite = async () => {
      try {
        if (!window.openexam?.db?.getAISettings) return;
        const sqliteSettings = await window.openexam.db.getAISettings();
        if (sqliteSettings && typeof sqliteSettings === "object") {
          localStorage.setItem("openexam_settings", JSON.stringify(normalizeAISettings(sqliteSettings)));
        }
      } catch (error) {
        console.error("同步 AI 配置失败:", error);
      }
    };
    syncAISettingsFromSQLite();
  }, []);

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
      if (!done) setShowOnboarding(true);
    } catch (error) {
      setShowOnboarding(true);
    }
  }, []);

  const finishOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    } catch (error) {
      // ignore storage failures
    }
    setShowOnboarding(false);
  };

  const handleOnboardingNavigate = ({ page: targetPage, tab }) => {
    if (tab !== undefined) setActiveTab(tab);
    if (targetPage) setPage(targetPage);
  };

  const onboarding = (
    <OnboardingTour
      open={showOnboarding}
      onFinish={finishOnboarding}
      onSkip={finishOnboarding}
      onNavigate={handleOnboardingNavigate}
    />
  );

  const getReturnTab = (targetPage) => ({
    practice: "题库练习",
    papers: "模拟考试",
    "ai-generate": "AI出卷",
  }[targetPage] || "学习中心");

  const handleStartExam = async (paperId, options = {}) => {
    await actions.startExam(paperId);
    setCurrentPaperId(paperId);
    setResultReturnPage(options.returnPage || "papers");
    setPage("exam");
  };

  const handleStartSavedPractice = async (paperId, paperTitle, returnPage = "practice") => {
    if (!window.openexam?.db?.getQuestions) {
      alert('数据库未连接');
      return;
    }

    try {
      const questions = await window.openexam.db.getQuestions(paperId);
      if (!questions.length) {
        alert('该练习暂无题目');
        return;
      }
      setPracticeQuestions(questions);
      setPracticeConfig({ mode: 'practice', title: paperTitle || 'AI 自定义练习', sourcePaperId: paperId });
      setResultReturnPage(returnPage);
      setPage("practice-exam");
    } catch (err) {
      console.error('加载练习失败:', err);
      alert('加载练习失败');
    }
  };

  const handleOpenPaper = async (paper, returnPage = "papers") => {
    const target = paper && typeof paper === 'object' ? paper : { id: paper };
    if (!target?.id) return;
    if (target.type === 'ai_practice') {
      await handleStartSavedPractice(target.id, target.title, returnPage);
      return;
    }
    await handleStartExam(target.id, { returnPage });
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
      setResultReturnPage("practice");
      setPage("practice-exam");
    } catch (err) {
      console.error('加载题目失败:', err);
      alert('加载题目失败');
    }
  };

  const handleExitExam = () => {
    actions.resetExam();
    setCurrentPaperId(null);
    setActiveTab(getReturnTab(resultReturnPage));
    setPage(resultReturnPage);
  };

  const handleBackToList = () => {
    actions.resetExam();
    setExamResult(null);
    setCurrentPaperId(null);
    setPracticeQuestions(null);
    setPracticeConfig(null);
    setActiveTab(getReturnTab(resultReturnPage));
    setPage(resultReturnPage);
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
        {onboarding}
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
            setPracticeQuestions(null);
            setPracticeConfig(null);
            setActiveTab(getReturnTab(resultReturnPage));
            setPage(resultReturnPage);
          }}
        />
        {onboarding}
      </div>
    );
  }

  // 结果页全屏
  if (page === "result" && examResult) {
    return (
      <div className={`app theme-${theme}`}>
        <ExamResult result={examResult} onBack={handleBackToList} />
        {onboarding}
      </div>
    );
  }

  return (
    <div className={`app theme-${theme}`}>
      <div className={`frame ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
        <aside className="rail">
          <button className="rail-menu" aria-label="菜单" onClick={() => setSidebarExpanded(!sidebarExpanded)}>
            <span /><span /><span />
          </button>
          <div className="rail-icons">
            <div className="rail-slider" />
            {/* 错题本 */}
            <button className={`rail-icon wrong-book ${page === 'wrong-book' ? 'active' : ''}`} data-tip="错题本" onClick={() => { setActiveTab(''); setPage('wrong-book'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/>
              </svg>
              <span className="rail-icon-text">错题本</span>
            </button>
            {/* 分析报告 */}
            <button className={`rail-icon analytics ${page === 'analytics' ? 'active' : ''}`} data-tip="分析报告" onClick={() => { setActiveTab(''); setPage('analytics'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              <span className="rail-icon-text">分析报告</span>
            </button>
            {/* AI 老师 */}
            <button className={`rail-icon ai-teacher ${page === 'ai-teacher' ? 'active' : ''}`} data-tip="AI 老师" onClick={() => { setActiveTab(''); setPage('ai-teacher'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/>
                <path d="M8 10h.01M12 10h.01M16 10h.01"/>
              </svg>
              <span className="rail-icon-text">AI 老师</span>
            </button>
          </div>
          <div className="rail-divider" />
          <div className="rail-bottom">
            <button className={`rail-bottom-icon home-icon ${!['wrong-book','analytics','ai-teacher'].includes(page) ? 'active' : ''}`} data-tip="工作区" onClick={() => { setActiveTab('学习中心'); setPage('home'); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span className="rail-icon-text">主控制台</span>
            </button>
            <button className="rail-bottom-icon settings-icon" data-tip="系统设置" onClick={() => setPage('settings')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              <span className="rail-icon-text">系统设置</span>
            </button>
          </div>
          <button className="rail-chat chat-icon" data-tip="AI 老师快捷问答" onClick={() => { setActiveTab(''); setPage('ai-teacher'); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14a2 2 0 01-2 2H9l-4 4V6a2 2 0 012-2h10a2 2 0 012 2v8z"/>
            </svg>
            <span className="rail-icon-text">快捷问答</span>
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
              <PaperList onOpenPaper={(paper) => handleOpenPaper(paper, 'papers')} />
            ) : page === "practice" ? (
              <PracticeModule onImport={() => setPage("import")} onStartPractice={handleStartPractice} onHistory={() => setPage("history")} />
            ) : page === "history" ? (
              <PracticeHistory onBack={() => setPage("practice")} />
            ) : page === "import" ? (
              <ImportPaper
                onBack={() => setPage("practice")}
                onImportComplete={(data) => {
                  console.log('导入数据:', data);
                  setActiveTab('模拟考试');
                  setPage("papers");
                }}
              />
            ) : page === "settings" ? (
              <Settings onBack={() => setPage("home")} />
            ) : page === "ai-generate" ? (
              <AIGenerate onOpenPaper={(paper) => handleOpenPaper(paper, 'ai-generate')} />
            ) : page === "ai-teacher" ? (
              <AITeacher />
            ) : page === "wrong-book" ? (
              <WrongBook />
            ) : page === "analytics" ? (
              <Analytics onOpenSettings={() => setPage("settings")} />
            ) : page === "growth" ? (
              <GrowthCenter onOpenAchievements={() => { setActiveTab("我的成长"); setPage("achievements"); }} />
            ) : page === "achievements" ? (
              <AchievementCenter onBack={() => { setActiveTab("我的成长"); setPage("growth"); }} />
            ) : (
              <OriginalHomePage />
            )}
          </div>
        </section>
      </div>
      {onboarding}
    </div>
  );
}

// 学习中心主页
function OriginalHomePage() {
  const [stats, setStats] = useState({ totalQuestions: 0, totalDone: 0, accuracy: 0, wrongCount: 0, correctCount: 0, todayAdded: 0 });
  const [categories, setCategories] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [hoverDay, setHoverDay] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!window.openexam?.db) return;
      try {
        const [practiceStats, categoryStats, daily] = await Promise.all([
          window.openexam.db.getPracticeStats(),
          window.openexam.db.getCategoryStats(),
          window.openexam.db.getDailyStats(7)
        ]);
        setStats(practiceStats);
        setCategories(categoryStats);
        setDailyStats(daily);
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

  const I = ({ d }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;

  const categoryIcons = {
    yanyu: <I d={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>} />,
    shuliang: <I d={<><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></>} />,
    panduan: <I d={<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />,
    ziliao: <I d={<><path d="M18 20V10M12 20V4M6 20v-6"/></>} />,
    changshi: <I d={<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></>} />,
  };

  const totalQuestions = categories.reduce((sum, c) => sum + c.total, 0);

  return (
    <>
      <section className="main-panel" style={{ padding: "0 24px 24px 20px", display: "flex", flexDirection: "column", gap: 32, overflow: "auto", minWidth: 0 }}>
        {/* Header */}
        <header style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div className="breadcrumb" style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>学习中心 &gt; 行测专项</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(109,94,251,0.1)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>公考刷题</h2>
            </div>
            <button style={{ 
              width: 32, height: 32, borderRadius: 10, border: "1px dashed var(--accent)", 
              background: "transparent", color: "var(--accent)", cursor: "pointer", 
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" 
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </header>

        {/* Chart Area - 动态真实数据 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>刷题统计</h3>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>近7天每日做题量</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {hoverDay ? (
                <span><strong style={{ color: "var(--text)", fontWeight: 600 }}>{hoverDay.total}</strong> 道 · {hoverDay.date?.slice(5)}</span>
              ) : (
                <span>累计 <strong style={{ color: "var(--accent)" }}>{stats.totalDone.toLocaleString()}</strong> 道</span>
              )}
            </div>
          </div>

          {(() => {
            const maxVal = Math.max(...dailyStats.map(d => d.total), 1);
            const yTicks = [maxVal, Math.round(maxVal*0.67), Math.round(maxVal*0.33), 0];
            const dayLabels = dailyStats.map(d => {
              const date = new Date(d.date);
              return ['日','一','二','三','四','五','六'][date.getDay()];
            });
            return (
              <div style={{ position: "relative", height: 180, display: "flex" }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8px 10px 24px 0", fontSize: 10, color: "var(--muted)", minWidth: 36, textAlign: "right" }}>
                  {yTicks.map((v, i) => <span key={i}>{v > 0 ? v + '题' : '0'}</span>)}
                </div>
                <div
                  style={{ flex: 1, position: "relative", background: "rgba(109,94,251,0.02)", borderRadius: 12, border: "1px solid rgba(109,94,251,0.08)" }}
                  onMouseLeave={() => setHoverDay(null)}
                >
                  <DynamicChart data={dailyStats} onHover={setHoverDay} />
                  <div style={{ position: "absolute", bottom: -22, left: 0, right: 0, display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", padding: "0 10px" }}>
                    {dayLabels.map((l, i) => <span key={i}>周{l}</span>)}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Bottom Row - Grid layout without .info-card styling */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {/* Distribution */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>题型分布</h3>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
            </div>
            
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
               {/* Donut replacement */}
               <div style={{ width: 100, height: 100, borderRadius: "50%", position: "relative", background: "conic-gradient(var(--accent) 0deg 210deg, rgba(109, 94, 251, 0.4) 210deg 280deg, rgba(109, 94, 251, 0.15) 280deg 360deg)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                 <div style={{ width: 70, height: 70, borderRadius: "50%", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{totalQuestions.toLocaleString()}</span>
                    <span style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>总题数</span>
                 </div>
               </div>
               
               <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                 {categories.slice(0, 3).map((cat, idx) => (
                   <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                     <span style={{ width: 60, height: 4, borderRadius: 2, background: idx === 0 ? "var(--accent)" : idx === 1 ? "rgba(109,94,251,0.5)" : "rgba(109,94,251,0.2)" }} />
                     <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                       <span style={{ fontSize: 10, color: "var(--muted)" }}>{categoryNames[cat.category] || cat.category}</span>
                       <span style={{ fontSize: 12, fontWeight: 600 }}>{cat.total.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted)" }}>道</span></span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Accuracy */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>正确率统计</h3>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", lineHeight: 1 }}>{stats.accuracy}</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>%</span>
                <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>综合正确率</span>
              </div>
              
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(109,94,251,0.15)", overflow: "hidden" }}>
                <div style={{ width: `${stats.accuracy}%`, height: "100%", background: "var(--accent)", borderRadius: 3 }} />
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} /> 
                    <span>已掌握 (正确)</span>
                  </div>
                  <strong style={{ fontSize: 14, marginLeft: 14 }}>{stats.correctCount.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted)" }}>道</span></strong>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(109,94,251,0.2)" }} /> 
                    <span>待加强 (错误)</span>
                  </div>
                  <strong style={{ fontSize: 14, marginRight: 14 }}>{stats.wrongCount.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted)" }}>道</span></strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Side Panel - No Cards styling */}
      <aside className="side-panel" style={{ 
        width: 280, padding: "0 16px 24px 20px", display: "flex", flexDirection: "column", gap: 36, 
        overflow: "auto", borderLeft: "1px solid var(--line)", background: "transparent", borderRadius: 0
      }}>
        {/* Hot Banks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c2.5-2 2.5-5 0-8-1-1.5-2-2-2-4 0 0-2 2-2 4a3 3 0 00-3-3c0 2-2 4-2 6 0 3 2.5 6 5 6zm-5-3v-3"/></svg>
              热门题库
            </h4>
            <span style={{ fontSize: 11, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>全部 {categories.length} &gt;</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
            {categories.map((cat, i) => {
              const pct = cat.total > 0 ? Math.round(((cat.done || 0) / cat.total) * 100) : 0;
              const isTop = i < 3;
              const rankColor = i === 0 ? "#f39c12" : i === 1 ? "#95a5a6" : i === 2 ? "#d35400" : "var(--muted)";
              
              return (
                <div key={cat.category} style={{ 
                  display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 16, 
                  borderBottom: "1px dashed var(--line)"
                }}>
                  {/* Rank */}
                  <div style={{ 
                    width: 18, height: 18, borderRadius: "50%", 
                    color: isTop ? rankColor : "var(--muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, fontStyle: "italic", flexShrink: 0
                  }}>
                    {i + 1}
                  </div>

                  <div style={{ 
                    width: 32, height: 32, borderRadius: 8, 
                    background: "rgba(109,94,251,0.06)", 
                    color: "var(--accent)",
                    display: "grid", placeItems: "center", flexShrink: 0
                  }}>
                    {categoryIcons[cat.category] || <I d={<circle cx="12" cy="12" r="10"/>} />}
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                        {categoryNames[cat.category] || cat.category}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>{cat.done || 0}</span> / {cat.total.toLocaleString()} 题
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(109,94,251,0.1)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: i === 0 ? "var(--accent)" : "rgba(109,94,251,0.5)", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, minWidth: 26, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Progress Without Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>学习进度</h4>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted)", opacity: 0.5 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{totalQuestions > 0 ? Math.round(stats.totalDone / totalQuestions * 100) : 0}%</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>整体完成度</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>共计 {totalQuestions.toLocaleString()} 题库</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
               <span style={{ fontSize: 11, color: "#00b894", fontWeight: 600, background: "rgba(0,184,148,0.1)", padding: "2px 6px", borderRadius: 4 }}>+{stats.accuracy}% 正确</span>
            </div>
          </div>
        </div>

        {/* Data Overview Without Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>数据纵览</h4>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted)", opacity: 0.5 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, paddingTop: 4 }}>
            {[
              { label: "今日新增", val: stats.todayAdded || 0, icon: <I d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />, color: "#1e78ff" },
              { label: "今日已练", val: stats.totalDone, icon: <I d={<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>} />, color: "#f39c12" },
              { label: "正确题数", val: stats.correctCount, icon: <I d={<><polyline points="20 6 9 17 4 12"/></>} />, color: "#00b894" },
              { label: "错题数", val: stats.wrongCount, icon: <I d={<><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/></>} />, color: "#e74c3c" },
            ].map((item, i) => (
              <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ color: item.color, display: "flex", opacity: 0.8 }}>{item.icon}</div>
                  <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>{item.label}</span>
                </div>
                <strong style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{item.val}</strong>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
