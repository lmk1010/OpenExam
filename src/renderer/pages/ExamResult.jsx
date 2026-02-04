import React, { useState } from 'react';
import { getState } from '../store/examStore.js';

export default function ExamResult({ result, onBack }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const questions = getState().currentQuestions || [];
  const currentQuestion = questions[currentIndex];
  const answerDetail = result.answers[currentQuestion?.id];

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  const getScoreLevel = (score) => {
    if (score >= 90) return { text: '优秀', color: '#10b981' };
    if (score >= 80) return { text: '良好', color: '#6d5efb' };
    if (score >= 60) return { text: '及格', color: '#f59e0b' };
    return { text: '需加强', color: '#ef4444' };
  };

  const level = getScoreLevel(result.score);

  if (showAnalysis && currentQuestion) {
    return (
      <div className="analysis-page">
        <div className="analysis-header">
          <button className="back-btn" onClick={() => setShowAnalysis(false)}>
            ← 返回成绩
          </button>
          <span>题目解析 ({currentIndex + 1}/{questions.length})</span>
        </div>

        <div className="analysis-body">
          <div className={`answer-status ${answerDetail?.isCorrect ? 'correct' : 'wrong'}`}>
            {answerDetail?.isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
          </div>

          <div className="answer-compare">
            <span>你的答案: <strong className={answerDetail?.isCorrect ? 'correct' : 'wrong'}>
              {answerDetail?.userAnswer || '未作答'}
            </strong></span>
            <span>正确答案: <strong className="correct">{currentQuestion.answer}</strong></span>
          </div>

          <div className="question-content">
            {currentQuestion.content.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <div className="question-options review">
            {currentQuestion.options.map(opt => (
              <div
                key={opt.key}
                className={`option-item
                  ${opt.key === currentQuestion.answer ? 'correct-answer' : ''}
                  ${opt.key === answerDetail?.userAnswer && !answerDetail?.isCorrect ? 'wrong-answer' : ''}`}
              >
                <span className="option-key">{opt.key}</span>
                <span className="option-content">{opt.content}</span>
              </div>
            ))}
          </div>

          <div className="analysis-box">
            <h4>解析</h4>
            <p>{currentQuestion.analysis}</p>
            <div className="tags">
              {(currentQuestion.tags || []).map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="analysis-footer">
          <button
            className="nav-btn"
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={currentIndex === 0}
          >
            上一题
          </button>
          <span>{currentIndex + 1} / {questions.length}</span>
          <button
            className="nav-btn"
            onClick={() => setCurrentIndex(i => i + 1)}
            disabled={currentIndex === questions.length - 1}
          >
            下一题
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page">
      <div className="result-card">
        <h2>答题完成</h2>
        <div className="score-circle" style={{ borderColor: level.color }}>
          <span className="score-value" style={{ color: level.color }}>{result.score}</span>
          <span className="score-label">分</span>
        </div>
        <span className="score-level" style={{ color: level.color }}>{level.text}</span>

        <div className="result-stats">
          <div className="stat-item">
            <span className="stat-value">{result.correctCount}/{result.totalCount}</span>
            <span className="stat-label">正确题数</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatDuration(result.duration)}</span>
            <span className="stat-label">用时</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {Math.round((result.correctCount / result.totalCount) * 100)}%
            </span>
            <span className="stat-label">正确率</span>
          </div>
        </div>

        <div className="result-actions">
          <button className="primary-btn" onClick={() => setShowAnalysis(true)}>
            查看解析
          </button>
          <button className="secondary-btn" onClick={onBack}>
            返回列表
          </button>
        </div>
      </div>
    </div>
  );
}
