// 试卷数据
export const papers = [
  {
    id: "paper_2024_national_xingce",
    title: "2024年国家公务员考试行测真题",
    year: 2024,
    type: "national",
    subject: "xingce",
    province: null,
    questionCount: 5,
    duration: 120,
    difficulty: 3,
    createdAt: "2024-01-15"
  },
  {
    id: "paper_2024_beijing_xingce",
    title: "2024年北京市公务员考试行测真题",
    year: 2024,
    type: "provincial",
    subject: "xingce",
    province: "北京",
    questionCount: 3,
    duration: 120,
    difficulty: 3,
    createdAt: "2024-03-20"
  },
  {
    id: "paper_2023_national_xingce",
    title: "2023年国家公务员考试行测真题",
    year: 2023,
    type: "national",
    subject: "xingce",
    province: null,
    questionCount: 2,
    duration: 120,
    difficulty: 3,
    createdAt: "2023-01-10"
  }
];

// 题目数据
export const questions = {
  "paper_2024_national_xingce": [
    {
      id: "q_001",
      order: 1,
      type: "single",
      category: "yanyu",
      subCategory: "xuanci",
      content: "依次填入下列横线处的词语，最恰当的一组是：\n\n科学研究需要______的态度，任何______都可能导致实验失败。",
      options: [
        { key: "A", content: "严谨  疏忽" },
        { key: "B", content: "严格  忽略" },
        { key: "C", content: "严肃  疏漏" },
        { key: "D", content: "严密  忽视" }
      ],
      answer: "A",
      analysis: "第一空，严谨指严密谨慎，常用于形容治学、工作态度，与科学研究搭配恰当。第二空，疏忽指粗心大意，与导致实验失败语境相符。故选A。",
      difficulty: 2,
      tags: ["选词填空", "近义词辨析"]
    },
    {
      id: "q_002",
      order: 2,
      type: "single",
      category: "yanyu",
      subCategory: "yueduan",
      content: "下列各句中，没有语病的一句是：",
      options: [
        { key: "A", content: "通过这次培训，使我对新技术有了更深入的了解。" },
        { key: "B", content: "能否保持良好的心态，是考试取得好成绩的关键。" },
        { key: "C", content: "这篇文章的作者是一位著名的青年作家写的。" },
        { key: "D", content: "随着科技的发展，人们的生活水平不断提高。" }
      ],
      answer: "D",
      analysis: "A项缺主语；B项两面对一面；C项句式杂糅。D项表述正确。",
      difficulty: 2,
      tags: ["病句辨析"]
    },
    {
      id: "q_003",
      order: 3,
      type: "single",
      category: "shuliang",
      subCategory: "sudu",
      content: "某商品原价100元，先涨价20%，再打八折出售，最终售价是多少元？",
      options: [
        { key: "A", content: "92元" },
        { key: "B", content: "96元" },
        { key: "C", content: "100元" },
        { key: "D", content: "104元" }
      ],
      answer: "B",
      analysis: "原价100元，涨价20%后为120元，再打八折为96元。故选B。",
      difficulty: 1,
      tags: ["经济利润"]
    },
    {
      id: "q_004",
      order: 4,
      type: "single",
      category: "panduan",
      subCategory: "luoji",
      content: "所有的玫瑰都是花，有些花会在冬天凋谢，所以有些玫瑰会在冬天凋谢。\n\n以下哪项最能说明上述推理的错误？",
      options: [
        { key: "A", content: "所有的苹果都是水果，有些水果是甜的，所以有些苹果是甜的" },
        { key: "B", content: "所有的猫都是动物，有些动物会游泳，所以有些猫会游泳" },
        { key: "C", content: "所有的学生都是人，有些人是老师，所以有些学生是老师" },
        { key: "D", content: "所有的铁都是金属，有些金属很贵重，所以有些铁很贵重" }
      ],
      answer: "B",
      analysis: "题干推理形式为无效推理。B项结构相同且结论明显错误，最能说明这种推理的错误。",
      difficulty: 3,
      tags: ["逻辑推理"]
    },
    {
      id: "q_005",
      order: 5,
      type: "single",
      category: "changshi",
      subCategory: "zhengzhi",
      content: "下列关于我国基本政治制度的说法，正确的是：",
      options: [
        { key: "A", content: "人民代表大会制度是我国的根本政治制度" },
        { key: "B", content: "民族区域自治制度只在少数民族聚居区实行" },
        { key: "C", content: "基层群众自治制度是我国的基本政治制度之一" },
        { key: "D", content: "以上说法都正确" }
      ],
      answer: "D",
      analysis: "A、B、C三项说法均正确。故选D。",
      difficulty: 2,
      tags: ["政治常识"]
    }
  ],
  "paper_2024_beijing_xingce": [
    {
      id: "q_bj_001",
      order: 1,
      type: "single",
      category: "yanyu",
      subCategory: "xuanci",
      content: "填入下列横线处的词语，最恰当的是：\n\n这座城市的发展______了传统与现代的完美结合。",
      options: [
        { key: "A", content: "体现" },
        { key: "B", content: "表现" },
        { key: "C", content: "展示" },
        { key: "D", content: "显示" }
      ],
      answer: "A",
      analysis: "体现指某种性质或现象在某一事物上具体表现出来，与完美结合搭配恰当。故选A。",
      difficulty: 2,
      tags: ["选词填空"]
    },
    {
      id: "q_bj_002",
      order: 2,
      type: "single",
      category: "shuliang",
      subCategory: "jisuan",
      content: "1, 4, 9, 16, 25, ?",
      options: [
        { key: "A", content: "30" },
        { key: "B", content: "36" },
        { key: "C", content: "42" },
        { key: "D", content: "49" }
      ],
      answer: "B",
      analysis: "这是一个平方数列：1, 4, 9, 16, 25, 36。故选B。",
      difficulty: 1,
      tags: ["数字推理"]
    },
    {
      id: "q_bj_003",
      order: 3,
      type: "single",
      category: "ziliao",
      subCategory: "zengzhang",
      content: "2022年某市GDP为5000亿元，比上年增长8%。问2021年该市GDP约为多少亿元？",
      options: [
        { key: "A", content: "4600亿元" },
        { key: "B", content: "4630亿元" },
        { key: "C", content: "4670亿元" },
        { key: "D", content: "4700亿元" }
      ],
      answer: "B",
      analysis: "设2021年GDP为x，则x乘以1.08等于5000，x约等于4630亿元。故选B。",
      difficulty: 2,
      tags: ["资料分析"]
    }
  ],
  "paper_2023_national_xingce": [
    {
      id: "q_2023_001",
      order: 1,
      type: "single",
      category: "changshi",
      subCategory: "dili",
      content: "下列关于我国地理的说法，正确的是：",
      options: [
        { key: "A", content: "长江是我国第一大河" },
        { key: "B", content: "黄河是我国第二长河" },
        { key: "C", content: "珠穆朗玛峰是世界最高峰" },
        { key: "D", content: "以上说法都正确" }
      ],
      answer: "D",
      analysis: "A、B、C三项说法均正确。故选D。",
      difficulty: 1,
      tags: ["地理常识"]
    },
    {
      id: "q_2023_002",
      order: 2,
      type: "single",
      category: "shuliang",
      subCategory: "jisuan",
      content: "一个水池有甲、乙两个进水管，单独开甲管6小时可注满，单独开乙管8小时可注满。两管同时开，多少小时可注满？",
      options: [
        { key: "A", content: "3小时" },
        { key: "B", content: "3.4小时" },
        { key: "C", content: "3.5小时" },
        { key: "D", content: "4小时" }
      ],
      answer: "B",
      analysis: "甲管效率1/6，乙管效率1/8，两管同时开效率为7/24，需要24/7约等于3.4小时。",
      difficulty: 2,
      tags: ["工程问题"]
    }
  ]
};

// 题目分类
export const categories = {
  yanyu: { name: "言语理解", icon: "📖" },
  shuliang: { name: "数量关系", icon: "🔢" },
  panduan: { name: "判断推理", icon: "🧠" },
  ziliao: { name: "资料分析", icon: "📊" },
  changshi: { name: "常识判断", icon: "💡" }
};

// 考试类型
export const examTypes = {
  national: "国考",
  provincial: "省考"
};
