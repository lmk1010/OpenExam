# OpenExam 导入包格式（schemaVersion 1）

用户后期自己导题，用这一份。App 认 JSON / CSV / ZIP。字段不够的会丢，不会猜机构私有格式。

## 包结构

```text
your-pack.zip
  paper.json          必填，见下
  images/             可选
    foo.png
```

也可以只丢一个 `paper.json`。题干里写 `<img src="foo.png">`，和 zip 里文件名对上即可。

## paper.json

```json
{
  "schemaVersion": 1,
  "paper": {
    "id": "paper_oe_ah_gwy_cs_001",
    "title": "安徽公务员 计算机 原创模考 001",
    "examKind": "gongwuyuan",
    "examLevel": "provincial",
    "region": "anhui",
    "subject": "computer",
    "year": 2026,
    "durationMin": 120,
    "source": "original"
  },
  "questions": []
}
```

### paper 字段

| 字段 | 必填 | 取值 |
|---|---|---|
| id | 是 | `paper_oe_*` 自制；用户自建可用任意不撞车的 id |
| title | 是 | 列表显示名 |
| examKind | 是 | `gongwuyuan` 公务员 / `shiyedanwei` 事业单位 |
| examLevel | 是 | `national` 国考/国家统一 / `provincial` 省考/省统考 |
| region | 省考必填 | `anhui` 等，国考可 `national` |
| subject | 是 | `xingce` 行测 / `shenlun` 申论 / `computer` 计算机 / `jobtest` 职测 |
| year | 建议 | 数字 |
| durationMin | 否 | 分钟 |
| source | 是 | `original` 自制 / `imported` 用户导入。不要填 saduck、fenbi |

### question 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| id | 是 | 全局唯一 |
| orderNum | 是 | 卷内题号 |
| content | 是 | 纯文本题干 |
| contentHtml | 否 | 带表、带图时用 |
| options | 是 | `[{ "key": "A", "text": "..." }]`，至少两项 |
| answer | 是 | `A` 或 `AB`（多选按字母排序） |
| category | 是 | 见分类 |
| subCategory | 否 | 更细的考点 |
| analysis | 建议 | 自制解析 |
| difficulty | 否 | 1–5，默认 2 |

行测 category：`yanyu` `shuliang` `panduan` `ziliao` `changshi`

计算机 category：`cs_base` `cs_security` `cs_windows` `cs_office` `cs_prog` `cs_db` `cs_net` `cs_se`

## CSV 最低集

表头：`content,A,B,C,D,answer,category,analysis`

适合用户从表格导出。没有试卷元数据时，App 记为「用户导入」。

## 边界

本格式是容器。导进来的内容权利仍归内容来源方。用户导入自己有权的材料，与 OpenExam 发行无关。
