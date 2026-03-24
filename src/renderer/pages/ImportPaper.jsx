import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getAISettings, isAIConfigured, isOCRConfigured } from '../store/aiSettings.js';
import { useDialog } from '../components/DialogProvider.jsx';

const categoryConfig = {
  yanyu: { name: '言语理解', color: 'var(--category-yanyu)' },
  shuliang: { name: '数量关系', color: 'var(--category-shuliang)' },
  panduan: { name: '判断推理', color: 'var(--category-panduan)' },
  ziliao: { name: '资料分析', color: 'var(--category-ziliao)' },
  changshi: { name: '常识判断', color: 'var(--category-changshi)' },
};

// 子分类配置
const subCategoryConfig = {
  yanyu: ['选词填空', '片段阅读', '语句表达', '文章阅读'],
  shuliang: ['数学运算', '数字推理'],
  panduan: ['图形推理', '定义判断', '类比推理', '逻辑判断'],
  ziliao: ['文字资料', '表格资料', '图形资料', '综合资料'],
  changshi: ['政治', '经济', '法律', '科技', '人文', '地理'],
};

// 所有子分类合并
const allSubCategories = Object.values(subCategoryConfig).flat();

// 下载 Excel 模板（带下拉验证）
function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // 主数据 + 右侧分类说明
  const wsData = [
    ['题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '解析', '分类', '子分类', '', '', '分类说明'],
    ['下列说法正确的是：', '选项A内容', '选项B内容', '选项C内容', '选项D内容', 'A', '解析内容', '言语理解', '选词填空', '', '', '分类', '可选子分类'],
    ['', '', '', '', '', '', '', '', '', '', '', '言语理解', '选词填空, 片段阅读, 语句表达, 文章阅读'],
    ['', '', '', '', '', '', '', '', '', '', '', '数量关系', '数学运算, 数字推理'],
    ['', '', '', '', '', '', '', '', '', '', '', '判断推理', '图形推理, 定义判断, 类比推理, 逻辑判断'],
    ['', '', '', '', '', '', '', '', '', '', '', '资料分析', '文字资料, 表格资料, 图形资料, 综合资料'],
    ['', '', '', '', '', '', '', '', '', '', '', '常识判断', '政治, 经济, 法律, 科技, 人文, 地理'],
  ];

  // 添加空行供用户填写
  for (let i = 0; i < 100; i++) {
    wsData.push(['', '', '', '', '', '', '', '', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 设置列宽
  ws['!cols'] = [
    { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    { wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 14 },
    { wch: 2 }, { wch: 2 }, { wch: 12 }, { wch: 45 },
  ];

  // 数据验证（下拉列表）
  ws['!dataValidation'] = [
    { sqref: 'F2:F102', type: 'list', formula1: '"A,B,C,D"' },
    { sqref: 'H2:H102', type: 'list', formula1: '"言语理解,数量关系,判断推理,资料分析,常识判断"' },
    { sqref: 'I2:I102', type: 'list', formula1: `"${allSubCategories.join(',')}"` },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '题目导入');
  XLSX.writeFile(wb, '题目导入模板.xlsx');
}

export default function ImportPaper({ onBack, onImportComplete }) {
  const [step, setStep] = useState(0); // 0: 选择方式, 1: 选择文件, 2: 配置选项, 3: 预览确认, 4: 解析结果
  const [importMode, setImportMode] = useState(null); // 'ai' | 'template'
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [config, setConfig] = useState({
    category: 'yanyu',
    paperTitle: '',
    year: new Date().getFullYear(),
  });
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const { alert: showAlert } = useDialog();

  // 加载导入历史
  useEffect(() => {
    const loadHistory = async () => {
      if (window.openexam?.db) {
        try {
          const papers = await window.openexam.db.getImportedPapers();
          setImportHistory(papers);
        } catch (e) {
          console.error('加载导入历史失败:', e);
        }
      }
    };
    loadHistory();
  }, []);

  // 检查是否配置了 AI
  const hasAIConfig = () => isAIConfigured();
  const hasRecognitionConfig = () => isAIConfigured() || isOCRConfigured();

  const readFileAsBase64 = (targetFile) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(targetFile);
  });

  const renderPdfToImages = async (targetFile, maxPages = 6) => {
    const [pdfjsLib, workerSrcModule] = await Promise.all([
      import('pdfjs-dist/build/pdf.mjs'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrcModule.default;

    const bytes = await targetFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pageCount = Math.min(pdf.numPages, Math.max(1, Number(maxPages) || 6));
    const pages = [];

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
      const page = await pdf.getPage(pageIndex);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(canvas.toDataURL('image/png').split(',')[1]);
    }

    return pages;
  };

  const mergeRecognizedQuestions = (segments = [], fallbackCategory) => segments
    .flatMap((segment) => segment?.questions || [])
    .map((question) => ({
      ...question,
      category: question.category || fallbackCategory,
      subCategory: question.subCategory || '',
    }));

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      await validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = async (f) => {
    const ext = f.name.split('.').pop().toLowerCase();

    if (importMode === 'ai') {
      if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
        setFile(f);
        setConfig(prev => ({ ...prev, paperTitle: f.name.replace(/\.[^/.]+$/, '') }));
        setStep(2);
      } else {
        await showAlert({ title: '文件类型不支持', message: '请选择 PDF 或图片文件。', tone: 'warning' });
      }
    } else {
      if (['csv', 'xls', 'xlsx', 'json'].includes(ext)) {
        setFile(f);
        setConfig(prev => ({ ...prev, paperTitle: f.name.replace(/\.[^/.]+$/, '') }));
        setStep(2);
      } else {
        await showAlert({ title: '文件类型不支持', message: '请选择 Excel、CSV 或 JSON 文件。', tone: 'warning' });
      }
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (ext === 'csv') return '📊';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (ext === 'json') return '🧩';
    return '📁';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 分类名称映射
  const categoryNameToKey = {
    '言语理解': 'yanyu',
    '数量关系': 'shuliang',
    '判断推理': 'panduan',
    '资料分析': 'ziliao',
    '常识判断': 'changshi',
  };

  const normalizeJsonQuestion = (rawQuestion) => {
    if (!rawQuestion || typeof rawQuestion !== 'object') return null;
    const content = String(rawQuestion.content || '').trim();
    if (!content) return null;

    const normalizedOptions = Array.isArray(rawQuestion.options)
      ? rawQuestion.options
          .map((option, index) => {
            if (option && typeof option === 'object') {
              return {
                key: String(option.key || String.fromCharCode(65 + index)).toUpperCase(),
                content: String(option.content || ''),
              };
            }
            return {
              key: String.fromCharCode(65 + index),
              content: String(option || ''),
            };
          })
          .filter((option) => option.content)
      : [];

    if (normalizedOptions.length === 0) return null;

    const categoryRaw = String(rawQuestion.category || '').trim();
    const category = categoryNameToKey[categoryRaw] || categoryRaw || config.category;

    return {
      content,
      options: normalizedOptions,
      answer: String(rawQuestion.answer || '').trim().toUpperCase(),
      analysis: String(rawQuestion.analysis || ''),
      category,
      subCategory: String(rawQuestion.subCategory || rawQuestion.sub_category || ''),
      type: String(rawQuestion.type || 'single').toLowerCase(),
      difficulty: Number(rawQuestion.difficulty) || 2,
      tags: rawQuestion.tags || [],
    };
  };

  const parseJsonFile = async (targetFile) => {
    const text = await targetFile.text();
    const parsed = JSON.parse(text);
    const candidate = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed?.questions) ? parsed.questions : parsed?.data?.questions);

    if (!Array.isArray(candidate)) {
      throw new Error('JSON 格式不正确，需要 questions 数组');
    }

    return candidate
      .map((item) => normalizeJsonQuestion(item))
      .filter(Boolean);
  };

  // 解析 Excel/CSV 文件
  const parseFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length < 2) {
            reject(new Error('文件内容为空或格式不正确'));
            return;
          }

          const questions = [];
          // 从第2行开始（索引1），第1行是表头
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            // 跳过空行
            if (!row || row.length === 0) continue;

            // 获取题目内容（第1列）
            const content = String(row[0] || '').trim();
            // 跳过空题目或示例数据的占位行
            if (!content) continue;

            // 检查是否有有效的选项（至少有A选项）
            const optionA = String(row[1] || '').trim();
            if (!optionA) continue;

            const categoryName = String(row[7] || '').trim();
            const categoryKey = categoryNameToKey[categoryName] || config.category;

            questions.push({
              content: content,
              options: [
                { key: 'A', content: String(row[1] || '') },
                { key: 'B', content: String(row[2] || '') },
                { key: 'C', content: String(row[3] || '') },
                { key: 'D', content: String(row[4] || '') },
              ],
              answer: String(row[5] || '').toUpperCase(),
              analysis: String(row[6] || ''),
              category: categoryKey,
              subCategory: String(row[8] || ''),
            });
          }
          resolve(questions);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 解析 CSV 行（处理引号内的逗号）
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // 开始解析
  const handleStartParse = async () => {
    setParsing(true);
    setParseError(null);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let questions = [];

      if (['csv', 'xls', 'xlsx'].includes(ext)) {
        questions = await parseFile(file);
      } else if (ext === 'json') {
        questions = await parseJsonFile(file);
      } else {
        const settings = getAISettings();
        const needsAI = settings.recognizeEngine !== 'ocr' || settings.ocrResponseMode === 'text';

        if (needsAI && !hasAIConfig()) {
          setParseError('当前识别链路仍需要 AI 配置，请先在设置中配置 AI 服务');
          setParsing(false);
          return;
        }

        if (ext === 'pdf') {
          const pages = await renderPdfToImages(file, settings.pdfMaxPages);
          const pageResults = [];
          const pageSettings = settings.recognizeEngine === 'auto' && settings.ocrEnabled
            ? { ...settings, recognizeEngine: 'ocr' }
            : settings;
          for (const pageImageBase64 of pages) {
            const result = await window.openexam.ai.recognizeQuestions(pageSettings, pageImageBase64, 'image/png');
            if (result?.error) throw new Error(result.error);
            pageResults.push(result);
          }
          questions = mergeRecognizedQuestions(pageResults, config.category);
        } else {
          const imageBase64 = await readFileAsBase64(file);
          const result = await window.openexam.ai.recognizeQuestions(settings, imageBase64, file.type || 'image/png');
          if (result?.error) throw new Error(result.error);
          questions = mergeRecognizedQuestions([result], config.category);
        }
      }

      if (questions.length === 0) {
        setParseError('未能解析出任何题目，请检查文件格式');
      } else {
        setParsedQuestions(questions);
        setStep(4);
      }
    } catch (err) {
      setParseError(err.message || '解析失败');
    }

    setParsing(false);
  };

  // 确认导入
  const handleConfirmImport = async () => {
    try {
      // 保存到数据库
      if (window.openexam?.db) {
        const result = await window.openexam.db.importPaper(
          { title: config.paperTitle, year: config.year },
          parsedQuestions
        );
        await showAlert({ title: '导入成功', message: `共导入 ${result.questionCount} 道题目`, tone: 'success' });
      }
      onImportComplete?.({
        file,
        config,
        questions: parsedQuestions,
      });
    } catch (err) {
      await showAlert({ title: '导入失败', message: err.message || '未知错误', tone: 'danger' });
    }
  };

  return (
    <div className="import-page">
      <div className="import-header">
        <button className="back-btn" onClick={step === 0 && !showHistory ? onBack : () => { if (showHistory) setShowHistory(false); else setStep(step - 1); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          返回
        </button>
        <h2>{showHistory ? '导入历史' : '导入试卷'}</h2>
        {!showHistory && step === 0 && (
          <button className="history-btn" onClick={() => setShowHistory(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            导入历史 ({importHistory.length})
          </button>
        )}
        {!showHistory && step > 0 && (
          <div className="step-indicator">
            <span className={`step ${step >= 1 ? 'active' : ''}`}>1. 选择文件</span>
            <span className="step-line" />
            <span className={`step ${step >= 2 ? 'active' : ''}`}>2. 配置选项</span>
            <span className="step-line" />
            <span className={`step ${step >= 3 ? 'active' : ''}`}>3. 预览确认</span>
          </div>
        )}
      </div>

      <div className="import-content">
        {showHistory ? (
          <div className="import-history">
            {importHistory.length === 0 ? (
              <div className="empty-history">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>暂无导入记录</p>
              </div>
            ) : (
              <div className="history-list">
                {importHistory.map(paper => (
                  <div key={paper.id} className="history-item">
                    <div className="history-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div className="history-info">
                      <span className="history-title">{paper.title}</span>
                      <span className="history-meta">{paper.question_count} 道题 · {paper.year}年 · {paper.created_at?.split('T')[0] || '未知日期'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        {step === 0 && (
          <div className="import-mode-select">
            <h3>选择导入方式</h3>
            <div className="mode-cards">
              <div
                className={`mode-card ${!hasRecognitionConfig() ? 'disabled' : ''}`}
                onClick={() => { if (hasRecognitionConfig()) { setImportMode('ai'); setStep(1); } }}
              >
                <div className="mode-icon ai">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                    <circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>
                  </svg>
                </div>
                <span className="mode-title">智能/OCR 识别</span>
                <span className="mode-desc">上传 PDF/图片，自动走 AI 引擎或 OCR 引擎</span>
                {!hasRecognitionConfig() && <span className="mode-tip">需先在设置中配置 AI 或 OCR</span>}
              </div>

              <div
                className="mode-card"
                onClick={() => { setImportMode('template'); setStep(1); }}
              >
                <div className="mode-icon template">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <span className="mode-title">模板导入</span>
                <span className="mode-desc">下载 CSV 模板，按格式填写后上传</span>
                <button className="mode-download" onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  下载模板
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="import-step1">
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="drop-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="drop-text">拖拽文件到此处，或点击选择</p>
              <p className="drop-hint">
                {importMode === 'ai' ? '支持 PDF、图片格式' : '支持 Excel、CSV、JSON 格式'}
              </p>
              <input
                type="file"
                accept={importMode === 'ai' ? '.pdf,.png,.jpg,.jpeg' : '.csv,.xls,.xlsx,.json'}
                onChange={handleFileSelect}
                className="file-input"
              />
            </div>
            {importMode === 'template' && (
              <button className="template-btn" onClick={downloadTemplate}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                下载导入模板
              </button>
            )}
          </div>
        )}

        {step === 2 && file && (
          <div className="config-panel">
            <div className="file-preview">
              <span className="file-icon">{getFileIcon()}</span>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
              <button className="change-file" onClick={() => { setFile(null); setStep(1); }}>
                更换文件
              </button>
            </div>

            <div className="config-form">
              <div className="form-group">
                <label>试卷标题</label>
                <input
                  type="text"
                  value={config.paperTitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, paperTitle: e.target.value }))}
                  placeholder="输入试卷标题"
                />
              </div>

              <div className="form-group">
                <label>题目分类</label>
                <div className="category-select">
                  {Object.entries(categoryConfig).map(([key, val]) => (
                    <button
                      key={key}
                      className={`category-option ${config.category === key ? 'selected' : ''}`}
                      style={{ '--cat-color': val.color }}
                      onClick={() => setConfig(prev => ({ ...prev, category: key }))}
                    >
                      {val.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>年份</label>
                <input
                  type="number"
                  value={config.year}
                  onChange={(e) => setConfig(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  min="2000"
                  max="2030"
                />
              </div>
            </div>

            <div className="config-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>上一步</button>
              <button className="btn-primary" onClick={() => setStep(3)}>下一步</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="preview-panel">
            <div className="preview-info">
              <h3>确认导入信息</h3>
              <div className="preview-item">
                <span className="preview-label">文件名</span>
                <span className="preview-value">{file?.name}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">试卷标题</span>
                <span className="preview-value">{config.paperTitle}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">题目分类</span>
                <span className="preview-value">{categoryConfig[config.category]?.name}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">年份</span>
                <span className="preview-value">{config.year}</span>
              </div>
            </div>
            {parseError && (
              <div className="parse-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{parseError}</span>
              </div>
            )}
            <div className="preview-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <span>点击开始解析后，系统将解析文件中的题目</span>
            </div>
            <div className="config-actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>上一步</button>
              <button className="btn-primary" onClick={handleStartParse} disabled={parsing}>
                {parsing ? '解析中...' : '开始解析'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="preview-panel result-panel">
            <div className="result-header">
              <h3>解析结果</h3>
              <span className="result-count">共 {parsedQuestions.length} 道题目</span>
            </div>
            <div className="result-list">
              {parsedQuestions.slice(0, 5).map((q, idx) => (
                <div key={idx} className="result-item">
                  <span className="result-num">{idx + 1}</span>
                  <div className="result-content">
                    <p className="result-question">{q.content.slice(0, 80)}{q.content.length > 80 ? '...' : ''}</p>
                    <span className="result-answer">答案: {q.answer}</span>
                  </div>
                </div>
              ))}
              {parsedQuestions.length > 5 && (
                <div className="result-more">还有 {parsedQuestions.length - 5} 道题目...</div>
              )}
            </div>
            <div className="config-actions">
              <button className="btn-secondary" onClick={() => setStep(3)}>重新解析</button>
              <button className="btn-primary" onClick={handleConfirmImport}>
                确认导入
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
