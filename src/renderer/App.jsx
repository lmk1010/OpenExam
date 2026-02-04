import React, { useEffect, useState } from "react";

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
    {/* 横线坐标轴 - 更透明 */}
    <line x1="0" y1="15" x2="100" y2="15" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="40" x2="100" y2="40" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="65" x2="100" y2="65" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    {/* 曲线下方渐变区域 */}
    <path
      d="M0 65 C12 50, 20 70, 32 58 C44 42, 52 60, 62 48 C74 30, 86 45, 100 52 L100 100 L0 100 Z"
      fill="url(#areaGradient)"
    />
    {/* 主曲线 - 紫色 */}
    <path
      d="M0 65 C12 50, 20 70, 32 58 C44 42, 52 60, 62 48 C74 30, 86 45, 100 52"
      fill="none"
      stroke="url(#chartPrimary)"
      strokeWidth="2"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
    {/* 次曲线 - 灰色 */}
    <path
      d="M0 75 C12 62, 20 80, 32 70 C44 58, 56 75, 66 65 C78 55, 88 68, 100 72"
      fill="none"
      stroke="url(#chartGhost)"
      strokeWidth="2"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

export default function App() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (window.openexam?.setTheme) {
      window.openexam.setTheme(theme);
    }
  }, [theme]);

  return (
    <div className={`app theme-${theme}`}>
      <div className="frame">
        <aside className="rail">
          <button className="rail-menu" aria-label="菜单">
            <span />
            <span />
            <span />
          </button>
          <div className="rail-icons">
            <div className="rail-slider" />
            <button className="rail-icon bitcoin">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2v-1.93c-1.51-.32-2.63-1.11-3.13-2.1l1.54-.95c.36.68 1.09 1.27 2.24 1.27 1.01 0 1.59-.46 1.59-1.14 0-.68-.59-1.03-1.73-1.38l-.5-.15c-1.53-.46-2.76-1.22-2.76-2.75 0-1.37 1.05-2.35 2.75-2.64V6h2v1.91c1.13.25 2.02.86 2.55 1.7l-1.47 1.05c-.34-.53-.93-.98-1.73-.98-.87 0-1.37.41-1.37 1.05 0 .59.49.93 1.51 1.24l.53.16c1.74.52 2.95 1.27 2.95 2.87 0 1.51-1.12 2.53-2.97 2.89z"/>
              </svg>
            </button>
            <button className="rail-icon analytics">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-4h2v18h-2V3zm4 8h2v10h-2V11zm4-3h2v13h-2V8z"/>
              </svg>
            </button>
            <button className="rail-icon airbnb">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </button>
            <button className="rail-icon center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </button>
          </div>
          <div className="rail-bottom">
            <button className="rail-bottom-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 6.5h3v3h-3zm0 4h3v3h-3zm0 4h3v3h-3zm4-8h3v3h-3zm0 4h3v3h-3zm0 4h3v3h-3zm4-8h3v3h-3zm0 4h3v3h-3zm0 4h3v3h-3z"/></svg>
            </button>
            <button className="rail-bottom-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            </button>
            <button className="rail-bottom-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </button>
            <button className="rail-bottom-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </button>
            <button className="rail-bottom-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z"/></svg>
            </button>
          </div>
          <button className="rail-chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </button>
        </aside>

        <section className="workspace">
          <header className="workspace-header">
            <nav className="tabs">
              <button className="tab active">学习中心</button>
              <button className="tab">题库练习</button>
              <button className="tab">模拟考试</button>
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
                <button
                  className="theme-toggle"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                  {theme === "light" ? "☾" : "☀"}
                </button>
              </div>
            </div>
          </header>

          <div className="workspace-body">
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
                        <small>本月已做</small>
                        <strong>1,286</strong>
                        <em>道题</em>
                      </span>
                      <div className="marker-dot" />
                      <div className="marker-line" />
                    </div>
                    <div className="chart-axis">
                      {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
                        (day, index) => (
                          <span key={index}>{day}</span>
                        )
                      )}
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
                        <span>3,824</span>
                        <small>总题数</small>
                      </div>
                    </div>
                  </div>
                  <div className="legend">
                    <div className="legend-item">
                      <span className="legend-dot"></span>
                      <div className="legend-text">
                        <span className="legend-label">言语理解</span>
                        <strong>1,245 道</strong>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot mid"></span>
                      <div className="legend-text">
                        <span className="legend-label">数量关系</span>
                        <strong>986 道</strong>
                      </div>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot light"></span>
                      <div className="legend-text">
                        <span className="legend-label">判断推理</span>
                        <strong>1,593 道</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-header">
                    <h4>正确率统计</h4>
                    <span className="info-dot" />
                  </div>
                  <div className="accuracy-content">
                    <div className="active-total">
                      <strong>78%</strong>
                      <span>综合正确率</span>
                    </div>
                    <div className="progress">
                      <span className="progress-fill" style={{ width: "78%" }} />
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
                    <div className="active-split">
                      <div><span className="split-value">2,156 道</span></div>
                      <div><span className="split-value">612 道</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="side-panel">
              <div className="side-section">
                <div className="side-section-title">
                  <h4>今日推荐</h4>
                  <span className="info-dot" />
                </div>
                <div className="side-card preview-card">
                  <div className="preview">
                    <div className="preview-shot" />
                    <div className="preview-meta">
                      <span>2025国考行测真题精选</span>
                    </div>
                  </div>
                </div>
                <a className="side-link">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  公考资讯平台
                </a>

                <div className="side-card list">
                  <div className="list-item">
                    <div className="list-icon news">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                    </div>
                    <div>
                      <span>公考动态</span>
                      <strong>2025国考报名</strong>
                    </div>
                  </div>
                  <div className="list-item">
                    <div className="list-icon policy">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    </div>
                    <div>
                      <span>政策解读</span>
                      <strong>省考新政策</strong>
                    </div>
                  </div>
                  <div className="list-item">
                    <div className="list-icon tips">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>
                    </div>
                    <div>
                      <span>备考技巧</span>
                      <strong>行测高分秘籍</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="side-section">
                <div className="side-section-title">
                  <h4>热门题库</h4>
                  <span className="info-dot" />
                </div>
                <div className="side-card list">
                  <div className="list-item">
                    <div className="list-icon exam">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>
                    </div>
                    <div>
                      <span>言语理解</span>
                      <strong>1,245题</strong>
                    </div>
                  </div>
                  <div className="list-item">
                    <div className="list-icon math">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2v-4H8v-2h4V7h2v4h4v2h-4v4z"/></svg>
                    </div>
                    <div>
                      <span>数量关系</span>
                      <strong>986题</strong>
                    </div>
                  </div>
                  <div className="list-item">
                    <div className="list-icon logic">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                    <div>
                      <span>判断推理</span>
                      <strong>1,593题</strong>
                    </div>
                  </div>
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
                      <span>68%</span>
                    </div>
                  </div>
                  <div className="income-center">
                    <span className="income-label">本周目标</span>
                  </div>
                  <div className="income-right">
                    <span className="income-change">+12%</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
