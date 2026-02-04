import React, { useState, useEffect } from 'react';
import { actions } from '../store/examStore.js';

export default function PaperList({ onStartExam }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: 'all',
    type: 'all'
  });

  // 加载试卷
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await actions.loadPapers();
      setPapers(data);
      setLoading(false);
    };
    loadData();
  }, []);

  // 获取可用年份
  const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a);

  // 筛选试卷
  const filteredPapers = papers.filter(p => {
    if (filters.year !== 'all' && p.year !== parseInt(filters.year)) return false;
    if (filters.type !== 'all' && p.type !== filters.type) return false;
    return true;
  });

  const handleStart = async (paperId) => {
    await actions.startExam(paperId);
    onStartExam(paperId);
  };

  if (loading) {
    return (
      <div className="paper-list-page">
        <div className="loading-state">加载中...</div>
      </div>
    );
  }

  return (
    <div className="paper-list-page">
      <div className="filter-bar">
        <select
          value={filters.year}
          onChange={e => setFilters({...filters, year: e.target.value})}
          className="filter-select"
        >
          <option value="all">全部年份</option>
          {years.map(y => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={e => setFilters({...filters, type: e.target.value})}
          className="filter-select"
        >
          <option value="all">全部类型</option>
          <option value="national">国考</option>
          <option value="provincial">省考</option>
        </select>
      </div>

      <div className="paper-grid">
        {filteredPapers.map(paper => (
          <div key={paper.id} className="paper-card">
            <div className="paper-card-header">
              <span className="paper-year">{paper.year}</span>
              <span className={`paper-type ${paper.type}`}>
                {paper.type === 'national' ? '国考' : '省考'}
              </span>
            </div>
            <h3 className="paper-title">{paper.title}</h3>
            <div className="paper-meta">
              <span>{paper.question_count || paper.questionCount} 题</span>
              <span>{paper.duration} 分钟</span>
              <span>难度 {'★'.repeat(paper.difficulty)}{'☆'.repeat(5-paper.difficulty)}</span>
            </div>
            <button
              className="paper-start-btn"
              onClick={() => handleStart(paper.id)}
            >
              开始答题
            </button>
          </div>
        ))}
      </div>

      {filteredPapers.length === 0 && (
        <div className="empty-state">
          <p>暂无符合条件的试卷</p>
        </div>
      )}
    </div>
  );
}
