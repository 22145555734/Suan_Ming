# 命盘 · 解剖台

同一份出生信息，一份能逐项复查的命盘，和它被讲成的三种故事：**原句 / 美话 / 焦虑**。

手机优先的静态站，无构建步骤，原生 ES modules；排盘由 `vendor/lunar.js` 做节气与干支换算，界面与文案全部自己写。

线上：<http://47.106.200.121/>

## 它做什么

1. **输入**：公历生日（年直接键入、月/日点按的底部面板）、出生时间（可标记「记不准」，结果里列出相邻时辰的时柱）、性别、出生省份 → 城市（393 个市，含港澳台与「不详」）。
2. **排盘**：四柱、藏干、支神、纳音、五行加权、日主强弱、大运、30 年流年、桃花、真太阳时修正（按城市经度）。
3. **三种讲法**：同一批事实，分别用命书原句、往舒服里讲、往害怕里讲写出来，每条都标注依据（哪一柱、哪个十神、哪个流年）。

## 结构

```
index.html            三屏骨架（封面 / 输入 / 结果）
css/tokens.css        设计变量：纸墨印配色、双主题、字体与间距
css/base.css          基础排版与桌面「卷宗卡片」
css/app.css           三屏、四面板、日期面板、城市选择
js/chart.js           排盘（与 archive/v3/app.js 逐行等价）
js/cities.js          省 → 市 → 经度（ES module）
js/copy.js            文案池与界面文案
js/narrative.js       原句 / 美话 / 焦虑的生成
js/dom.js             极小的 DOM helper
js/ui/facts.js        事实面板
js/ui/stories.js      三种讲法面板与页脚
js/ui/result.js       英雄四柱、粘性 Tab
js/main.js            状态、表单、本地记录、启动
vendor/lunar.js       lunar-javascript 1.7.8（UMD）
test/equivalence.mjs  与旧版逐字段对照
archive/v3/           旧版页面与脚本，仅供对照测试
```

## 本地预览

```bash
python -m http.server 8123 --bind 127.0.0.1
# 打开 http://127.0.0.1:8123/
```

ES modules 需要 HTTP，不能直接 `file://` 打开。`http://localhost` / `127.0.0.1` 下不注册 Service Worker，方便改完刷新即见。

## 测试

```bash
node test/equivalence.mjs   # ✓ 5 组输入，全部字段与旧版一致
```

计算字段、30 年流年、时柱候选与三套文案都与 `archive/v3/app.js` 对照；只重做界面，不改排盘。

## 部署

纯静态文件，`/srv/suanming` 由 nginx 容器直接提供。改动后上传对应文件即可；改了前端资源记得把 `sw.js` 的 `VERSION` 加一，手机端才会换新缓存。

## 边界

- 话术是模板生成的样本，不是预测；页面里也这么写。
- 未在真机（iOS Safari / Android Chrome）上逐一实测；Android 若无宋体回退，标题会落到无衬线。
- 城市经度取该市下辖区县的均值，只用于真太阳时修正，精确到分钟级够用。
