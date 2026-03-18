import React, { useState, useEffect } from 'react';

const categoryNames = {
  yanyu: '言语理解',
  shuliang: '数量关系',
  panduan: '判断推理',
  ziliao: '资料分析',
  changshi: '常识判断'
};

export default function PracticeHistory({ onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgAccuracy: 0, totalTime: 0 });

  useEffect(() => {
    const loadRecords = async () => {
      if (!window.openexam?.db) {
        setLoading(false);
        return;
      }
      try {
        const data = await window.openexam.db.getPracticeRecords();
        setRecords(data || []);

        // 计算统计
        if (data && data.length > 0) {
          const total = data.length;
          const avgAccuracy = Math.round(data.reduce((sum, r) => sum + (r.accuracy || 0), 0) / total);
          const totalTime = data.reduce((sum, r) => sum + (r.duration || 0), 0);
          setStats({ total, avgAccuracy, totalTime });
        }
      } catch (err) {
        console.error('加载练习记录失败:', err);
      }
      setLoading(false);
    };
    loadRecords();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0分';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  };

  const formatTotalTime = (seconds) => {
    if (!seconds) return '0分钟';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时${m}分钟`;
    return `${m}分钟`;
  };

  if (loading) {
    return <div className="history-page"><div className="loading-state">加载中...</div></div>;
  }

  return (
    <div className="history-page">
      {/* 顶部 */}
      <div className="history-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          返回
        </button>
        <h2>练习历史</h2>
      </div>

      {/* 统计卡片 */}
      <div className="history-stats">
        <div className="hs-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6d5efb" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div className="hs-data">
            <span className="hs-value">{stats.total}</span>
            <span className="hs-label">练习次数</span>
          </div>
        </div>
        <div className="hs-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <div className="hs-data">
            <span className="hs-value">{stats.avgAccuracy}%</span>
            <span className="hs-label">平均正确率</span>
          </div>
        </div>
        <div className="hs-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <div className="hs-data">
            <span className="hs-value">{formatTotalTime(stats.totalTime)}</span>
            <span className="hs-label">累计用时</span>
          </div>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="history-list">
        {records.length === 0 ? (
          <div className="empty-history">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>暂无练习记录</p>
            <span>开始练习后，记录将显示在这里</span>
          </div>
        ) : (
          records.map((record, idx) => (
            <div key={record.id || idx} className="history-record">
              <div className="hr-left">
                <div className="hr-icon" style={{
                  background: record.accuracy >= 60 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: record.accuracy >= 60 ? '#10b981' : '#ef4444'
                }}>
                  {record.accuracy >= 60 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                </div>
                <div className="hr-info">
                  <span className="hr-title">{categoryNames[record.category] || record.category || '综合练习'}</span>
                  <span className="hr-meta">{formatDate(record.created_at)} · {record.total_count || 0}题 · {formatDuration(record.duration)}</span>
                </div>
              </div>
              <div className="hr-right">
                <span className="hr-accuracy" style={{ color: record.accuracy >= 60 ? '#10b981' : '#ef4444' }}>
                  {record.accuracy || 0}%
                </span>
                <span className="hr-score">{record.correct_count || 0}/{record.total_count || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
