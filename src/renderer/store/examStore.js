// 状态管理 - 连接 SQLite 数据库

let state = {
  papers: [],
  currentPaper: null,
  currentQuestions: [],
  currentAnswers: {},
  examStartTime: null,
  examStatus: 'idle',
  records: []
};

let listeners = [];

export const getState = () => state;

export const subscribe = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

const notify = () => {
  listeners.forEach(l => l(state));
};

// 检查是否在 Electron 环境
const isElectron = () => window.openexam?.db;

const toMultipleKeys = (value) => {
  if (Array.isArray(value)) return [...new Set(value.map(v => String(v || '').trim()).filter(Boolean))].sort();
  const raw = String(value || '').trim();
  if (!raw) return [];
  if (/^[A-Z]+$/i.test(raw) && raw.length > 1) return [...new Set(raw.toUpperCase().split('').filter(Boolean))].sort();
  return [...new Set(raw.split(/[,，\s|/]+/).map(v => v.trim()).filter(Boolean))].sort();
};

const isCorrectAnswer = (userAnswer, correctAnswer, type) => {
  if (type === 'multiple') {
    const ua = toMultipleKeys(userAnswer);
    const ca = toMultipleKeys(correctAnswer);
    return ua.length === ca.length && ua.every((item, idx) => item === ca[idx]);
  }
  return String(userAnswer || '').trim() === String(correctAnswer || '').trim();
};

const formatAnswer = (answer, type) => {
  if (type === 'multiple') {
    const keys = toMultipleKeys(answer);
    return keys.length ? keys.join(',') : '';
  }
  return String(answer || '').trim();
};

export const actions = {
  // 加载试卷列表
  loadPapers: async () => {
    if (isElectron()) {
      const papers = await window.openexam.db.getPapers();
      state = { ...state, papers };
      notify();
      return papers;
    }
    return state.papers;
  },

  // 开始考试
  startExam: async (paperId) => {
    let paper, questions;

    if (isElectron()) {
      const papers = await window.openexam.db.getPapers();
      paper = papers.find(p => p.id === paperId);
      questions = await window.openexam.db.getQuestions(paperId);
    } else {
      paper = state.papers.find(p => p.id === paperId);
      questions = [];
    }

    if (!paper) return false;

    state = {
      ...state,
      currentPaper: paper,
      currentQuestions: questions,
      currentAnswers: {},
      examStartTime: Date.now(),
      examStatus: 'ongoing'
    };
    notify();
    return true;
  },

  // 提交答案
  submitAnswer: (questionId, answer) => {
    state = {
      ...state,
      currentAnswers: {
        ...state.currentAnswers,
        [questionId]: {
          answer,
          time: Date.now()
        }
      }
    };
    notify();
  },

  // 完成考试
  finishExam: async () => {
    if (!state.currentPaper) return null;

    const questions = state.currentQuestions;
    let correctCount = 0;
    const answerDetails = {};

    questions.forEach(q => {
      const userAnswer = state.currentAnswers[q.id]?.answer;
      const isCorrect = isCorrectAnswer(userAnswer, q.answer, q.type);
      if (isCorrect) correctCount++;

      answerDetails[q.id] = {
        userAnswer,
        correctAnswer: formatAnswer(q.answer, q.type),
        isCorrect,
        time: state.currentAnswers[q.id]?.time
      };

      // 添加错题
      if (!isCorrect && userAnswer && isElectron()) {
        window.openexam.db.addWrongQuestion({
          questionId: q.id,
          paperId: state.currentPaper.id,
          userAnswer: formatAnswer(userAnswer, q.type),
          correctAnswer: formatAnswer(q.answer, q.type)
        });
      }
    });

    const record = {
      id: `record_${Date.now()}`,
      paperId: state.currentPaper.id,
      paperTitle: state.currentPaper.title,
      startTime: new Date(state.examStartTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.floor((Date.now() - state.examStartTime) / 1000),
      status: 'completed',
      answers: answerDetails,
      correctCount,
      totalCount: questions.length,
      accuracy: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
      score: Math.round((correctCount / questions.length) * 100)
    };

    // 保存到数据库
    if (isElectron()) {
      await window.openexam.db.savePracticeRecord(record);
    }

    state = {
      ...state,
      examStatus: 'finished'
    };
    notify();

    return record;
  },

  // 重置考试状态
  resetExam: () => {
    state = {
      ...state,
      currentPaper: null,
      currentQuestions: [],
      currentAnswers: {},
      examStartTime: null,
      examStatus: 'idle'
    };
    notify();
  },

  // 获取当前试卷题目
  getPaperQuestions: () => {
    return state.currentQuestions;
  },

  // 加载练习记录
  loadRecords: async () => {
    if (isElectron()) {
      const records = await window.openexam.db.getPracticeRecords();
      state = { ...state, records };
      notify();
      return records;
    }
    return state.records;
  }
};

export default { getState, subscribe, actions };
