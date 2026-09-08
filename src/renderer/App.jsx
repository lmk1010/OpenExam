import React, { useEffect, useRef, useState } from "react";
import Today from "./pages/Today.jsx";
import Notes from "./pages/Notes.jsx";
import Essay from "./pages/Essay.jsx";
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
import CustomSelect from "./components/CustomSelect.jsx";
import { actions, getState } from "./store/examStore.js";
import { normalizeAISettings } from "./store/aiSettings.js";
import appLogo from "./assets/openexam-logo.png";
import { useDialog } from "./components/DialogProvider.jsx";

const EXAM_TRACK_STORAGE_KEY = "openexam_exam_track_v1";
const EXAM_TRACK_SETTING_KEY = "exam_track";
const EXAM_TRACK_OPTIONS = [
  { key: "gongkao", label: "公务员" },
  { key: "shiye", label: "事业单位" },
];

function normalizeExamTrack(input) {
  const track = String(input || "").trim();
  return EXAM_TRACK_OPTIONS.some((item) => item.key === track) ? track : "gongkao";
}

function getExamTrackLabel(track) {
  return EXAM_TRACK_OPTIONS.find((item) => item.key === track)?.label || "公务员";
}

function PageView({ fullscreen = false, children, className = "" }) {
  return (
    <div className={`page-view${fullscreen ? " is-fullscreen" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
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
    const days = (data && data.length) ? data : Array.from({ length: 7 }, (_, i) => ({ total: 0, date: '' }));
    const baseline = PAD_T + chartH * 0.72;
    const pts = days.map((_, i) => ({
      x: days.length === 1 ? chartW / 2 : (i / (days.length - 1)) * chartW,
      y: baseline,
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return (
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
        <svg width={W || 600} height={H || 130} viewBox={`0 0 ${W || 600} ${H || 130}`} style={{ display: 'block' }}>
          {[0.25, 0.5, 0.75].map((t, i) => {
            const y = PAD_T + chartH * (1 - t);
            return <line key={i} x1="0" y1={y} x2={W || 600} y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />;
          })}
          <path d={line} fill="none" stroke="var(--accent)" strokeOpacity="0.22" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--surface)" stroke="var(--accent)" strokeOpacity="0.28" strokeWidth="1.5" />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', opacity: 0.72 }}>暂无刷题数据</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>开始练习后这里会显示 7 日趋势</span>
        </div>
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
  const [page, setPage] = useState("today");
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
  const [activeTab, setActiveTab] = useState("今日");
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
  const [examTrackLoaded, setExamTrackLoaded] = useState(false);
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
    let mounted = true;
    const loadExamTrack = async () => {
      try {
        if (window.openexam?.db?.getAppSetting) {
          const record = await window.openexam.db.getAppSetting(EXAM_TRACK_SETTING_KEY);
          if (mounted && record?.value) {
            setExamTrack(normalizeExamTrack(record.value));
            setExamTrackLoaded(true);
            return;
          }
        }
      } catch (error) {
        console.error("读取类目配置失败:", error);
      }

      try {
        const legacyTrack = normalizeExamTrack(localStorage.getItem(EXAM_TRACK_STORAGE_KEY));
        if (mounted) setExamTrack(legacyTrack);
        if (window.openexam?.db?.setAppSetting) {
          await window.openexam.db.setAppSetting(EXAM_TRACK_SETTING_KEY, legacyTrack);
        }
      } catch (error) {
        console.error("迁移类目配置失败:", error);
      } finally {
        if (mounted) setExamTrackLoaded(true);
      }
    };
    loadExamTrack();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!examTrackLoaded) return;
    const persistExamTrack = async () => {
      try {
        if (window.openexam?.db?.setAppSetting) {
          await window.openexam.db.setAppSetting(EXAM_TRACK_SETTING_KEY, examTrack);
          return;
        }
      } catch (error) {
        console.error("保存类目配置失败:", error);
      }
      try {
        localStorage.setItem(EXAM_TRACK_STORAGE_KEY, examTrack);
      } catch (error) {
        // ignore storage failures
      }
    };
    persistExamTrack();
  }, [examTrack, examTrackLoaded]);

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
    home: "学习中心",
  }[targetPage] || "今日");

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
      meta: record.meta || null,
    });
  };

  const buildPracticeSessionKey = (category, subCategory = 'all') => `practice_${category}__${subCategory || 'all'}`;

  const writeAIContext = (question, extra = {}) => {
    if (!question) return;
    try {
      localStorage.setItem('openexam_question_context', JSON.stringify({
        questionId: question.id || question.question_id || '',
        paperTitle: extra.paperTitle || '',
        index: extra.index || '?',
        total: extra.total || '?',
        category: question.category || '',
        subCategory: question.sub_category || question.subCategory || '',
        content: question.content || '',
        options: Array.isArray(question.options) ? question.options : [],
        answer: question.answer || question.correct_answer || '',
        analysis: question.analysis || '',
        userAnswer: extra.userAnswer || question.user_answer || '',
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem('openexam_ai_autofill', JSON.stringify({
        prompt: extra.prompt || '请讲解这道题：拆解考点、说明为什么选这个答案、再给一个类似练习。',
        at: Date.now(),
      }));
    } catch (error) {
      console.error('写入 AI 上下文失败:', error);
    }
  };

  const goAskAI = (question, extra = {}) => {
    writeAIContext(question, extra);
    setActiveTab('');
    setPage('ai-teacher');
  };

  const handleStartExam = async (paperId, options = {}) => {
    await actions.startExam(paperId);
    setExamResumeRecord(options.resumeRecord || null);
    setCurrentPaperId(paperId);
    setPracticeConfig(options.mock ? {
      mode: 'mock',
      title: options.title || '模拟考试',
      sourcePaperId: paperId,
      durationMinutes: Number(options.durationMinutes || 120),
    } : { sourcePaperId: paperId, title: options.title || '' });
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
    if (resumeRecord && !target.mock) {
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
    await handleStartExam(target.id, {
      returnPage,
      resumeRecord: target.mock ? null : resumeRecord,
      mock: Boolean(target.mock),
      title: target.title,
      durationMinutes: Number(target.duration || 120),
    });
  };

  const handleFinishExam = (result) => {
    setExamResumeRecord(null);
    setExamResult(result);
    setPage("result");
  };

  // 开始专项练习
  const handleStartPractice = async (category, subCategory, config) => {
    if (!window.openexam?.db) {
      await showAlert({ title: '无法开始练习', message: '数据库未连接，请稍后重试。', tone: 'warning' });
      return;
    }

    const sessionKey = buildPracticeSessionKey(category, subCategory || 'all');
    let resumeRecord = null;
    try { resumeRecord = await findResumableRecord(sessionKey); } catch (error) { console.error(error); }
    if (resumeRecord) {
      const answeredCount = Object.keys(resumeRecord.answers || {}).length;
      const continueResume = await showConfirm({
        title: '检测到未完成专项练习',
        message: `该专项有 ${answeredCount} 题已作答，是否继续上次进度？`,
        confirmText: '继续作答',
        cancelText: '重新开始',
        tone: 'info',
      });
      if (!continueResume) {
        try { await archiveRecord(resumeRecord); } catch (error) { console.error(error); }
        resumeRecord = null;
      }
    }

    try {
      let questions = [];
      if (resumeRecord?.meta?.questions?.length) {
        questions = resumeRecord.meta.questions;
      } else if (resumeRecord?.meta?.questionIds?.length && window.openexam.db.getQuestionsByIds) {
        questions = await window.openexam.db.getQuestionsByIds(resumeRecord.meta.questionIds);
      } else {
        questions = await window.openexam.db.getQuestionsByCategory(
          category,
          subCategory,
          config?.questionCount || 10,
          config?.shuffle !== false
        );
      }

      if (!questions.length) {
        await showAlert({ title: '暂无题目', message: '当前筛选分类下还没有题目。', tone: 'info' });
        return;
      }

      const mode = config?.mode || 'practice';
      const titlePrefix = mode === 'mock' ? '模考' : (mode === 'memorize' ? '背题' : '专项');
      setPracticeQuestions(questions);
      setPracticeConfig({
        ...config,
        mode,
        category,
        subCategory,
        sourcePaperId: sessionKey,
        title: config?.title || `${titlePrefix} · ${category}`,
        durationMinutes: Number(config?.durationMinutes || Math.max(10, Math.ceil(questions.length * 1.2))),
      });
      setExamResumeRecord(resumeRecord);
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
      sourcePaperId: `wrong_redo_${meta.filter || 'all'}`,
      filter: meta.filter || 'all',
    });
    setExamResumeRecord(null);
    setResultReturnPage("wrong-book");
    setPage("practice-exam");
  };

  const handleOpenPracticeRecord = async (record) => {
    if (!record) return;
    const status = String(record.status || '').toLowerCase();
    const meta = record.meta || {};
    if (['ongoing', 'paused'].includes(status)) {
      if (record.paper_id && !String(record.paper_id).startsWith('practice_') && !String(record.paper_id).startsWith('wrong_redo_')) {
        await handleOpenPaper({ id: record.paper_id, title: record.paper_title, type: meta.mode === 'ai_practice' ? 'ai_practice' : undefined, resumeRecord: record }, 'history');
        return;
      }
      let questions = meta.questions || [];
      if (!questions.length && meta.questionIds?.length && window.openexam?.db?.getQuestionsByIds) {
        questions = await window.openexam.db.getQuestionsByIds(meta.questionIds);
      }
      if (!questions.length && record.paper_id && window.openexam?.db?.getQuestions) {
        questions = await window.openexam.db.getQuestions(record.paper_id);
      }
      if (!questions.length) {
        await showAlert({ title: '无法继续', message: '未找到该次练习的题目快照。', tone: 'warning' });
        return;
      }
      setPracticeQuestions(questions);
      setPracticeConfig({
        mode: meta.mode || 'practice',
        title: meta.title || record.paper_title || '继续练习',
        category: record.category || null,
        subCategory: record.sub_category || null,
        sourcePaperId: record.paper_id || buildPracticeSessionKey(record.category || 'mixed', record.sub_category || 'all'),
        durationMinutes: meta.durationMinutes,
      });
      setExamResumeRecord(record);
      setResultReturnPage('history');
      setPage('practice-exam');
      return;
    }

    // completed -> result
    let questions = meta.questions || [];
    if (!questions.length && meta.questionIds?.length && window.openexam?.db?.getQuestionsByIds) {
      questions = await window.openexam.db.getQuestionsByIds(meta.questionIds);
    }
    if (!questions.length && record.paper_id && window.openexam?.db?.getQuestions) {
      questions = await window.openexam.db.getQuestions(record.paper_id);
    }
    setExamResult({
      totalCount: Number(record.total_count || questions.length || 0),
      correctCount: Number(record.correct_count || 0),
      wrongCount: Math.max(0, Number(record.total_count || 0) - Number(record.correct_count || 0)),
      unanswered: 0,
      accuracy: Number(record.accuracy || 0),
      timeElapsed: Number(record.duration || 0),
      answers: record.answers || {},
      questions,
      config: { title: meta.title || record.paper_title || '历史练习', category: record.category, mode: meta.mode },
      paperTitle: meta.title || record.paper_title || '历史练习',
    });
    setResultReturnPage('history');
    setPage('result');
  };

  const handleRedoWrongFromResult = (result) => {
    const questions = result?.questions || [];
    const answers = result?.answers || {};
    const wrong = questions.filter((q) => {
      const ua = answers[q.id];
      if (ua == null || ua === '') return false;
      const uaText = Array.isArray(ua) ? ua.join(',') : String(ua);
      const caText = Array.isArray(q.answer) ? q.answer.join(',') : String(q.answer || '');
      return uaText !== caText;
    });
    if (!wrong.length) {
      showAlert({ title: '没有错题', message: '本次没有答错的题目可重做。', tone: 'info' });
      return;
    }
    handleStartWrongRedo(wrong.map((q) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    })), { filter: 'result' });
  };

  const handlePracticeWeakFromResult = (category) => {
    if (!category) {
      setActiveTab('题库练习');
      setPage('practice');
      return;
    }
    handleStartPractice(category, 'all', { questionCount: 10, mode: 'practice', shuffle: true });
  };

  const handleAskAIFromResult = (result) => {
    const questions = result?.questions || [];
    const firstWrong = questions.find((q) => {
      const ua = result?.answers?.[q.id];
      if (ua == null || ua === '') return true;
      return String(ua) !== String(q.answer || '');
    }) || questions[0];
    goAskAI(firstWrong, {
      paperTitle: result?.paperTitle || result?.config?.title || '',
      prompt: '请根据本次练习表现，总结薄弱点并讲解最需要复盘的题目。',
    });
  };

  const handleAskAIFromExam = (question, extra = {}) => {
    goAskAI(question, {
      ...extra,
      prompt: '请讲解这道题：拆解考点、说明为什么选这个答案、再给一个类似练习。',
    });
  };

  const handleStartRecommend = async (item) => {
    if (!item) return;
    if (item.action === 'wrong_redo' || item.type === 'wrong_due') {
      const rows = await window.openexam?.db?.getWrongQuestions?.({ dueOnly: true }) || [];
      const seen = new Set();
      const questions = rows.map((row, index) => {
        const id = String(row.question_id || row.id || `wrong_${index}`);
        if (seen.has(id)) return null;
        seen.add(id);
        return {
          id,
          type: row.type || 'single',
          category: row.category || '',
          sub_category: row.sub_category || '',
          content: row.content || '',
          content_html: row.content_html || '',
          options: Array.isArray(row.options) ? row.options : [],
          answer: row.answer || row.correct_answer || '',
          analysis: row.analysis || '',
          analysis_html: row.analysis_html || '',
          paper_id: row.paper_id || null,
        };
      }).filter((q) => q && q.content && q.answer && q.options.length);
      await handleStartWrongRedo(questions, { filter: 'due' });
      return;
    }
    if (item.category) {
      await handleStartPractice(item.category, item.subCategory || 'all', {
        questionCount: item.count || 10,
        mode: 'practice',
        shuffle: true,
        title: item.title,
      });
    }
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
      "今日": "today",
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
          <PageView key="exam" fullscreen>
            <ExamRoom paperId={currentPaperId} config={practiceConfig} resumeRecord={examResumeRecord} onFinish={handleFinishExam} onExit={handleExitExam} onAskAI={handleAskAIFromExam} />
          </PageView>
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
          <PageView key="practice-exam" fullscreen>
            <ExamRoom
              questions={practiceQuestions}
              config={practiceConfig}
              resumeRecord={examResumeRecord}
              onFinish={handleFinishExam}
              onAskAI={handleAskAIFromExam}
              onExit={() => {
                setPracticeQuestions(null);
                setPracticeConfig(null);
                setExamResumeRecord(null);
                setActiveTab(getReturnTab(resultReturnPage));
                setPage(resultReturnPage);
              }}
            />
          </PageView>
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
          <PageView key="result" fullscreen>
            <ExamResult
              result={examResult}
              onBack={handleBackToList}
              onRedoWrong={() => handleRedoWrongFromResult(examResult)}
              onPracticeWeak={handlePracticeWeakFromResult}
              onAskAI={() => handleAskAIFromResult(examResult)}
            />
          </PageView>
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
            {/* 申论 */}
            <button className={`rail-icon essay ${page === 'essay' ? 'active' : ''}`} data-tip="申论" onClick={() => { setActiveTab(''); setPage('essay'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
              </svg>
              <span className="rail-icon-text">申论</span>
            </button>
            {/* 笔记 */}
            <button className={`rail-icon notes ${page === 'notes' ? 'active' : ''}`} data-tip="笔记" onClick={() => { setActiveTab(''); setPage('notes'); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="15" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
              </svg>
              <span className="rail-icon-text">笔记</span>
            </button>
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
            <button className={`rail-bottom-icon home-icon ${!['wrong-book','analytics','ai-teacher','notes','essay'].includes(page) ? 'active' : ''}`} data-tip="工作区" onClick={() => { setActiveTab('今日'); setPage('today'); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span className="rail-icon-text">主控制台</span>
            </button>
            <button className={`rail-bottom-icon settings-icon ${page === 'settings' ? 'active' : ''}`} data-tip="系统设置" onClick={() => setPage('settings')}>
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
              <button className="app-brand" type="button" onClick={() => { setActiveTab('今日'); setPage('today'); }}>
                <img src={appLogo} alt="OpenExam" className="app-brand-logo" />
                <div className="app-brand-copy">
                  <strong>OpenExam</strong>
                  <span>AI 备考空间</span>
                </div>
              </button>
              <nav className="tabs">
                {["今日", "学习中心", "题库练习", "模拟考试", "AI出卷", "我的成长"].map(tab => (
                  <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => handleTabChange(tab)}>
                    {tab}
                  </button>
                ))}
              </nav>
            </div>
            <div className="header-actions">
              <div className="header-track">
                <span className="header-track-label">类目</span>
                <CustomSelect
                  compact
                  minWidth={92}
                  ariaLabel="切换考试类目"
                  value={examTrack}
                  onChange={(next) => setExamTrack(normalizeExamTrack(next))}
                  options={EXAM_TRACK_OPTIONS.map((item) => ({ value: item.key, label: item.label }))}
                />
              </div>
              <button className="search" type="button" onClick={handleOpenPaperSearch} title="搜索试卷">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
              <HomeNotifyBell
                examTrack={examTrack}
                onStartRecommend={handleStartRecommend}
                onOpenAnalytics={() => { setActiveTab(''); setPage('analytics'); }}
              />
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
            <PageView key={page}>
              {page === "today" ? (
                <Today
                  onStartDrill={() => { setActiveTab('题库练习'); setPage('practice'); }}
                  onStartVocab={() => { setActiveTab('题库练习'); handleStartPractice('yanyu', 'xuanci', { questionCount: 15, mode: 'practice', shuffle: true }); }}
                  onStartEssay={() => { setActiveTab(''); setPage('essay'); }}
                  onOpenNotes={() => { setActiveTab(''); setPage('notes'); }}
                />
              ) : page === "essay" ? (
                <Essay />
              ) : page === "notes" ? (
                <Notes onBack={() => { setActiveTab('今日'); setPage('today'); }} />
              ) : page === "papers" ? (
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
                <PracticeHistory onBack={() => setPage("practice")} onOpenRecord={handleOpenPracticeRecord} />
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
                <WrongBook
                  onRedo={handleStartWrongRedo}
                  onAskAI={(item) => goAskAI({
                    id: item.question_id || item.id,
                    category: item.category,
                    sub_category: item.sub_category,
                    content: item.content,
                    options: item.options,
                    answer: item.answer || item.correct_answer,
                    analysis: item.analysis,
                    user_answer: item.user_answer,
                  }, { paperTitle: item.paper_title || '', prompt: '请讲解这道错题：指出我错在哪、正确思路是什么、再给一个变式。' })}
                />
              ) : page === "analytics" ? (
                <Analytics onOpenSettings={() => setPage("settings")} onStartRecommend={handleStartRecommend} onStartPractice={(category) => handleStartPractice(category, 'all', { questionCount: 10, mode: 'practice', shuffle: true })} />
              ) : page === "growth" ? (
                <GrowthCenter onOpenAchievements={() => { setActiveTab("我的成长"); setPage("achievements"); }} onStartPractice={() => { setActiveTab('题库练习'); setPage('practice'); }} />
              ) : page === "achievements" ? (
                <AchievementCenter onBack={() => { setActiveTab("我的成长"); setPage("growth"); }} />
              ) : (
                <OriginalHomePage
                  examTrack={examTrack}
                  onGoAIGenerate={handleGoToAIGenerate}
                  onOpenPractice={() => { setActiveTab('题库练习'); setPage('practice'); }}
                  onOpenWrongBook={() => { setActiveTab(''); setPage('wrong-book'); }}
                  onOpenHistory={() => setPage('history')}
                  onOpenAnalytics={() => { setActiveTab(''); setPage('analytics'); }}
                  onStartRecommend={handleStartRecommend}
                  onStartCategory={(category) => handleStartPractice(category, 'all', { questionCount: 10, mode: 'practice', shuffle: true })}
                />
              )}
            </PageView>
          </div>
        </section>
        </div>
      </div>
      {onboarding}
    </div>
  );
}

// 右上角通知：承接今日推荐，不占首页主内容
function HomeNotifyBell({ examTrack = "gongkao", onStartRecommend, onOpenAnalytics }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const hostRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!window.openexam?.db?.getSmartRecommend) return;
      try {
        const rec = await window.openexam.db.getSmartRecommend({ limit: 5 });
        if (!cancelled) setItems(Array.isArray(rec) ? rec : []);
      } catch (error) {
        console.error('加载推荐通知失败:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [examTrack]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!hostRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const count = items.length;

  return (
    <div className="home-notify" ref={hostRef}>
      <button
        type="button"
        className={`home-notify-btn${open ? ' is-open' : ''}`}
        title="今日提醒"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {count > 0 && <span className="home-notify-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="home-notify-panel">
          <div className="home-notify-head">
            <strong>今日提醒</strong>
            <button type="button" onClick={() => { setOpen(false); onOpenAnalytics?.(); }}>分析报告</button>
          </div>
          {count === 0 ? (
            <div className="home-notify-empty">暂无提醒，保持当前节奏即可</div>
          ) : (
            <div className="home-notify-list">
              {items.map((item) => (
                <button
                  key={item.id || item.title}
                  type="button"
                  className="home-notify-item"
                  onClick={() => {
                    setOpen(false);
                    onStartRecommend?.(item);
                  }}
                >
                  <span className="home-notify-title">{item.title}</span>
                  <span className="home-notify-desc">{item.reason}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 学习中心主页
function OriginalHomePage({ examTrack = "gongkao", onGoAIGenerate, onOpenPractice, onOpenWrongBook, onOpenHistory, onOpenAnalytics, onStartRecommend, onStartCategory }) {
  const [stats, setStats] = useState({ totalQuestions: 0, totalDone: 0, accuracy: 0, wrongCount: 0, correctCount: 0, todayAdded: 0 });
  const [todayStats, setTodayStats] = useState({ total: 0, correct: 0, duration: 0 });
  const [categories, setCategories] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [hoverDay, setHoverDay] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!window.openexam?.db) return;
      try {
        const [practiceStats, categoryStats, daily, today] = await Promise.all([
          window.openexam.db.getPracticeStats(),
          window.openexam.db.getCategoryStats(),
          window.openexam.db.getDailyStats(7),
          window.openexam.db.getTodayStats?.() || Promise.resolve({ total: 0 }),
        ]);
        setStats(practiceStats);
        setCategories(categoryStats);
        setDailyStats(daily);
        setTodayStats(today || { total: 0 });
      } catch (err) {
        console.error('加载统计数据失败:', err);
      }
    };
    loadData();
  }, [examTrack]);

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
  const overallPct = totalQuestions > 0 ? Math.round((stats.totalDone / totalQuestions) * 100) : 0;
  const chartHasData = dailyStats.some((d) => Number(d.total) > 0);

  return (
    <>
      <section className="main-panel home-main">
        <header className="home-main-header">
          <div className="breadcrumb" style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>学习中心 &gt; {trackLabel}</div>
          <div className="home-main-title-row">
            <h2>{trackLabel}刷题</h2>
            <button onClick={() => onGoAIGenerate?.()} title="去 AI 出卷" className="home-inline-action">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              AI 出卷
            </button>
          </div>
          {!isDefaultTrack && (
            <div className="home-inline-notice">
              <span>当前类目「{trackLabel}」暂无内置题库，可先用 AI 出卷生成练习。</span>
              <button type="button" onClick={() => onGoAIGenerate?.()}>去出卷</button>
            </div>
          )}
        </header>

        <div className="home-chart-block">
          <div className="home-chart-head">
            <div className="home-chart-title">
              <h3>刷题统计</h3>
              <span>近7天每日做题量</span>
            </div>
            <div className="home-chart-meta">
              {hoverDay ? (
                <span><strong>{hoverDay.total}</strong> 道 · {hoverDay.date?.slice(5)}</span>
              ) : (
                <span>今日 <strong>{Number(todayStats.total || 0).toLocaleString()}</strong> 道 · 累计 {stats.totalDone.toLocaleString()}</span>
              )}
            </div>
          </div>

          {(() => {
            const maxVal = Math.max(...dailyStats.map((d) => d.total), chartHasData ? 1 : 10);
            const yTicks = chartHasData
              ? [maxVal, Math.round(maxVal * 0.67), Math.round(maxVal * 0.33), 0]
              : [10, 7, 3, 0];
            const dayLabels = (dailyStats.length ? dailyStats : Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              return { date: date.toISOString().slice(0, 10), total: 0 };
            })).map((d) => {
              const date = new Date(`${d.date}T00:00:00`);
              return Number.isNaN(date.getTime()) ? '—' : ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
            });
            return (
              <div className="home-chart-frame">
                <div className="home-chart-yticks">
                  {yTicks.map((v, i) => <span key={i}>{v > 0 ? `${v}题` : '0'}</span>)}
                </div>
                <div className="home-chart-canvas" onMouseLeave={() => setHoverDay(null)}>
                  <DynamicChart data={dailyStats} onHover={setHoverDay} />
                  <div className="home-chart-xticks">
                    {dayLabels.map((l, i) => <span key={i}>周{l}</span>)}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="home-bottom-grid">
          <div className="home-stat-card">
            <div className="home-stat-card-head">
              <h3>题型分布</h3>
              <span className="home-stat-dot" />
            </div>
            <div className="home-dist-body">
              {(() => {
                const colors = ["var(--accent)", "var(--accent-soft-bg-strong)", "var(--info)", "var(--warning)", "var(--success)"];
                let cursor = 0;
                const stops = categories.slice(0, 5).map((cat, idx) => {
                  const deg = totalQuestions > 0 ? (cat.total / totalQuestions) * 360 : 0;
                  const start = cursor;
                  cursor += deg;
                  return `${colors[idx % colors.length]} ${start}deg ${cursor}deg`;
                });
                const gradient = stops.length ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(var(--accent-soft-bg) 0deg 360deg)";
                return (
                  <div className="home-donut" style={{ background: gradient }}>
                    <div className="home-donut-inner">
                      <strong>{totalQuestions.toLocaleString()}</strong>
                      <span>总题数</span>
                    </div>
                  </div>
                );
              })()}
              <div className="home-dist-legend">
                {categories.slice(0, 5).map((cat, idx) => (
                  <div key={cat.category} className="home-dist-legend-item">
                    <span className={`home-dist-bar tone-${idx}`} />
                    <div>
                      <span className="home-dist-name">{categoryNames[cat.category] || cat.category}</span>
                      <strong>{cat.total.toLocaleString()} <em>道</em></strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="home-stat-card">
            <div className="home-stat-card-head">
              <h3>正确率统计</h3>
              <span className="home-stat-dot" />
            </div>
            <div className="home-acc-body">
              <div className="home-acc-hero">
                <span className="home-acc-num">{stats.accuracy}</span>
                <span className="home-acc-unit">%</span>
                <span className="home-acc-label">综合正确率</span>
              </div>
              <div className="home-acc-bar">
                <div style={{ width: `${stats.accuracy}%` }} />
              </div>
              <div className="home-acc-split">
                <div>
                  <div className="home-acc-split-label"><i className="ok" />已掌握</div>
                  <strong>{stats.correctCount.toLocaleString()} <em>道</em></strong>
                </div>
                <div className="is-end">
                  <div className="home-acc-split-label"><i className="bad" />待加强</div>
                  <strong>{stats.wrongCount.toLocaleString()} <em>道</em></strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="side-panel home-side">
        <div className="home-quick-links">
          {[
            { label: '专项练习', onClick: onOpenPractice },
            { label: '错题本', onClick: onOpenWrongBook },
            { label: '练习历史', onClick: onOpenHistory },
            { label: '分析报告', onClick: onOpenAnalytics },
          ].map((item) => (
            <button key={item.label} type="button" onClick={() => item.onClick?.()}>{item.label}</button>
          ))}
        </div>

        <div className="home-side-progress">
          <div className="home-side-progress-head">
            <h4>学习进度</h4>
            <span>{stats.accuracy}% 正确率</span>
          </div>
          <div className="home-side-progress-body">
            <div className="home-side-ring" style={{ background: `conic-gradient(var(--accent) ${overallPct * 3.6}deg, var(--accent-soft-bg) 0deg)` }}>
              <div><strong>{isDefaultTrack ? `${overallPct}%` : "—"}</strong></div>
            </div>
            <div className="home-side-progress-copy">
              <strong>{isDefaultTrack ? "整体完成度" : "本类目练习"}</strong>
              <span>
                {isDefaultTrack
                  ? `已练 ${stats.totalDone.toLocaleString()} / ${totalQuestions.toLocaleString()} 题`
                  : `已练 ${stats.totalDone.toLocaleString()} 题`}
              </span>
              <span>今日 {Number(todayStats.total || 0)} 道 · 错题 {stats.wrongCount}</span>
            </div>
          </div>
        </div>

        <div className="home-side-banks">
          <div className="home-side-banks-head">
            <h4>{isDefaultTrack ? "热门题库" : "练习入口"}</h4>
            {isDefaultTrack ? (
              <button type="button" onClick={() => onOpenPractice?.()}>全部 {categories.length} &gt;</button>
            ) : (
              <button type="button" onClick={() => onGoAIGenerate?.()}>AI 出卷 &gt;</button>
            )}
          </div>
          <div className="home-side-banks-list">
            {isDefaultTrack ? categories.map((cat, i) => {
              const pct = typeof cat.accuracy === 'number' && cat.answered > 0
                ? cat.accuracy
                : (cat.total > 0 ? Math.round(((cat.done || 0) / cat.total) * 100) : 0);
              const isTop = i < 3;
              const rankColor = i === 0 ? "var(--warning)" : i === 1 ? "#98a3b6" : i === 2 ? "#bf8b5d" : "var(--muted)";
              return (
                <button key={cat.category} type="button" className="home-side-bank" onClick={() => onStartCategory?.(cat.category)}>
                  <span className="home-side-rank" style={{ color: isTop ? rankColor : "var(--muted)" }}>{i + 1}</span>
                  <span className="home-side-icon">{categoryIcons[cat.category] || <I d={<circle cx="12" cy="12" r="10"/>} />}</span>
                  <div className="home-side-bank-copy">
                    <div className="home-side-bank-top">
                      <span>{categoryNames[cat.category] || cat.category}</span>
                      <span><b>{cat.done || 0}</b>/{cat.total.toLocaleString()}</span>
                    </div>
                    <div className="home-side-bank-bar">
                      <div className="home-side-bank-track">
                        <div style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                      </div>
                      <em>{pct}%</em>
                    </div>
                  </div>
                </button>
              );
            }) : (
              <div className="home-side-bank-empty">
                <p>当前类目暂无内置题库</p>
                <button type="button" onClick={() => onGoAIGenerate?.()}>去 AI 出卷</button>
              </div>
            )}
          </div>
        </div>

        <div className="home-side-metrics">
          <h4>数据纵览</h4>
          <div className="home-side-metrics-grid">
            {[
              { label: "今日新增", val: stats.todayAdded || 0, color: "var(--info)" },
              { label: "今日已练", val: Number(todayStats.total || 0), color: "var(--warning)" },
              { label: "正确题数", val: stats.correctCount, color: "var(--success)" },
              { label: "错题数", val: stats.wrongCount, color: "var(--danger)" },
            ].map((item) => (
              <div key={item.label} className="home-side-metric">
                <span style={{ color: item.color }}>{item.label}</span>
                <strong>{item.val}</strong>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
