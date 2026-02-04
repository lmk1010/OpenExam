import React, { useState, useEffect } from 'react';
import { getState, actions } from '../store/examStore.js';

export default function ExamRoom({ paperId, onFinish, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showSheet, setShowSheet] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [paper, setPaper] = useState(null);

  // 加载题目
  useEffect(() => {
    const state = getState();
    setQuestions(state.currentQuestions || []);
    setPaper(state.currentPaper);
  }, [paperId]);

  const currentQuestion = questions[currentIndex];

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelect = (key) => {
    const newAnswers = { ...answers, [currentQuestion.id]: key };
    setAnswers(newAnswers);
    actions.submitAnswer(currentQuestion.id, key);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    setShowSheet(false);
  };

  const handleSubmit = async () => {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      if (!confirm(`还有 ${unanswered} 题未作答，确定交卷吗？`)) return;
    } else {
      if (!confirm('确定交卷吗？')) return;
    }
    const result = await actions.finishExam();
    onFinish(result);
  };

  if (!currentQuestion || questions.length === 0) {
    return <div className="exam-loading">加载中...</div>;
  }

  return (
    <div className="exam-room">
      <div className="exam-header">
        <button className="exam-exit-btn" onClick={onExit}>退出</button>
        <span className="exam-title">{paper?.title}</span>
        <div className="exam-timer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          {formatTime(timeElapsed)}
        </div>
        <button className="exam-submit-btn" onClick={handleSubmit}>交卷</button>
      </div>

      <div className="exam-split-layout">
        {/* 左侧：答题卡和统计 */}
        <div className="exam-info-panel">
          {/* 进度统计 */}
          <div className="info-card">
            <h4>答题进度</h4>
            <div className="progress-stats">
              <div className="progress-circle">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" strokeWidth="8"
                    strokeDasharray={`${(Object.keys(answers).length / questions.length) * 264} 264`}
                    strokeLinecap="round" transform="rotate(-90 50 50)"/>
                </svg>
                <div className="progress-center">
                  <span className="progress-num">{Object.keys(answers).length}</span>
                  <span className="progress-label">/ {questions.length}</span>
                </div>
              </div>
              <div className="progress-detail">
                <div className="detail-row">
                  <span className="detail-dot answered"></span>
                  <span>已答 {Object.keys(answers).length} 题</span>
                </div>
                <div className="detail-row">
                  <span className="detail-dot"></span>
                  <span>未答 {questions.length - Object.keys(answers).length} 题</span>
                </div>
              </div>
            </div>
          </div>

          {/* 答题卡 */}
          <div className="info-card sheet-card">
            <h4>答题卡</h4>
            <div className="sheet-grid-full">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  className={`sheet-btn-item ${answers[q.id] ? 'answered' : ''} ${i === currentIndex ? 'current' : ''}`}
                  onClick={() => goToQuestion(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* 快捷信息 */}
          <div className="info-card">
            <h4>本题信息</h4>
            <div className="question-meta-list">
              <div className="meta-row">
                <span className="meta-label">题型</span>
                <span className="meta-value">{currentQuestion.type === 'single' ? '单选题' : '多选题'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">分类</span>
                <span className="meta-value">{currentQuestion.category || '综合'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">状态</span>
                <span className={`meta-value ${answers[currentQuestion.id] ? 'done' : 'pending'}`}>
                  {answers[currentQuestion.id] ? '已作答' : '未作答'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：题目内容 */}
        <div className="exam-question-panel">
          <div className="question-header">
            <span className="question-number">第 {currentIndex + 1} 题</span>
            <span className="question-total">/ 共 {questions.length} 题</span>
            <span className="question-category">{currentQuestion.category}</span>
          </div>

          <div className="question-content">
            {currentQuestion.content.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <div className="question-options">
            {currentQuestion.options.map(opt => (
              <button
                key={opt.key}
                className={`option-btn ${answers[currentQuestion.id] === opt.key ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.key)}
              >
                <span className="option-key">{opt.key}</span>
                <span className="option-content">{opt.content}</span>
              </button>
            ))}
          </div>

          <div className="question-nav">
            <button className="nav-btn" onClick={goPrev} disabled={currentIndex === 0}>
              ← 上一题
            </button>
            <button className="nav-btn" onClick={goNext} disabled={currentIndex === questions.length - 1}>
              下一题 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
