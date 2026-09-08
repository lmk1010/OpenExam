/**
 * 行测三级考点树：模块 → 题型 → 考点
 * 一二级沿用题库既有的 category / sub_category 编码，第三级是新增的 skill_point。
 * 打标脚本和掌握度统计共用这份定义。
 */

const SKILL_POINT_TREE = {
  yanyu: {
    label: '言语理解',
    subs: {
      xuanci: {
        label: '逻辑填空',
        points: [
          ['shici', '实词辨析'],
          ['chengyu', '成语辨析'],
          ['guanlianci', '关联词填空'],
          ['yujing', '语境分析'],
          ['hunda', '混搭填空'],
        ],
      },
      yueduan: {
        label: '片段阅读',
        points: [
          ['zhongxin', '中心理解'],
          ['xijie', '细节判断'],
          ['biaoti', '标题填入'],
          ['cijv', '词句理解'],
          ['taidu', '态度观点'],
          ['tuiduan', '推断下文'],
        ],
      },
      yuju: {
        label: '语句表达',
        points: [
          ['paixu', '语句排序'],
          ['tianchong', '语句填充'],
          ['jieyu', '接语选择'],
        ],
      },
      wenzhang: {
        label: '文章阅读',
        points: [
          ['wenzhang', '文章阅读'],
        ],
      },
    },
  },

  shuliang: {
    label: '数量关系',
    subs: {
      jisuan: {
        label: '数学运算',
        points: [
          ['xingcheng', '行程问题'],
          ['gongcheng', '工程问题'],
          ['lirun', '利润问题'],
          ['nongdu', '浓度问题'],
          ['pailie', '排列组合'],
          ['gailv', '概率问题'],
          ['jihe', '几何问题'],
          ['rongchi', '容斥原理'],
          ['fangzhen', '方阵问题'],
          ['nianling', '年龄问题'],
          ['jitu', '鸡兔同笼'],
          ['zhouqi', '周期问题'],
          ['zuizhi', '最值问题'],
          ['chouti', '抽屉原理'],
          ['yingkui', '盈亏问题'],
          ['zhishu', '植树问题'],
          ['shizhong', '时钟问题'],
          ['shulie', '数列问题'],
          ['jisuan', '基础计算'],
        ],
      },
      tuili: {
        label: '数字推理',
        points: [
          ['dengcha', '等差数列'],
          ['dengbi', '等比数列'],
          ['hecha', '和差数列'],
          ['jishang', '积商数列'],
          ['duoji', '多级数列'],
          ['zuhe', '组合数列'],
          ['shuzhen', '图形数阵'],
        ],
      },
    },
  },

  panduan: {
    label: '判断推理',
    subs: {
      tuxing: {
        label: '图形推理',
        points: [
          ['weizhi', '位置类'],
          ['yangshi', '样式类'],
          ['shuxing', '属性类'],
          ['shuliang', '数量类'],
          ['chongguo', '空间重构'],
          ['pinhe', '立体拼合'],
        ],
      },
      dingyi: {
        label: '定义判断',
        points: [
          ['dan', '单定义'],
          ['duo', '多定义'],
        ],
      },
      leibi: {
        label: '类比推理',
        points: [
          ['yuyi', '语义关系'],
          ['luoji', '逻辑关系'],
          ['yufa', '语法关系'],
          ['changshi', '常识关系'],
        ],
      },
      luoji: {
        label: '逻辑判断',
        points: [
          ['fanyi', '翻译推理'],
          ['zhenjia', '真假推理'],
          ['fenxi', '分析推理'],
          ['guina', '归纳推理'],
          ['jiaqiang', '加强论证'],
          ['xuoruo', '削弱论证'],
          ['qianti', '前提假设'],
          ['jieshi', '解释类'],
          ['jielun', '日常结论'],
        ],
      },
    },
  },

  ziliao: {
    label: '资料分析',
    subs: {
      zonghe: {
        label: '资料分析',
        points: [
          ['zengzhanglv', '增长率'],
          ['zengzhangliang', '增长量'],
          ['jiqiliang', '基期量'],
          ['xianqiliang', '现期量'],
          ['nianjun', '年均增长'],
          ['bizhong', '比重'],
          ['beishu', '倍数与番数'],
          ['pingjun', '平均数'],
          ['bizhi', '比值比较'],
          ['zonghefenxi', '综合分析'],
          ['jiandan', '简单计算'],
        ],
      },
    },
  },

  changshi: {
    label: '常识判断',
    subs: {
      zhengzhi: {
        label: '政治',
        points: [
          ['shizheng', '时政热点'],
          ['makesi', '马克思主义'],
          ['zhongte', '中特理论'],
          ['dangshi', '党史党建'],
        ],
      },
      falv: {
        label: '法律',
        points: [
          ['xianfa', '宪法'],
          ['minfa', '民法'],
          ['xingfa', '刑法'],
          ['xingzheng', '行政法'],
          ['susong', '诉讼法'],
          ['jingjifa', '经济法'],
        ],
      },
      jingji: {
        label: '经济',
        points: [
          ['weiguan', '微观经济'],
          ['hongguan', '宏观经济'],
          ['guoji', '国际经济'],
        ],
      },
      keji: {
        label: '科技',
        points: [
          ['wuli', '物理'],
          ['huaxue', '化学'],
          ['shengwu', '生物'],
          ['gaoxin', '高新技术'],
          ['shenghuo', '生活常识'],
        ],
      },
      renwen: {
        label: '人文',
        points: [
          ['lishi', '历史'],
          ['wenxue', '文学'],
          ['yishu', '艺术'],
          ['wenhua', '文化常识'],
        ],
      },
      dili: {
        label: '地理',
        points: [
          ['ziran', '自然地理'],
          ['renwendili', '人文地理'],
          ['guoqing', '国情地理'],
        ],
      },
    },
  },
};

/** 未能归类时的兜底考点 */
const UNCLASSIFIED = 'other';

/** 完整考点 id：`${category}.${subCategory}.${pointKey}` */
function makePointId(category, subCategory, pointKey) {
  return `${category}.${subCategory}.${pointKey}`;
}

/** 某题型下的候选考点，供打标提示词和统计使用 */
function getPoints(category, subCategory) {
  const sub = SKILL_POINT_TREE[category]?.subs?.[subCategory];
  if (!sub) return [];
  return sub.points.map(([key, label]) => ({
    key,
    label,
    id: makePointId(category, subCategory, key),
  }));
}

function getSubLabel(category, subCategory) {
  return SKILL_POINT_TREE[category]?.subs?.[subCategory]?.label || subCategory || '';
}

function getCategoryLabel(category) {
  return SKILL_POINT_TREE[category]?.label || category || '';
}

/** 由完整考点 id 反查中文名，用于界面展示 */
function getPointLabel(pointId) {
  if (!pointId || pointId === UNCLASSIFIED) return '未分类';
  const [category, subCategory, pointKey] = String(pointId).split('.');
  const found = getPoints(category, subCategory).find((p) => p.key === pointKey);
  return found ? found.label : '未分类';
}

/** 完整考点 id 列表，打标脚本用来校验 AI 返回值 */
function getAllPointIds() {
  const ids = [];
  for (const [category, mod] of Object.entries(SKILL_POINT_TREE)) {
    for (const subCategory of Object.keys(mod.subs)) {
      for (const point of getPoints(category, subCategory)) ids.push(point.id);
    }
  }
  return ids;
}

/** 校验：AI 返回的 key 必须属于该题型 */
function isValidPointKey(category, subCategory, pointKey) {
  return getPoints(category, subCategory).some((p) => p.key === pointKey);
}

module.exports = {
  SKILL_POINT_TREE,
  UNCLASSIFIED,
  makePointId,
  getPoints,
  getPointLabel,
  getSubLabel,
  getCategoryLabel,
  getAllPointIds,
  isValidPointKey,
};
