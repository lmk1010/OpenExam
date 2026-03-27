import React, { useEffect, useRef, useState } from "react";
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
import appLogo from "./assets/openexam-logo.png";
import { useDialog } from "./components/DialogProvider.jsx";

const EXAM_TRACK_STORAGE_KEY = "openexam_exam_track_v1";
const EXAM_TRACK_OPTIONS = [
  { key: "gongkao", label: "考公" },
  { key: "shiye", label: "事业单位" },
  { key: "kaoyan", label: "考研" },
  { key: "self", label: "自定义" },
];

function normalizeExamTrack(input) {
  const track = String(input || "").trim();
  return EXAM_TRACK_OPTIONS.some((item) => item.key === track) ? track : "gongkao";
}

function getExamTrackLabel(track) {
  return EXAM_TRACK_OPTIONS.find((item) => item.key === track)?.label || "考公";
}

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
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.72"/>
            <stop offset="100%" stopColor="var(--accent-strong)" stopOpacity="0.98"/>
          </linearGradient>
          <linearGradient id="dcArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
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
            stroke="var(--accent)" strokeWidth="1" strokeDasharray="3,3" opacity="0.28"/>
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
            background: active ? 'var(--surface-elevated)' : 'var(--accent)',
            border: active ? '2.5px solid var(--accent)' : 'none',
            boxShadow: active ? '0 0 0 3px var(--accent-soft-bg-strong), 0 4px 10px rgba(15,23,42,0.16)' : 'none',
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
  const [examTrack, setExamTrack] = useState(() => {
    try {
      return normalizeExamTrack(localStorage.getItem(EXAM_TRACK_STORAGE_KEY));
    } catch (error) {
      return "gongkao";
    }
  });
  const [currentPaperId, setCurrentPaperId] = useState(null);
  const [examResult, setExamResult] = useState(null);
  const [resultReturnPage, setResultReturnPage] = useState("papers");
  const [activeTab, setActiveTab] = useState("学习中心");
  const [practiceQuestions, setPracticeQuestions] = useState(null); // 专项练习题目
  const [practiceConfig, setPracticeConfig] = useState(null); // 练习配置
  const [examResumeRecord, setExamResumeRecord] = useState(null);
  const [paperSearchKeyword, setPaperSearchKeyword] = useState("");
  const [paperSearchFocusToken, setPaperSearchFocusToken] = useState(0);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingClosing, setOnboardingClosing] = useState(false);
  const [appRevealActive, setAppRevealActive] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState({ name: "考生用户" });
  const userMenuRef = useRef(null);
  const onboardingCloseTimerRef = useRef(null);
  const appRevealTimerRef = useRef(null);
  const updatePromptedVersionRef = useRef("");
  const displayName = String(profile?.name || "考生用户").trim() || "考生用户";
  const avatarLetter = Array.from(displayName)[0] || "考";
  const { alert: showAlert, confirm: showConfirm } = useDialog();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (window.openexam?.setTheme) {
      window.openexam.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(EXAM_TRACK_STORAGE_KEY, examTrack);
    } catch (error) {
      // ignore storage failures
    }
  }, [examTrack]);

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
    let mounted = true;

    const loadProfile = async () => {
      try {
        if (!window.openexam?.app?.getProfile) return;
        const result = await window.openexam.app.getProfile();
        if (mounted && result && typeof result === "object") {
          setProfile({ name: String(result.name || "考生用户") || "考生用户" });
        }
      } catch (error) {
        console.error("读取用户信息失败:", error);
      }
    };

    loadProfile();

    try {
      const done = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
      if (!done) setShowOnboarding(true);
    } catch (error) {
      setShowOnboarding(true);
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!window.openexam?.app?.onUpdateState) return undefined;
    const dispose = window.openexam.app.onUpdateState(async (payload) => {
      if (!payload || payload.status !== 'downloaded' || !payload.canAutoInstall) return;
      const version = String(payload.latestVersion || 'downloaded');
      if (updatePromptedVersionRef.current === version) return;
      updatePromptedVersionRef.current = version;
      const confirmed = await showConfirm({
        title: '更新已就绪',
        message: `OpenExam ${payload.latestVersion || ''} 已下载完成，是否现在重启安装？`.trim(),
        confirmText: '立即安装',
        cancelText: '稍后',
        tone: 'success',
      });
      if (confirmed && window.openexam?.app?.quitAndInstallUpdate) {
        await window.openexam.app.quitAndInstallUpdate();
      }
    });
    return () => dispose?.();
  }, [showConfirm]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [page]);

  useEffect(() => () => {
    if (onboardingCloseTimerRef.current) window.clearTimeout(onboardingCloseTimerRef.current);
    if (appRevealTimerRef.current) window.clearTimeout(appRevealTimerRef.current);
  }, []);

  const finishOnboarding = async (payload = {}) => {
    if (onboardingClosing) return;
    const nextName = String(payload?.name || displayName).trim() || "考生用户";

    setProfile({ name: nextName });

    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    } catch (error) {
      // ignore storage failures
    }

    if (onboardingCloseTimerRef.current) window.clearTimeout(onboardingCloseTimerRef.current);
    if (appRevealTimerRef.current) window.clearTimeout(appRevealTimerRef.current);

    setOnboardingClosing(true);
    setAppRevealActive(true);

    onboardingCloseTimerRef.current = window.setTimeout(() => {
      setShowOnboarding(false);
      setOnboardingClosing(false);
    }, 420);

    appRevealTimerRef.current = window.setTimeout(() => {
      setAppRevealActive(false);
    }, 720);

    try {
      if (window.openexam?.app?.saveProfile) {
        const result = await window.openexam.app.saveProfile({ name: nextName });
        if (result?.profile) {
          setProfile(result.profile);
        }
      }
    } catch (error) {
      console.error("保存用户信息失败:", error);
    }
  };

  const handleOnboardingNavigate = ({ page: targetPage, tab }) => {
    if (tab !== undefined) setActiveTab(tab);
    if (targetPage) setPage(targetPage);
  };

  const onboarding = (
    <OnboardingTour
      open={showOnboarding}
      closing={onboardingClosing}
      defaultName={displayName}
      onFinish={finishOnboarding}
      onSkip={() => finishOnboarding({ name: displayName })}
      onNavigate={handleOnboardingNavigate}
    />
  );

  const appStageClassName = [
    "app-stage",
    showOnboarding && !onboardingClosing ? "is-covered" : "",
    appRevealActive ? "is-revealing" : "",
  ].filter(Boolean).join(" ");

  const getReturnTab = (targetPage) => ({
    practice: "题库练习",
    papers: "模拟考试",
    "ai-generate": "AI出卷",
    "wrong-book": "",
  }[targetPage] || "学习中心");

  const hasAnyAnswer = (record) => {
    if (!record?.answers || typeof record.answers !== 'object') return false;
    return Object.values(record.answers).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === 'object') {
        const raw = value.userAnswer ?? value.answer ?? '';
        return String(raw).trim().length > 0;
      }
      return String(value || '').trim().length > 0;
    });
  };

  const findResumableRecord = async (paperId) => {
    if (!paperId || !window.openexam?.db?.getPracticeRecords) return null;
    const records = await window.openexam.db.getPracticeRecords();
    return (records || []).find((record) => (
      record?.paper_id === paperId &&
      ['ongoing', 'paused'].includes(String(record?.status || '').toLowerCase()) &&
      hasAnyAnswer(record)
    )) || null;
  };

  const archiveRecord = async (record) => {
    if (!record?.id || !window.openexam?.db?.savePracticeRecord) return;
    await window.openexam.db.savePracticeRecord({
      id: record.id,
      paperId: record.paper_id || record.paperId || null,
      category: record.category || null,
      subCategory: record.sub_category || record.subCategory || null,
      startTime: record.start_time || record.startTime || new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: Number(record.duration || 0),
      status: 'abandoned',
      answers: record.answers || {},
      correctCount: Number(record.correct_count || record.correctCount || 0),
      totalCount: Number(record.total_count || record.totalCount || 0),
      accuracy: Number(record.accuracy || 0),
      score: Number(record.score || 0),
    });
  };

  const handleStartExam = async (paperId, options = {}) => {
    await actions.startExam(paperId);
    setExamResumeRecord(options.resumeRecord || null);
    setCurrentPaperId(paperId);
    setResultReturnPage(options.returnPage || "papers");
    setPage("exam");
  };

  const handleStartSavedPractice = async (paperId, paperTitle, returnPage = "practice", resumeRecord = null) => {
    if (!window.openexam?.db?.getQuestions) {
      await showAlert({ title: '无法开始练习', message: '数据库未连接，请稍后重试。', tone: 'warning' });
      return;
    }

    try {
      const questions = await window.openexam.db.getQuestions(paperId);
      if (!questions.length) {
        await showAlert({ title: '暂无题目', message: '这份自定义练习还没有可用题目。', tone: 'info' });
        return;
      }
      setPracticeQuestions(questions);
      setPracticeConfig({ mode: 'practice', title: paperTitle || 'AI 自定义练习', sourcePaperId: paperId });
      setExamResumeRecord(resumeRecord || null);
      setResultReturnPage(returnPage);
      setPage("practice-exam");
    } catch (err) {
      console.error('加载练习失败:', err);
      await showAlert({ title: '加载练习失败', message: '未能读取这份练习，请稍后再试。', tone: 'danger' });
    }
  };

  const handleOpenPaper = async (paper, returnPage = "papers") => {
    const target = paper && typeof paper === 'object' ? paper : { id: paper };
    if (!target?.id) return;
    let resumeRecord = target.resumeRecord || null;
    if (!resumeRecord) {
      try { resumeRecord = await findResumableRecord(target.id); } catch (error) { console.error('加载继续记录失败:', error); }
    }
    if (resumeRecord) {
      const answeredCount = Object.keys(resumeRecord.answers || {}).length;
      const continueResume = await showConfirm({
        title: '检测到未完成作答',
        message: `这套题有 ${answeredCount} 题已作答，是否继续上次进度？`,
        confirmText: '继续作答',
        cancelText: '重新开始',
        tone: 'info',
      });
      if (!continueResume) {
        try { await archiveRecord(resumeRecord); } catch (error) { console.error('更新旧记录状态失败:', error); }
        resumeRecord = null;
      }
    }
    if (target.type === 'ai_practice') {
      await handleStartSavedPractice(target.id, target.title, returnPage, resumeRecord);
      return;
    }
    await handleStartExam(target.id, { returnPage, resumeRecord });
  };

  const handleFinishExam = (result) => {
    setExamResumeRecord(null);
    setExamResult(result);
    setPage("result");
  };

  // 开始专项练习
  const handleStartPractice = async (category, subCategory, config) => {
    console.log('开始练习:', category, subCategory, config);

    if (!window.openexam?.db) {
      await showAlert({ title: '无法开始练习', message: '数据库未连接，请稍后重试。', tone: 'warning' });
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
          await showAlert({ title: '暂无题目', message: '当前筛选分类下还没有题目。', tone: 'info' });
        return;
      }

      setPracticeQuestions(questions);
      setPracticeConfig({ ...config, category, subCategory });
      setExamResumeRecord(null);
      setResultReturnPage("practice");
      setPage("practice-exam");
    } catch (err) {
      console.error('加载题目失败:', err);
      await showAlert({ title: '加载题目失败', message: '题目读取异常，请稍后重试。', tone: 'danger' });
    }
  };

  const handleStartWrongRedo = async (questions, meta = {}) => {
    if (!Array.isArray(questions) || questions.length === 0) {
      await showAlert({ title: '暂无可重做题目', message: '当前筛选下没有可重做的错题。', tone: 'info' });
      return;
    }
    setPracticeQuestions(questions);
    setPracticeConfig({
      mode: 'wrong-redo',
      title: `错题重做（${questions.length}题）`,
      category: 'wrong-book',
      filter: meta.filter || 'all',
    });
    setExamResumeRecord(null);
    setResultReturnPage("wrong-book");
    setPage("practice-exam");
  };

  const handleExitExam = () => {
    actions.resetExam();
    setExamResumeRecord(null);
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
    setExamResumeRecord(null);
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

  const handleUserMenuNavigate = (nextPage, nextTab) => {
    if (typeof nextTab === 'string' && nextTab) setActiveTab(nextTab);
    setPage(nextPage);
    setUserMenuOpen(false);
  };

  const handleOpenPaperSearch = () => {
    const keyword = window.prompt("输入试卷关键词（标题/地区/年份）", paperSearchKeyword);
    if (keyword !== null) setPaperSearchKeyword(String(keyword).trim());
    setActiveTab("模拟考试");
    setPage("papers");
    setPaperSearchFocusToken((token) => token + 1);
  };

  const handleGoToAIGenerate = () => {
    setActiveTab("AI出卷");
    setPage("ai-generate");
  };

  // 考试模式全屏
  if (page === "exam" && currentPaperId) {
    return (
      <div className={`app theme-${theme}`}>
        <div className={appStageClassName}>
          <ExamRoom paperId={currentPaperId} resumeRecord={examResumeRecord} onFinish={handleFinishExam} onExit={handleExitExam} />
        </div>
        {onboarding}
      </div>
    );
  }

  // 专项练习模式
  if (page === "practice-exam" && practiceQuestions) {
    return (
      <div className={`app theme-${theme}`}>
        <div className={appStageClassName}>
          <ExamRoom
            questions={practiceQuestions}
            config={practiceConfig}
            resumeRecord={examResumeRecord}
            onFinish={handleFinishExam}
            onExit={() => {
              setPracticeQuestions(null);
              setPracticeConfig(null);
              setExamResumeRecord(null);
              setActiveTab(getReturnTab(resultReturnPage));
              setPage(resultReturnPage);
            }}
          />
        </div>
        {onboarding}
      </div>
    );
  }

  // 结果页全屏
  if (page === "result" && examResult) {
    return (
      <div className={`app theme-${theme}`}>
        <div className={appStageClassName}>
          <ExamResult result={examResult} onBack={handleBackToList} />
        </div>
        {onboarding}
      </div>
    );
  }

  return (
    <div className={`app theme-${theme}`}>
      <div className={appStageClassName}>
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
            <div className="workspace-header-main">
              <button className="app-brand" type="button" onClick={() => { setActiveTab('学习中心'); setPage('home'); }}>
                <img src={appLogo} alt="OpenExam" className="app-brand-logo" />
                <div className="app-brand-copy">
                  <strong>OpenExam</strong>
                  <span>AI 备考空间</span>
                </div>
              </button>
              <nav className="tabs">
                {["学习中心", "题库练习", "模拟考试", "AI出卷", "我的成长"].map(tab => (
                  <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => handleTabChange(tab)}>
                    {tab}
                  </button>
                ))}
              </nav>
            </div>
            <div className="header-actions">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 8px 0 10px",
                  height: 34,
                  borderRadius: 9,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                }}
              >
                <span style={{ fontSize: 11, color: "var(--muted)" }}>类目</span>
                <select
                  value={examTrack}
                  onChange={(event) => setExamTrack(normalizeExamTrack(event.target.value))}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {EXAM_TRACK_OPTIONS.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </label>
              <button className="search" type="button" onClick={handleOpenPaperSearch} title="搜索试卷">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
              <div className="header-divider"></div>
              <div className="user">
                <div className="user-menu-host" ref={userMenuRef}>
                  <button
                    className="user-trigger"
                    type="button"
                    onClick={() => setUserMenuOpen((open) => !open)}
                    aria-expanded={userMenuOpen}
                  >
                    <span className="user-name">{displayName}</span>
                    <div className="avatar-wrap">
                      <div className="avatar">{avatarLetter}</div>
                      <svg className="avatar-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="user-menu">
                      <div className="user-menu-head">
                        <div className="user-menu-avatar">{avatarLetter}</div>
                        <div>
                          <div className="user-menu-title">{displayName}</div>
                          <div className="user-menu-subtitle">本地学习账户</div>
                        </div>
                      </div>
                      <button type="button" className="user-menu-item" onClick={() => handleUserMenuNavigate("home", "学习中心")}>学习中心</button>
                      <button type="button" className="user-menu-item" onClick={() => handleUserMenuNavigate("growth", "我的成长")}>我的成长</button>
                      <button type="button" className="user-menu-item" onClick={() => handleUserMenuNavigate("achievements", "我的成长")}>成就列表</button>
                      <button
                        type="button"
                        className="user-menu-item"
                        onClick={() => {
                          setTheme(theme === "light" ? "dark" : "light");
                          setUserMenuOpen(false);
                        }}
                      >
                        {theme === "light" ? "切换深色模式" : "切换浅色模式"}
                      </button>
                      <button type="button" className="user-menu-item danger" onClick={() => handleUserMenuNavigate("settings")}>系统设置</button>
                    </div>
                  )}
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
              <PaperList
                onOpenPaper={(paper) => handleOpenPaper(paper, 'papers')}
                initialKeyword={paperSearchKeyword}
                focusToken={paperSearchFocusToken}
                examTrack={examTrack}
                onGoAIGenerate={handleGoToAIGenerate}
              />
            ) : page === "practice" ? (
              <PracticeModule
                examTrack={examTrack}
                onImport={() => setPage("import")}
                onStartPractice={handleStartPractice}
                onHistory={() => setPage("history")}
                onGoAIGenerate={handleGoToAIGenerate}
              />
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
              <AIGenerate globalTrack={examTrack} onOpenPaper={(paper) => handleOpenPaper(paper, 'ai-generate')} />
            ) : page === "ai-teacher" ? (
              <AITeacher />
            ) : page === "wrong-book" ? (
              <WrongBook onRedo={handleStartWrongRedo} />
            ) : page === "analytics" ? (
              <Analytics onOpenSettings={() => setPage("settings")} />
            ) : page === "growth" ? (
              <GrowthCenter onOpenAchievements={() => { setActiveTab("我的成长"); setPage("achievements"); }} />
            ) : page === "achievements" ? (
              <AchievementCenter onBack={() => { setActiveTab("我的成长"); setPage("growth"); }} />
            ) : (
              <OriginalHomePage examTrack={examTrack} onGoAIGenerate={handleGoToAIGenerate} />
            )}
          </div>
        </section>
        </div>
      </div>
      {onboarding}
    </div>
  );
}

// 学习中心主页
function OriginalHomePage({ examTrack = "gongkao", onGoAIGenerate }) {
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
  const trackLabel = getExamTrackLabel(examTrack);
  const isDefaultTrack = examTrack === "gongkao";

  return (
    <>
      <section className="main-panel" style={{ padding: "0 24px 24px 20px", display: "flex", flexDirection: "column", gap: 32, overflow: "auto", minWidth: 0 }}>
        {/* Header */}
        <header style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <div className="breadcrumb" style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>学习中心 &gt; {trackLabel}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-soft-bg)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", margin: 0 }}>{trackLabel}刷题</h2>
            </div>
            <button
              onClick={() => onGoAIGenerate?.()}
              title="去 AI 出卷"
              style={{
              width: 32, height: 32, borderRadius: 10, border: "1px dashed var(--accent)", 
              background: "transparent", color: "var(--accent)", cursor: "pointer", 
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" 
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
          {!isDefaultTrack && (
            <div style={{ fontSize: 12, color: "var(--warning)", background: "var(--warning-soft)", border: "1px solid var(--warning-border)", borderRadius: 10, padding: "8px 10px" }}>
              当前已切换到「{trackLabel}」。内置题库正在补齐，可先使用 AI 出卷按类目生成练习。
            </div>
          )}
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
                  style={{ flex: 1, position: "relative", background: "var(--accent-soft-bg)", borderRadius: 12, border: "1px solid var(--accent-border-soft)" }}
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
               <div style={{ width: 100, height: 100, borderRadius: "50%", position: "relative", background: "conic-gradient(var(--accent) 0deg 210deg, var(--accent-soft-bg-strong) 210deg 280deg, var(--accent-soft-bg) 280deg 360deg)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                 <div style={{ width: 70, height: 70, borderRadius: "50%", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{totalQuestions.toLocaleString()}</span>
                    <span style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>总题数</span>
                 </div>
               </div>
               
               <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                 {categories.slice(0, 3).map((cat, idx) => (
                   <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                     <span style={{ width: 60, height: 4, borderRadius: 2, background: idx === 0 ? "var(--accent)" : idx === 1 ? "var(--accent-soft-bg-strong)" : "var(--accent-soft-bg)" }} />
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
              
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--accent-soft-bg-strong)", overflow: "hidden" }}>
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
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger-soft)" }} /> 
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c2.5-2 2.5-5 0-8-1-1.5-2-2-2-4 0 0-2 2-2 4a3 3 0 00-3-3c0 2-2 4-2 6 0 3 2.5 6 5 6zm-5-3v-3"/></svg>
              热门题库
            </h4>
            <span style={{ fontSize: 11, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>全部 {categories.length} &gt;</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
            {categories.map((cat, i) => {
              const pct = cat.total > 0 ? Math.round(((cat.done || 0) / cat.total) * 100) : 0;
              const isTop = i < 3;
              const rankColor = i === 0 ? "var(--warning)" : i === 1 ? "#98a3b6" : i === 2 ? "#bf8b5d" : "var(--muted)";
              
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
                    background: "var(--accent-soft-bg)", 
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
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--accent-soft-bg-strong)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: i === 0 ? "var(--accent)" : "var(--accent-strong)", borderRadius: 2 }} />
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
               <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600, background: "var(--success-soft)", padding: "2px 6px", borderRadius: 4 }}>+{stats.accuracy}% 正确</span>
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
              { label: "今日新增", val: stats.todayAdded || 0, icon: <I d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>} />, color: "var(--info)" },
              { label: "今日已练", val: stats.totalDone, icon: <I d={<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>} />, color: "var(--warning)" },
              { label: "正确题数", val: stats.correctCount, icon: <I d={<><polyline points="20 6 9 17 4 12"/></>} />, color: "var(--success)" },
              { label: "错题数", val: stats.wrongCount, icon: <I d={<><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/></>} />, color: "var(--danger)" },
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
