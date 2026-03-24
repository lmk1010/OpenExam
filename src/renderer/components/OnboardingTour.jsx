import React, { useEffect, useMemo, useState } from "react";

const STEPS = [
  {
    id: "profile",
    badge: "欢迎使用",
    title: "先设置一个名字，开始你的备考空间",
    description: "OpenExam 只在本地保存你的学习记录、错题和 AI 配置，名字也只用于本机展示。",
    accent: "var(--accent)",
    points: [
      "本地优先，打开即用，不依赖云端账号",
      "支持题库练习、模拟考试、AI 出卷、错题复盘",
      "先用昵称开始，稍后即可直接进入刷题",
    ],
  },
  {
    id: "practice",
    badge: "高频刷题",
    title: "先从专项练习进入状态",
    description: "按模块、子分类、题量与随机方式自由组合，快速切进每日刷题节奏。",
    accent: "var(--info)",
    points: [
      "支持言语、数量、判断、资料、常识拆分训练",
      "做题模式与背题模式都可直接开始",
      "交卷后自动写入学习记录和成长数据",
    ],
    cta: { label: "完成后打开题库练习", page: "practice", tab: "题库练习" },
  },
  {
    id: "ai",
    badge: "智能提效",
    title: "AI 出卷、识别、讲解都准备好了",
    description: "配置模型后，可智能识别图片/PDF、生成试卷、进行追问讲解，把练习闭环串起来。",
    accent: "var(--success)",
    points: [
      "支持 OpenAI 兼容接口与多家模型服务商",
      "AI 生成的试卷与练习可一键保存到本地",
      "错题与当前题目上下文可直接交给 AI 老师分析",
    ],
    cta: { label: "完成后打开 AI 出卷", page: "ai-generate", tab: "AI出卷" },
  },
  {
    id: "update",
    badge: "持续更新",
    title: "Release 更新也已经接入",
    description: "应用启动后会自动检查 GitHub Release。Windows 支持自动下载安装，macOS 会提示前往 Release 页面下载新版。",
    accent: "var(--warning)",
    points: [
      "设置页可查看当前版本与更新状态",
      "可手动检查更新，及时获取新题库和功能优化",
      "macOS 构建包首次打开如被拦截，可按 Release 说明处理",
    ],
    cta: { label: "完成后打开系统设置", page: "settings", tab: "" },
  },
];

const PROFILE_METRICS = [
  { id: "paper", value: "95+", label: "精选试卷" },
  { id: "bank", value: "1.5w+", label: "题目储备" },
  { id: "ai", value: "AI", label: "智能助学" },
  { id: "local", value: "Local", label: "本地优先" },
];

const PROFILE_FEATURES = [
  { id: "practice", label: "专项练习" },
  { id: "mock", label: "模拟考试" },
  { id: "generate", label: "AI 出卷" },
  { id: "review", label: "错题复盘" },
];

function ProfileMetricIcon({ id }) {
  const commonProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" };

  switch (id) {
    case "paper":
      return <svg {...commonProps}><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z"/><path d="M14 3.5V8h4"/><path d="M9 12h6"/><path d="M9 15.5h6"/></svg>;
    case "bank":
      return <svg {...commonProps}><path d="M4 7.5 12 4l8 3.5v1H4Z"/><path d="M6.5 10.5V16"/><path d="M12 10.5V16"/><path d="M17.5 10.5V16"/><path d="M4 19h16"/></svg>;
    case "ai":
      return <svg {...commonProps}><path d="M12 4.5a2 2 0 0 1 2 2v.6a5.5 5.5 0 0 1 4.9 4.9h.6a2 2 0 1 1 0 4h-.6a5.5 5.5 0 0 1-4.9 4.9v.6a2 2 0 1 1-4 0v-.6A5.5 5.5 0 0 1 5.1 16h-.6a2 2 0 1 1 0-4h.6A5.5 5.5 0 0 1 10 7.1v-.6a2 2 0 0 1 2-2Z"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/></svg>;
    default:
      return <svg {...commonProps}><path d="M12 3.5c4.8 0 8.5 3.7 8.5 8.5S16.8 20.5 12 20.5 3.5 16.8 3.5 12 7.2 3.5 12 3.5Z"/><path d="M12 7.5v9"/><path d="M8.5 11.5c1.5 1 5.5 1 7 0"/></svg>;
  }
}

function ProfileFeatureIcon({ id }) {
  const commonProps = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round" };

  switch (id) {
    case "practice":
      return <svg {...commonProps}><path d="M5.5 6.5h13"/><path d="M5.5 12h13"/><path d="M5.5 17.5h8"/></svg>;
    case "mock":
      return <svg {...commonProps}><path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v12A1.5 1.5 0 0 1 17 19.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5Z"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h3"/></svg>;
    case "generate":
      return <svg {...commonProps}><path d="M12 4.5v15"/><path d="M4.5 12h15"/><path d="m7.5 7.5 9 9"/><path d="m16.5 7.5-9 9"/></svg>;
    default:
      return <svg {...commonProps}><path d="M7.5 6.5h9A1.5 1.5 0 0 1 18 8v8.5A1.5 1.5 0 0 1 16.5 18h-9A1.5 1.5 0 0 1 6 16.5V8A1.5 1.5 0 0 1 7.5 6.5Z"/><path d="M9 10.5h6"/><path d="M9 14h4"/></svg>;
  }
}

function renderVisual(step, name) {
  if (step.id === "profile") {
    return (
      <div className="onboarding-profile-stage">
        <div className="onboarding-profile-kicker">Local first workspace</div>
        <div className="onboarding-profile-main">
          <div className="onboarding-profile-emblem">
            <div className="onboarding-visual-avatar">{Array.from(name)[0] || "考"}</div>
          </div>
          <div className="onboarding-visual-copy">
            <strong>{name}</strong>
            <span>你的本地备考空间</span>
            <div className="onboarding-profile-meta">
              <span>学习记录本地保存</span>
              <span>打开即用</span>
            </div>
          </div>
        </div>
        <div className="onboarding-profile-divider" />
        <div className="onboarding-profile-stats">
          {PROFILE_METRICS.map((metric) => (
            <div key={metric.id} className="onboarding-profile-stat">
              <span className={`onboarding-profile-icon ${metric.id}`}>
                <ProfileMetricIcon id={metric.id} />
              </span>
              <b>{metric.value}</b>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
        <div className="onboarding-profile-tags">
          {PROFILE_FEATURES.map((feature) => (
            <span key={feature.id}>
              <ProfileFeatureIcon id={feature.id} />
              {feature.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (step.id === "practice") {
    return (
      <div className="onboarding-visual-card onboarding-visual-stack">
        <div className="onboarding-visual-chip is-active">判断推理 · 20 题</div>
        <div className="onboarding-visual-bar"><span style={{ width: "78%" }} /></div>
        <div className="onboarding-visual-list">
          <div><span>正确率</span><b>78%</b></div>
          <div><span>已完成</span><b>126 题</b></div>
          <div><span>今日练习</span><b>3 次</b></div>
        </div>
      </div>
    );
  }

  if (step.id === "ai") {
    return (
      <div className="onboarding-visual-card onboarding-visual-stack">
        <div className="onboarding-visual-bubbles">
          <div className="bubble bubble-user">这道图形推理怎么判断？</div>
          <div className="bubble bubble-ai">先看对称，再排除旋转规律不一致的选项。</div>
        </div>
        <div className="onboarding-visual-chip is-success">AI 试卷已生成 · 可保存</div>
      </div>
    );
  }

  return (
    <div className="onboarding-visual-card onboarding-visual-stack">
      <div className="onboarding-release-pill">GitHub Release</div>
      <div className="onboarding-visual-list">
        <div><span>当前版本</span><b>v0.2.0</b></div>
        <div><span>Windows</span><b>自动更新</b></div>
        <div><span>macOS</span><b>检测 + 跳转下载</b></div>
      </div>
      <div className="onboarding-visual-note">启动后自动检测，也可在设置页手动检查。</div>
    </div>
  );
}

export default function OnboardingTour({ open, closing = false, defaultName = "考生用户", onFinish, onSkip, onNavigate }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName(String(defaultName || "考生用户").trim() || "考生用户");
  }, [open, defaultName]);

  const safeName = useMemo(() => {
    return String(name || "").replace(/\s+/g, " ").trim().slice(0, 24) || "考生用户";
  }, [name]);

  const visible = open || closing;

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handlePrimary = () => {
    if (isLast) {
      onFinish?.({ name: safeName });
      return;
    }
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  return (
    <div className={`onboarding-overlay ${closing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-label="首次引导">
      <div className="onboarding-shell" style={{ "--onboarding-accent": current.accent }}>
        <section key={`visual-${current.id}`} className="onboarding-showcase">
          <div className="onboarding-showcase-bg" />
          <div className="onboarding-showcase-head">
            <span>{current.badge}</span>
            <strong>OpenExam</strong>
          </div>
          <div className="onboarding-showcase-main">
            {renderVisual(current, safeName)}
          </div>
          <div className="onboarding-showcase-foot">
            <span>首次引导 {step + 1}</span>
            <div className="onboarding-progress-track">
              <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
            <span>{STEPS.length} 步</span>
          </div>
        </section>

        <section key={`panel-${current.id}`} className="onboarding-panel">
          <div className="onboarding-panel-top">
            <div className="onboarding-step-badge">Step {step + 1} / {STEPS.length}</div>
            <button className="onboarding-skip" onClick={() => onSkip?.({ name: safeName })}>跳过</button>
          </div>

          <div className="onboarding-panel-body">
            <div className="onboarding-panel-copy">
              <div className="onboarding-badge">{current.badge}</div>
              <h2 className="onboarding-title">{current.title}</h2>
              <p className="onboarding-desc">{current.description}</p>
            </div>

            {current.id === "profile" && (
              <label className="onboarding-input-wrap">
                <span className="onboarding-input-label">怎么称呼你</span>
                <input
                  className="onboarding-input"
                  value={name}
                  maxLength={24}
                  placeholder="例如：木木 / 小林 / 阿康"
                  onChange={(event) => setName(event.target.value)}
                />
                <span className="onboarding-input-tip">仅用于本地展示，可稍后修改。</span>
              </label>
            )}

            <div className="onboarding-feature-list">
              {current.points.map((point) => (
                <div key={point} className="onboarding-feature-item">
                  <span className="onboarding-feature-dot" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            {current.cta && (
              <button className="onboarding-link-btn" onClick={() => onNavigate?.(current.cta)}>
                {current.cta.label}
              </button>
            )}
          </div>

          <div className="onboarding-panel-bottom">
            <div className="onboarding-dots">
              {STEPS.map((item, index) => (
                <button
                  key={item.id}
                  className={`onboarding-dot ${index === step ? "active" : ""}`}
                  onClick={() => setStep(index)}
                  aria-label={`切换到第 ${index + 1} 步`}
                />
              ))}
            </div>
            <div className="onboarding-actions">
              <button
                className="onboarding-btn secondary"
                onClick={() => setStep((value) => Math.max(value - 1, 0))}
                disabled={step === 0}
              >
                上一步
              </button>
              <button className="onboarding-btn primary" onClick={handlePrimary}>
                {isLast ? "进入 OpenExam" : "下一步"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
