# Tarot Studio P0 验收

## 日常使用路径

1. 打开书房，从右上角的窗景菜单切换森林、海边、山湖和雨天。按月亮或太阳切换主题。
2. 点击桌面牌组进入每日单张抽牌。输入问题，洗牌，在78张牌背中点选，翻开后写下独立观察，再查看参考。
3. 点击「保存为今日晨间卡牌」，在日记本补写关注点和事前想法。
4. 晚上打开同一页，补写事实、情绪、照片和解读不吻合的地方。事前想法的编辑版本可以回顾。
5. 在「日记历史」切换时间轴、日历或表格，按日期、牌名、关键词、情绪和契合程度查找。可导出单日文本、筛选后的 CSV 或完整备份。

## 测试

| 命令 | 覆盖范围 |
| --- | --- |
| `npm test` | 牌库、课程、训练、洗牌去重、复习排期、备份校验、日记结构、声音设置 |
| `npm run build` | TypeScript 检查和 Vite 生产构建 |
| `npm run test:browser` | 学习功能、学院返回路径、唯一的书房主菜单、常显标签、窗景切换、转场与晨间记录。另验证 78 张牌同屏与点选、手机滑动选牌，以及五段录音的加载、混音和跨页面播放。 |
| `STUDIO_BROWSER_URL` 指向开发地址后运行 `node --experimental-strip-types tests/daily.test.ts` | 实际 IndexedDB、同日晨间保护、并发写入、旧备份导入前的草稿保护、照片、历史和完整恢复 |
| `node --experimental-strip-types tests/studio-settings.test.ts --browser` | 实际 Web Audio 渲染、音量、暂停和音频清理 |

整站验收使用生产构建和独立 Chrome 配置，IndexedDB 单独在开发服务测试。生产构建提示教学内容的 JavaScript 包体超过 Vite 默认分包提醒阈值。验证记录为 [书房](studio-verification.json) 与 [学院](browser-verification.json)。方桌版可查看 [电脑日光书房](studio-square-desktop.png) 和 [手机竖屏实测](studio-square-mobile.png)。另有 [桌面牌扇](studio-fan-desktop.png) 和 [早晚日记](studio-polish-diary.png)。

## 数据与后续范围

原有课程、课节 ID、78 张牌、笔记、收藏、测验、练习历史和抽牌草稿仍使用 `tarot-academy:v1`。新增日记和照片单独写入 `tarot-studio-diary` IndexedDB。完整 JSON 可在设备间迁移。遇到两个标签页修改同一天的情况，日记保留未保存草稿供导出和重新加载，并提示冲突。

P0 已接入现有课程和牌库。下一阶段可加入同张牌换牌位的并排练习和相似牌对照。象征与提问入口现在提供本地引导，AI 导师和对话式日记属于后续阶段。
