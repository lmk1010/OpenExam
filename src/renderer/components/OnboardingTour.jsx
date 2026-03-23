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

function renderVisual(step, name) {
  if (step.id === "profile") {
    return (
      <div className="onboarding-visual-card onboarding-visual-profile">
        <div className="onboarding-visual-avatar">{Array.from(name)[0] || "考"}</div>
        <div className="onboarding-visual-copy">
          <strong>{name}</strong>
          <span>本地学习账户</span>
        </div>
        <div className="onboarding-visual-grid">
          <div><b>95+</b><span>精选试卷</span></div>
          <div><b>1.5w+</b><span>题目储备</span></div>
          <div><b>AI</b><span>智能助学</span></div>
          <div><b>Local</b><span>本地优先</span></div>
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

export default function OnboardingTour({ open, defaultName = "考生用户", onFinish, onSkip, onNavigate }) {
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

  if (!open) return null;

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
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="首次引导">
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
