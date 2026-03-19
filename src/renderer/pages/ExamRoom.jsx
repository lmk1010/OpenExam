import React, { useState, useEffect, useRef } from 'react';
import { getState, actions } from '../store/examStore.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const CAT_NAMES = {
  yanyu:    '言语理解',
  shuliang: '数量关系',
  panduan:  '判断推理',
  ziliao:   '资料分析',
  changshi: '常识判断',
};
const CAT_COLORS = {
  yanyu:    { color: '#6d5efb', bg: 'rgba(109,94,251,0.10)' },
  shuliang: { color: '#1e78ff', bg: 'rgba(30,120,255,0.10)' },
  panduan:  { color: '#00b894', bg: 'rgba(0,184,148,0.10)' },
  ziliao:   { color: '#f39c12', bg: 'rgba(243,156,18,0.10)' },
  changshi: { color: '#e74c3c', bg: 'rgba(231,76,60,0.10)' },
  default:  { color: '#6d5efb', bg: 'rgba(109,94,251,0.10)' },
};

// ─── Svg icons ────────────────────────────────────────────────────────────────
const Ico = ({ d, size = 14, sw = 1.8, col = 'currentColor', extra }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}{extra}
  </svg>
);

// ─── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({ show, title, message, onConfirm, onCancel }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center' }} onClick={onCancel}>
      <div style={{ background: 'var(--surface)', width: 340, borderRadius: 18, padding: '28px 24px', boxShadow: '0 24px 48px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(109,94,251,0.1)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
          <Ico d={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>} size={22} sw={2} col="var(--accent)" />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 5px', color: 'var(--text)' }}>{title}</h3>
          {message && <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>{message}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'var(--surface-soft)', color: 'var(--text)', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={onCancel}>取消</button>
          <button style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(109,94,251,0.28)' }} onClick={onConfirm}>确定</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExamRoom({ paperId, questions: propQuestions, config, onFinish, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]           = useState({});
  const [timeElapsed, setTimeElapsed]   = useState(0);
  const [questions, setQuestions]       = useState([]);
  const [paper, setPaper]               = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [layoutMode, setLayoutMode]     = useState('split');
  const bodyRef = useRef(null);

  useEffect(() => {
    if (propQuestions?.length > 0) {
      setQuestions(propQuestions);
      setPaper({ title: `${CAT_NAMES[config?.category] || '专项'}练习`, type: 'practice' });
    } else if (paperId) {
      const state = getState();
      setQuestions(state.currentQuestions || []);
      setPaper(state.currentPaper);
    }
  }, [paperId, propQuestions, config]);

  const currentQuestion = questions[currentIndex];
  const isMemorizeMode  = config?.mode === 'memorize';

  useEffect(() => {
    const t = setInterval(() => setTimeElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return `${h > 0 ? h.toString().padStart(2,'0') + ':' : ''}${m.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
  };

  const handleSelect = key => {
    const next = { ...answers, [currentQuestion.id]: key };
    setAnswers(next);
    if (paperId) actions.submitAnswer(currentQuestion.id, key);
    setShowAnalysis(true);
  };

  const goPrev = () => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); setShowAnalysis(isMemorizeMode); bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const goNext = () => { if (currentIndex < questions.length - 1) { setCurrentIndex(i => i + 1); setShowAnalysis(isMemorizeMode); bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const goToQ  = i => { setCurrentIndex(i); setShowAnalysis(isMemorizeMode); bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSubmit = async () => {
    const unanswered = questions.length - Object.keys(answers).length;
    const doSubmit = async () => {
      let correctCount = 0;
      const wrongQuestions = [];
      questions.forEach(q => {
        if (answers[q.id] === q.answer) correctCount++;
        else if (answers[q.id]) wrongQuestions.push({ questionId: q.id, paperId: q.paper_id || paperId, userAnswer: answers[q.id], correctAnswer: q.answer });
      });
      const result = { totalCount: questions.length, correctCount, wrongCount: Object.keys(answers).length - correctCount, unanswered, accuracy: Math.round((correctCount / questions.length) * 100), timeElapsed, answers, questions, config };
      try {
        const recordId = `record_${Date.now()}`;
        await window.openexam.db.savePracticeRecord({ id: recordId, paperId: paperId || null, category: config?.category || null, subCategory: config?.subCategory || null, startTime: new Date(Date.now() - timeElapsed * 1000).toISOString(), endTime: new Date().toISOString(), duration: timeElapsed, status: 'completed', answers, correctCount, totalCount: questions.length, accuracy: result.accuracy, score: Math.round((correctCount / questions.length) * 100) });
        for (const wq of wrongQuestions) await window.openexam.db.addWrongQuestion(wq);
      } catch (err) { console.error('保存失败:', err); }
      if (paperId) { onFinish(await actions.finishExam()); } else { onFinish(result); }
    };
    setConfirmModal({ show: true, title: '确定交卷？', message: unanswered > 0 ? `还有 ${unanswered} 题未作答` : '提交后将无法修改答案', onConfirm: () => { setConfirmModal({ show: false }); doSubmit(); } });
  };

  const handleExit = () => setConfirmModal({ show: true, title: '确定退出？', message: '当前答题进度将丢失', onConfirm: () => { setConfirmModal({ show: false }); onExit(); } });

  if (!currentQuestion || questions.length === 0) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--muted)', fontSize: 13 }}>加载中…</div>;
  }

  const answeredCount   = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);
  const catPalette      = CAT_COLORS[currentQuestion?.category] || CAT_COLORS.default;

  // ── Group questions by category for sidebar ──
  const grouped = questions.reduce((acc, q, idx) => {
    const cat = q.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...q, _idx: idx });
    return acc;
  }, {});

  // ── Per-category stats ──
  const catStats = Object.entries(grouped).map(([cat, qs]) => ({
    cat,
    name: CAT_NAMES[cat] || cat,
    total: qs.length,
    done: qs.filter(q => answers[q.id]).length,
    palette: CAT_COLORS[cat] || CAT_COLORS.default,
  }));

  // ── Option rendering ──
  const renderOptions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {currentQuestion.options.map(opt => {
        const isSelected = answers[currentQuestion.id] === opt.key;
        const isCorrect  = opt.key === currentQuestion.answer;
        const showResult = isMemorizeMode || (answers[currentQuestion.id] && showAnalysis);

        let border = '1px solid var(--line)', bg = 'var(--surface)', tagBg = 'var(--surface-soft)', tagCol = 'var(--muted)';
        if (showResult) {
          if (isCorrect)       { border = '1.5px solid #00b894'; bg = 'rgba(0,184,148,0.05)'; tagBg = '#00b894'; tagCol = '#fff'; }
          else if (isSelected) { border = '1.5px solid #e74c3c'; bg = 'rgba(231,76,60,0.04)'; tagBg = '#e74c3c'; tagCol = '#fff'; }
        } else if (isSelected)   { border = `1.5px solid var(--accent)`; bg = 'rgba(109,94,251,0.05)'; tagBg = 'var(--accent)'; tagCol = '#fff'; }

        return (
          <button key={opt.key} onClick={() => handleSelect(opt.key)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px',
            borderRadius: 10, border, background: bg,
            textAlign: 'left', cursor: showResult ? 'default' : 'pointer', transition: 'all 0.18s',
            boxShadow: isSelected && !showResult ? '0 2px 8px rgba(109,94,251,0.08)' : 'none',
          }}
            onMouseOver={e => { if (!showResult && !isSelected) e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseOut={e => { if (!showResult && !isSelected) e.currentTarget.style.borderColor = 'var(--line)'; }}>
            <span style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, background: tagBg, color: tagCol, transition: 'all 0.18s' }}>
              {opt.key}
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', paddingTop: 1 }}>{opt.content}</span>
          </button>
        );
      })}
    </div>
  );

  // ── Analysis card ──
  const renderAnalysis = () => {
    if (!isMemorizeMode && !(answers[currentQuestion.id] && showAnalysis)) return null;
    const isRight = answers[currentQuestion.id] === currentQuestion.answer;
    return (
      <div style={{ marginTop: 20, padding: '16px 18px', background: 'rgba(109,94,251,0.03)', borderRadius: 10, border: '1px solid rgba(109,94,251,0.12)', animation: 'fadeIn 0.25s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {answers[currentQuestion.id] ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 5, color: isRight ? '#00b894' : '#e74c3c', background: isRight ? 'rgba(0,184,148,0.1)' : 'rgba(231,76,60,0.1)' }}>
              {isRight
                ? <><Ico d={<polyline points="20 6 9 17 4 12"/>} size={12} sw={2.5} col="#00b894"/>回答正确</>
                : <><Ico d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={12} sw={2.5} col="#e74c3c"/>回答错误</>
              }
            </span>
          ) : null}
          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>
            正确答案：<span style={{ color: 'var(--accent)', fontWeight: 700 }}>{currentQuestion.answer}</span>
          </span>
        </div>
        {currentQuestion.analysis && (
          <div style={{ fontSize: 12, lineHeight: 1.75, color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>解析：</strong>
            {currentQuestion.analysis}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'var(--surface)', overflow: 'hidden' }}>

      {/* ═══ TOP BAR ═══ */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 0 80px', height: 52, borderBottom: '1px solid var(--line)', background: 'var(--surface)', flexShrink: 0, zIndex: 10, WebkitAppRegion: 'drag' }}>
        {/* Exit */}
        <button onClick={handleExit} style={{ WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--line)', padding: '5px 13px', borderRadius: 16, fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--surface-soft)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
          <Ico d={<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} size={13} sw={2} />
          退出
        </button>

        {/* Title */}
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.5px' }}>{paper?.title}</div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, WebkitAppRegion: 'no-drag' }}>
          {/* Layout toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-soft)', borderRadius: 7, padding: 3, gap: 2 }}>
            {[
              { key: 'centered', tip: '居中', icon: <><rect x="6" y="4" width="12" height="16" rx="2"/></> },
              { key: 'full',     tip: '展宽', icon: <><rect x="2" y="4" width="20" height="16" rx="2"/></> },
              { key: 'split',    tip: '分屏', icon: <><rect x="2" y="4" width="8" height="16" rx="2"/><rect x="14" y="4" width="8" height="16" rx="2"/></> },
            ].map(m => (
              <button key={m.key} title={m.tip} onClick={() => setLayoutMode(m.key)} style={{ width: 28, height: 28, borderRadius: 5, border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', background: layoutMode === m.key ? 'var(--surface)' : 'transparent', color: layoutMode === m.key ? 'var(--accent)' : 'var(--muted)', boxShadow: layoutMode === m.key ? '0 1px 4px rgba(0,0,0,0.07)' : 'none', transition: 'all 0.2s' }}>
                <Ico d={m.icon} size={14} sw={1.5} />
              </button>
            ))}
          </div>

          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(109,94,251,0.06)', borderRadius: 16, color: 'var(--accent)', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
            <Ico d={<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>} size={13} sw={2} col="var(--accent)" />
            {formatTime(timeElapsed)}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} style={{ padding: '7px 20px', borderRadius: 16, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(109,94,251,0.28)', transition: 'transform 0.1s' }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onPointerUp={e => e.currentTarget.style.transform = ''}>
            交卷
          </button>
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{ width: 230, background: 'var(--surface-soft)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>

          {/* Progress header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px' }}>答题进度</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                {answeredCount}<span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}> / {questions.length}</span>
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ width: '100%', height: 4, background: 'rgba(109,94,251,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent)', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ marginTop: 7, fontSize: 10, color: 'var(--muted)' }}>
              {progressPercent}% 已完成 · 用时 <span style={{ color: 'var(--text)', fontWeight: 600, fontFamily: 'monospace' }}>{formatTime(timeElapsed)}</span>
            </div>
          </div>

          {/* Per-category mini stats */}
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: 7 }}>分类统计</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {catStats.map(cs => (
                <div key={cs.cat} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: cs.palette.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cs.name}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: cs.done === cs.total ? cs.palette.color : 'var(--text)', fontWeight: cs.done === cs.total ? 700 : 400 }}>
                    {cs.done}/{cs.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Answer card — grouped by category */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Ico d={<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>} size={11} sw={1.8} />
              答题卡
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(grouped).map(([cat, qs]) => {
                const pal = CAT_COLORS[cat] || CAT_COLORS.default;
                const name = CAT_NAMES[cat] || cat;
                const doneCnt = qs.filter(q => answers[q.id]).length;
                return (
                  <div key={cat}>
                    {/* Category label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                      <span style={{ width: 3, height: 12, borderRadius: 2, background: pal.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: pal.color }}>{name}</span>
                      <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'monospace' }}>{doneCnt}/{qs.length}</span>
                    </div>
                    {/* Grid of question buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
                      {qs.map(q => {
                        const isAnswered = !!answers[q.id];
                        const isCurrent  = q._idx === currentIndex;
                        return (
                          <button key={q.id} onClick={() => goToQ(q._idx)} title={`第 ${q._idx + 1} 题`}
                            style={{
                              aspectRatio: '1/1', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'all 0.15s',
                              ...(isCurrent ? {
                                border: `2px solid ${pal.color}`, background: pal.color, color: '#fff',
                                boxShadow: `0 2px 8px ${pal.color}40`,
                              } : isAnswered ? {
                                border: `1px solid ${pal.color}60`, background: pal.bg, color: pal.color,
                              } : {
                                border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--muted)',
                              }),
                            }}>
                            {q._idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: '未答', border: '1px solid var(--line)', bg: 'var(--surface)' },
              { label: '已答', border: '1px solid rgba(109,94,251,0.5)', bg: 'rgba(109,94,251,0.08)' },
              { label: '当前', border: '2px solid #6d5efb', bg: '#6d5efb' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, border: l.border, background: l.bg, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── RIGHT: MAIN AREA ── */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{
            maxWidth: layoutMode === 'centered' ? 760 : layoutMode === 'full' ? 'none' : 'none',
            margin: layoutMode === 'centered' ? '0 auto' : '0',
            padding: '28px 36px 100px',
            display: 'flex', flexDirection: 'column', gap: 0, flex: 1,
            width: '100%', boxSizing: 'border-box',
          }}>

            {/* ── QUESTION CARD ── */}
            <div style={{
              background: 'var(--surface-soft)', borderRadius: 14, border: '1px solid var(--line)',
              overflow: 'hidden', marginBottom: 16,
            }}>
              {/* Category ribbon */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', borderBottom: '1px solid var(--line)',
                background: catPalette.bg,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: catPalette.color, fontFamily: 'monospace', lineHeight: 1 }}>{currentIndex + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, fontFamily: 'monospace' }}>/{questions.length}</span>
                </div>
                <div style={{ width: 1, height: 14, background: `${catPalette.color}40` }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: catPalette.color, padding: '2px 8px', borderRadius: 5, background: `${catPalette.color}18` }}>
                  {currentQuestion.category ? (CAT_NAMES[currentQuestion.category] || currentQuestion.category) : '综合'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--muted)', padding: '2px 7px', borderRadius: 5, background: 'rgba(0,0,0,0.04)' }}>
                  {currentQuestion.type === 'single' ? '单选题' : '多选题'}
                </span>
                {/* Difficulty dots if available */}
                {currentQuestion.difficulty && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>难度</span>
                    {[1,2,3,4,5].map(d => (
                      <span key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: d <= (currentQuestion.difficulty || 3) ? catPalette.color : 'rgba(0,0,0,0.08)' }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Question text */}
              <div style={{ padding: '20px 20px 22px' }}>
                <div style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--text)', fontWeight: 500, letterSpacing: '0.15px', userSelect: 'text' }}>
                  {currentQuestion.content.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: '0 0 10px', textAlign: 'justify' }}>{line}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* ── OPTIONS ── */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.8px', marginBottom: 9 }}>
                作答区域 {currentQuestion.type !== 'single' && <span style={{ color: catPalette.color }}>（可多选）</span>}
              </div>
              {renderOptions()}
            </div>

            {/* ── ANALYSIS ── */}
            {renderAnalysis()}

          </div>

          {/* ── BOTTOM NAV (sticky) ── */}
          <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0, height: 76,
            background: 'linear-gradient(to top, var(--surface) 55%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            pointerEvents: 'none',
          }}>
            <button disabled={currentIndex === 0} onClick={goPrev} style={{
              pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 22px', borderRadius: 20, background: 'var(--surface)',
              border: '1px solid var(--line)', color: currentIndex === 0 ? 'var(--muted)' : 'var(--text)',
              fontSize: 13, fontWeight: 600, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)', opacity: currentIndex === 0 ? 0.45 : 1,
              transition: 'all 0.2s',
            }}>
              <Ico d={<><path d="M19 12H5M12 19l-7-7 7-7"/></>} size={14} sw={2} />
              上一题
            </button>

            {/* Question counter pills */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {questions.slice(Math.max(0, currentIndex - 2), Math.min(questions.length, currentIndex + 3)).map((q, i) => {
                const idx = Math.max(0, currentIndex - 2) + i;
                const isCur = idx === currentIndex;
                return (
                  <button key={idx} onClick={() => goToQ(idx)} style={{
                    pointerEvents: 'auto',
                    width: isCur ? 28 : 22, height: 22, borderRadius: 11,
                    border: isCur ? '2px solid var(--accent)' : '1px solid var(--line)',
                    background: isCur ? 'var(--accent)' : answers[q.id] ? 'rgba(109,94,251,0.1)' : 'var(--surface)',
                    color: isCur ? '#fff' : 'var(--muted)',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button disabled={currentIndex === questions.length - 1} onClick={goNext} style={{
              pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 22px', borderRadius: 20, background: 'var(--surface)',
              border: '1px solid var(--line)', color: currentIndex === questions.length - 1 ? 'var(--muted)' : 'var(--text)',
              fontSize: 13, fontWeight: 600, cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.06)', opacity: currentIndex === questions.length - 1 ? 0.45 : 1,
              transition: 'all 0.2s',
            }}>
              下一题
              <Ico d={<><path d="M5 12h14M12 5l7 7-7 7"/></>} size={14} sw={2} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal show={confirmModal.show} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({ show: false })} />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
      ` }} />
    </div>
  );
}
