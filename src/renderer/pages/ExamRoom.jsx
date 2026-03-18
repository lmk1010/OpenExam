import React, { useState, useEffect } from 'react';
import { getState, actions } from '../store/examStore.js';

// 分类名称映射
const categoryNames = {
  yanyu: '言语理解',
  shuliang: '数量关系',
  panduan: '判断推理',
  ziliao: '资料分析',
  changshi: '常识判断'
};

// 自定义确认弹窗
function ConfirmModal({ show, title, message, onConfirm, onCancel }) {
  if (!show) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4"/>
            <path d="M12 16h.01"/>
          </svg>
        </div>
        <h3 className="confirm-title">{title}</h3>
        {message && <p className="confirm-message">{message}</p>}
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onCancel}>取消</button>
          <button className="confirm-btn primary" onClick={onConfirm}>确定</button>
        </div>
      </div>
    </div>
  );
}

export default function ExamRoom({ paperId, questions: propQuestions, config, onFinish, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showSheet, setShowSheet] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [paper, setPaper] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false); // 背题模式显示解析
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // 加载题目
  useEffect(() => {
    if (propQuestions && propQuestions.length > 0) {
      // 专项练习模式：直接使用传入的题目
      setQuestions(propQuestions);
      setPaper({
        title: `${categoryNames[config?.category] || '专项'}练习`,
        type: 'practice'
      });
    } else if (paperId) {
      // 试卷模式：从 store 加载
      const state = getState();
      setQuestions(state.currentQuestions || []);
      setPaper(state.currentPaper);
    }
  }, [paperId, propQuestions, config]);

  const currentQuestion = questions[currentIndex];
  const isMemorizeMode = config?.mode === 'memorize';

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

    // 只有试卷模式才更新 store
    if (paperId) {
      actions.submitAnswer(currentQuestion.id, key);
    }

    // 背题模式：选择后显示解析
    if (isMemorizeMode) {
      setShowAnalysis(true);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnalysis(isMemorizeMode); // 背题模式保持显示解析
    }
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnalysis(isMemorizeMode); // 背题模式保持显示解析
    }
  };

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    setShowSheet(false);
  };

  const handleSubmit = async () => {
    const unanswered = questions.length - Object.keys(answers).length;

    const doSubmit = async () => {
      // 计算结果
      let correctCount = 0;
      const wrongQuestions = [];
      questions.forEach(q => {
        if (answers[q.id] === q.answer) {
          correctCount++;
        } else if (answers[q.id]) {
          // 记录错题
          wrongQuestions.push({
            questionId: q.id,
            paperId: q.paper_id || paperId,
            userAnswer: answers[q.id],
            correctAnswer: q.answer
          });
        }
      });

      const result = {
        totalCount: questions.length,
        correctCount,
        wrongCount: Object.keys(answers).length - correctCount,
        unanswered,
        accuracy: Math.round((correctCount / questions.length) * 100),
        timeElapsed,
        answers,
        questions,
        config
      };

      // 保存练习记录到数据库
      try {
        const recordId = `record_${Date.now()}`;
        await window.electronAPI.savePracticeRecord({
          id: recordId,
          paperId: paperId || null,
          category: config?.category || null,
          subCategory: config?.subCategory || null,
          startTime: new Date(Date.now() - timeElapsed * 1000).toISOString(),
          endTime: new Date().toISOString(),
          duration: timeElapsed,
          status: 'completed',
          answers: answers,
          correctCount,
          totalCount: questions.length,
          accuracy: result.accuracy,
          score: Math.round((correctCount / questions.length) * 100)
        });

        // 保存错题到错题本
        for (const wq of wrongQuestions) {
          await window.electronAPI.addWrongQuestion(wq);
        }
      } catch (err) {
        console.error('保存练习记录失败:', err);
      }

      if (paperId) {
        const storeResult = await actions.finishExam();
        onFinish(storeResult);
      } else {
        onFinish(result);
      }
    };

    if (unanswered > 0) {
      setConfirmModal({
        show: true,
        title: '确定交卷？',
        message: `还有 ${unanswered} 题未作答`,
        onConfirm: () => { setConfirmModal({ show: false }); doSubmit(); }
      });
    } else {
      setConfirmModal({
        show: true,
        title: '确定交卷？',
        message: '提交后将无法修改答案',
        onConfirm: () => { setConfirmModal({ show: false }); doSubmit(); }
      });
    }
  };

  const handleExit = () => {
    setConfirmModal({
      show: true,
      title: '确定退出？',
      message: '当前答题进度将丢失',
      onConfirm: () => { setConfirmModal({ show: false }); onExit(); }
    });
  };

  if (!currentQuestion || questions.length === 0) {
    return <div className="exam-loading">加载中...</div>;
  }

  return (
    <div className="exam-room">
      <div className="exam-header">
        <button className="exam-exit-btn" onClick={handleExit}>退出</button>
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
            {currentQuestion.options.map(opt => {
              const isSelected = answers[currentQuestion.id] === opt.key;
              const isCorrect = opt.key === currentQuestion.answer;
              const showResult = isMemorizeMode || (answers[currentQuestion.id] && showAnalysis);

              return (
                <button
                  key={opt.key}
                  className={`option-btn ${isSelected ? 'selected' : ''} ${showResult && isCorrect ? 'correct' : ''} ${showResult && isSelected && !isCorrect ? 'wrong' : ''}`}
                  onClick={() => handleSelect(opt.key)}
                >
                  <span className="option-key">{opt.key}</span>
                  <span className="option-content">{opt.content}</span>
                </button>
              );
            })}
          </div>

          {/* 背题模式或做题后显示解析 */}
          {(isMemorizeMode || (answers[currentQuestion.id] && !isMemorizeMode)) && (
            <div className="question-analysis">
              <div className="analysis-header">
                <span className={`answer-tag ${answers[currentQuestion.id] === currentQuestion.answer ? 'correct' : 'wrong'}`}>
                  {answers[currentQuestion.id] === currentQuestion.answer ? '✓ 回答正确' : '✗ 回答错误'}
                </span>
                <span className="correct-answer">正确答案：{currentQuestion.answer}</span>
              </div>
              {currentQuestion.analysis && (
                <div className="analysis-content">
                  <strong>解析：</strong>{currentQuestion.analysis}
                </div>
              )}
            </div>
          )}

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

      {/* 确认弹窗 */}
      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ show: false })}
      />
    </div>
  );
}
