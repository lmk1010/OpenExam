import React, { useEffect, useState } from "react";

const ChartLines = () => (
  <svg className="chart-lines" viewBox="0 0 680 220" aria-hidden="true">
    <defs>
      <linearGradient id="chartPrimary" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#6d5efb" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#6d5efb" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="chartGhost" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#c9c8f6" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#c9c8f6" stopOpacity="0.65" />
      </linearGradient>
    </defs>
    <path
      d="M8 150 C90 90, 150 170, 230 120 C300 70, 340 130, 410 80 C470 35, 560 90, 670 115"
      fill="none"
      stroke="url(#chartPrimary)"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <path
      d="M8 170 C90 120, 150 190, 230 160 C300 120, 360 170, 430 140 C500 110, 560 150, 670 160"
      fill="none"
      stroke="url(#chartGhost)"
      strokeWidth="4"
      strokeLinecap="round"
      opacity="0.7"
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
              <div className="user">
                <span className="user-name">考生用户</span>
                <div className="avatar" />
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
                <div className="brand-mark" />
                <h2>公考刷题</h2>
                <button className="add-btn">+</button>
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
                    <span>本月练习</span>
                    <button className="chip">2025年2月</button>
                    <button className="dot">···</button>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  Social Trading Platform
                </a>

                <div className="side-card list">
                  <div className="list-item">
                    <div className="list-icon google">
                      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    </div>
                    <div>
                      <span>Google</span>
                      <strong>Alphabet Inc.</strong>
                    </div>
                  </div>
                  <div className="list-item">
                    <div className="list-icon foursquare">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.727 3.465H7.818c-.91 0-1.636.727-1.636 1.636v14.727c0 .545.364.909.909.909.182 0 .364-.091.545-.182l4.364-3.273 4.364 3.273c.182.091.364.182.545.182.545 0 .909-.364.909-.909V5.101c0-.909-.727-1.636-1.091-1.636z"/></svg>
                    </div>
                    <div>
                      <span>Foursquare</span>
                      <strong>Location Tech</strong>
                    </div>
                  </div>
                  <div className="list-item">
                    <div className="list-icon kickstarter">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                    <div>
                      <span>Kickstarter</span>
                      <strong>Crowdfunding</strong>
                    </div>
                  </div>
                  <div className="list-item">
                    <div className="list-icon kakao">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.52 0-10 3.59-10 8 0 2.84 1.89 5.33 4.72 6.72-.21.78-.77 2.82-.88 3.26-.14.54.2.53.42.39.17-.11 2.74-1.86 3.85-2.61.61.09 1.24.14 1.89.14 5.52 0 10-3.59 10-8s-4.48-8-10-8z"/></svg>
                    </div>
                    <div>
                      <span>Kakao</span>
                      <strong>Messaging</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="side-section">
                <div className="side-section-title">
                  <h4>My Income</h4>
                  <span className="info-dot" />
                </div>
                <div className="side-card income">
                  <div className="income-left">
                    <div className="income-ring">
                      <span>46%</span>
                    </div>
                  </div>
                  <div className="income-center">
                    <span className="income-label">Legend</span>
                  </div>
                  <div className="income-right">
                    <span className="income-change">+25%</span>
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
