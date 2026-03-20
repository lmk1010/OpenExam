import React, { useState, useEffect } from 'react';
import { actions } from '../store/examStore.js';
import CustomSelect from '../components/CustomSelect.jsx';

// 省份标签数据
const PROVINCES = [
  { key: 'all', label: '全部' },
  { key: 'national', label: '国考' },
  { key: '安徽', label: '安徽' },
  { key: '北京', label: '北京' },
  { key: '福建', label: '福建' },
  { key: '甘肃', label: '甘肃' },
  { key: '广东', label: '广东' },
  { key: '广西', label: '广西' },
  { key: '贵州', label: '贵州' },
  { key: '海南', label: '海南' },
  { key: '河北', label: '河北' },
  { key: '河南', label: '河南' },
  { key: '黑龙江', label: '黑龙江' },
  { key: '湖北', label: '湖北' },
  { key: '湖南', label: '湖南' },
  { key: '吉林', label: '吉林' },
  { key: '江苏', label: '江苏' },
  { key: '江西', label: '江西' },
  { key: '辽宁', label: '辽宁' },
  { key: '内蒙古', label: '内蒙古' },
  { key: '宁夏', label: '宁夏' },
  { key: '青海', label: '青海' },
  { key: '山东', label: '山东' },
  { key: '山西', label: '山西' },
  { key: '陕西', label: '陕西' },
  { key: '上海', label: '上海' },
  { key: '四川', label: '四川' },
  { key: '天津', label: '天津' },
  { key: '新疆', label: '新疆' },
  { key: '云南', label: '云南' },
  { key: '浙江', label: '浙江' },
  { key: '重庆', label: '重庆' },
  { key: '深圳', label: '深圳' },
];

const PAGE_SIZE = 12;

export default function PaperList({ onStartExam }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

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
    // 省份筛选
    if (selectedProvince !== 'all') {
      if (selectedProvince === 'national') {
        if (p.type !== 'national') return false;
      } else {
        if (p.province !== selectedProvince) return false;
      }
    }
    // 年份筛选
    if (selectedYear !== 'all' && p.year !== parseInt(selectedYear)) return false;
    return true;
  });

  // 分页
  const totalPages = Math.ceil(filteredPapers.length / PAGE_SIZE);
  const paginatedPapers = filteredPapers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProvince, selectedYear]);

  const handleStart = async (paperId) => {
    onStartExam?.(paperId);
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
      {/* 省份标签筛选 */}
      <div className="province-filter">
        <div className="province-tags">
          {PROVINCES.map(p => (
            <button
              key={p.key}
              className={`province-tag ${selectedProvince === p.key ? 'active' : ''}`}
              onClick={() => setSelectedProvince(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 年份筛选和统计 */}
      <div className="filter-bar">
        <div className="filter-left">
          <span className="filter-label">年份</span>
          <div className="custom-select">
            <CustomSelect
              value={selectedYear}
              onChange={(nextValue) => setSelectedYear(nextValue)}
              options={[
                { value: 'all', label: '全部年份' },
                ...years.map((y) => ({ value: String(y), label: `${y}年` })),
              ]}
            />
          </div>
        </div>
        <div className="filter-right">
          <span className="result-count">共 {filteredPapers.length} 套试卷</span>
        </div>
      </div>

      {/* 试卷列表 */}
      <div className="paper-grid">
        {paginatedPapers.map(paper => (
          <div key={paper.id} className="paper-card">
            <div className="paper-card-header">
              <span className="paper-year">{paper.year}</span>
              <span className={`paper-type ${paper.type}`}>
                {paper.type === 'national' ? '国考' : paper.province || '省考'}
              </span>
            </div>
            <h3 className="paper-title">{paper.title}</h3>
            <div className="paper-meta">
              <span>{paper.question_count || paper.questionCount} 题</span>
              <span>{paper.duration || 120} 分钟</span>
              <span className="paper-difficulty">
                {'★'.repeat(paper.difficulty || 3)}{'☆'.repeat(5 - (paper.difficulty || 3))}
              </span>
            </div>
            <button className="paper-start-btn" onClick={() => handleStart(paper.id)}>
              开始答题
            </button>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {filteredPapers.length === 0 && (
        <div className="empty-state">
          <p>暂无符合条件的试卷</p>
        </div>
      )}

      {/* 分页组件 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn prev"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>

          <div className="page-numbers">
            {generatePageNumbers(currentPage, totalPages).map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="page-ellipsis">...</span>
              ) : (
                <button
                  key={page}
                  className={`page-num ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          <button
            className="page-btn next"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

// 生成页码数组
function generatePageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}
