import React, { useEffect, useState } from "react";

const STEPS = [
  {
    id: "welcome",
    title: "欢迎来到 OpenExam",
    description: "接下来 30 秒，带你快速熟悉核心功能，首次上手更顺畅。",
    points: [
      "本地优先，题库与记录都保存在你的设备中",
      "支持题库练习、模拟考试、AI 出卷、错题复盘",
      "可随时跳过，不影响正常使用",
    ],
    accent: "#6d5efb",
  },
  {
    id: "practice",
    title: "先从题库练习开始",
    description: "选择分类和子分类，设置题数、模式、是否随机，快速进入高频刷题状态。",
    points: [
      "支持按言语/数量/判断/资料/常识拆分训练",
      "支持做题模式与背题模式",
      "交卷后自动记录练习表现",
    ],
    accent: "#1e78ff",
    cta: { label: "打开题库练习", page: "practice", tab: "题库练习" },
  },
  {
    id: "import",
    title: "导入与 AI 出卷",
    description: "你可以导入历史题目，也可以让 AI 按分类和难度快速出卷。",
    points: [
      "支持 PDF/图片 OCR、Excel/CSV/JSON 导入",
      "AI 出卷结果可一键保存进题库",
      "导入后即可直接练习与考试",
    ],
    accent: "#00b894",
    cta: { label: "打开 AI 出卷", page: "ai-generate", tab: "AI出卷" },
  },
  {
    id: "ai",
    title: "配置 AI 提升学习效率",
    description: "在设置中填入 API 信息后，可启用 AI 老师、智能诊断、智能识别等能力。",
    points: [
      "支持多家模型服务商与 OpenAI 兼容接口",
      "分析报告可生成个性化 7 天计划",
      "AI 老师可结合当前题目上下文讲解",
    ],
    accent: "#f39c12",
    cta: { label: "前往系统设置", page: "settings", tab: "" },
  },
];

export default function OnboardingTour({ open, onFinish, onSkip, onNavigate }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handlePrimary = () => {
    if (isLast) {
      onFinish?.();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="首次引导">
      <div className="onboarding-card" style={{ "--onboarding-accent": current.accent }}>
        <div className="onboarding-top">
          <div className="onboarding-step-text">新手引导 {step + 1}/{STEPS.length}</div>
          <button className="onboarding-skip" onClick={() => onSkip?.()}>跳过</button>
        </div>

        <div className="onboarding-body">
          <div className="onboarding-title">{current.title}</div>
          <p className="onboarding-desc">{current.description}</p>
          <ul className="onboarding-list">
            {current.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          {current.cta && (
            <button
              className="onboarding-cta"
              onClick={() => onNavigate?.(current.cta)}
            >
              {current.cta.label}
            </button>
          )}
        </div>

        <div className="onboarding-bottom">
          <div className="onboarding-dots">
            {STEPS.map((item, idx) => (
              <button
                key={item.id}
                className={`onboarding-dot ${idx === step ? "active" : ""}`}
                onClick={() => setStep(idx)}
                aria-label={`切换到第${idx + 1}步`}
              />
            ))}
          </div>
          <div className="onboarding-actions">
            <button
              className="onboarding-btn secondary"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
            >
              上一步
            </button>
            <button className="onboarding-btn primary" onClick={handlePrimary}>
              {isLast ? "开始使用" : "下一步"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
