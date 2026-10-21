# DESIGN.md

> 一座安静的纸面档案馆：暖白纸感、墨色正文、靛蓝印章点缀，时间线由近及远。

## 1. Visual Theme & Atmosphere

**Style**: 暖白编辑部 / 档案册（Editorial Archive）
**Keywords**: 纸感、墨色、印章蓝、时间线、秩序、克制、呼吸感、归档
**Tone**: 安静而有分量的个人档案库 — NOT 促销官网 / 数据驾驶舱 / 科技演示页
**Feel**: 像推开档案室的门：米白墙、整齐的灰色文件盒，唯一一枚靛蓝印章戳在时间线最新的一格上。

**Interaction Tier**: L2 流畅交互
**Dependencies**: 无外部依赖 — 原生 CSS + IntersectionObserver + rAF（零框架、零 CDN）

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg: #f5f2ea;                          /* 暖纸白 · 页面背景 */
  --surface: #fdfbf5;                     /* 卡片面 */
  --surface-alt: #efece1;                 /* 图标底、交替区 */
  --surface-hover: #ffffff;               /* 卡片 hover 面 */

  /* Borders */
  --border: #e3ded0;                      /* 默认边框（档案盒灰） */
  --border-hover: #b9b2a0;                /* hover 边框 */

  /* Text */
  --text: #232019;                        /* 墨色 · 标题/正文 */
  --text-secondary: #6f6a5c;              /* 副标题、说明 */
  --text-tertiary: #a39d8d;               /* 日期、脚注 */

  /* Accent（全页唯一强调色：档案印章靛蓝） */
  --accent: #3d5bd5;
  --accent-hover: #3048b8;

  /* RGB variants for rgba() */
  --bg-rgb: 245,242,234;
  --text-rgb: 35,32,25;
  --accent-rgb: 61,91,213;

  /* Semantic（为未来标签预留，当前页不使用） */
  --success: #2e8b57;    --success-rgb: 46,139,87;
  --warning: #c98a1b;    --warning-rgb: 201,138,27;
  --error: #b3392f;      --error-rgb: 179,57,47;
}
```

**Color Rules:**
- 页面与组件中禁止硬编码 hex，一律 `var(--x)` 引用
- `rgba()` 一律使用 `<color>-rgb` 三元组 + 透明度，如 `rgba(var(--text-rgb), .07)`
- 全页仅一个强调色（accent 靛蓝），只出现在：eyebrow、时间线圆点、H2 下划线、日期 hover、箭头 hover、聚光灯
- 语义色（success/warning/error）为预留，当前页面不使用

## 3. Typography Rules

**Font Stack:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&display=swap');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1 | Inter / Noto Sans SC | clamp(2.75rem, 8vw, 4.25rem) | 700 | 1.12 | 0.02em |
| Section H2 | Inter / Noto Sans SC | 1.375rem | 600 | 1.4 | 0.04em |
| Card Title | Inter / Noto Sans SC | 1.0625rem | 500 | 1.7 | 0.02em |
| Subtitle / Body | Inter / Noto Sans SC | 1.0625rem | 400 | 1.75 | 0.02em |
| Meta / Date | Inter / Noto Sans SC | 0.8125rem | 400 | 1.5 | 0.04em + tabular-nums |
| Eyebrow | Inter | 0.75rem | 600 | 1.4 | 0.22em + uppercase |

**Font Stack 完整回退：** `"Inter", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif`（中文字族在前，中文绝不回退到纯英文字体）

**Typography Rules:**
- 中文正文行高 ≥ 1.7、字距 0.02em、字号 ≥ 16px
- 日期与数字使用 `font-variant-numeric: tabular-nums`（时间线对齐）
- **NEVER use**: 衬线展示字体、手写体、除 Inter/Noto Sans SC 外的装饰字体、中文斜体

**Text Decoration**（按决策表，风格=极简克制）:
- Hero H1: 无渐变、无投影（克制），入场用 `clip-path` mask reveal
- Section H2: 无渐变、无投影，用 2px accent 下划线生长动画替代
- 正文段落: 无任何装饰

## 4. Component Stylings

### Buttons
本页无按钮组件（归档页无 CTA）。若未来加入，状态规范：
```css
/* default */      /* surface bg + border + accent 文字 */
/* hover */        /* surface-hover + translateY(-1px) */
/* active */       /* scale(.98) */
/* focus-visible *//* outline: 2px solid var(--accent); outline-offset: 2px */
/* disabled */     /* opacity: .45; cursor: not-allowed; 无 hover 位移 */
```

### Cards（核心组件：报告条目）

```css
.card {
  position: relative;
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  text-decoration: none; color: var(--text);
  overflow: hidden; /* 裁切聚光灯 */
  transition: transform .25s ease, box-shadow .25s ease,
              border-color .25s ease, background-color .25s ease;
}
.card::before { /* 聚光灯层 */
  content: ""; position: absolute; inset: 0; opacity: 0;
  background: radial-gradient(200px circle at var(--mx,50%) var(--my,50%),
              rgba(var(--accent-rgb), .08), transparent 65%);
  transition: opacity .3s ease; pointer-events: none;
}
.card:hover { transform: translateY(-2px); background: var(--surface-hover);
  border-color: var(--border-hover); box-shadow: 0 4px 14px rgba(var(--text-rgb), .07); }
.card:hover::before { opacity: 1; }
.card:active { transform: translateY(0) scale(.995); }
.card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.card-icon { flex: none; width: 36px; height: 36px; display: grid; place-items: center;
  border-radius: 8px; background: var(--surface-alt); color: var(--accent); }
.card-title { flex: 1; min-width: 0; font-size: 1.0625rem; font-weight: 500; line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-date { flex: none; font-size: .8125rem; color: var(--text-tertiary);
  font-variant-numeric: tabular-nums; letter-spacing: .04em; transition: color .25s ease; }
.card:hover .card-date { color: var(--accent); }
.card-arrow { flex: none; color: var(--text-tertiary);
  transition: transform .25s ease, color .25s ease; }
.card:hover .card-arrow { transform: translateX(3px); color: var(--accent); }
/* disabled（未来预留：链接不可用时不触发任何交互态） */
.card.is-disabled { opacity: .45; pointer-events: none; }
```

### Navigation
站点有一条分区导航，链到「报告」（`/`）与「日报」（`/digests/`）。当前页用 `aria-current="page"`。导航吸顶，背景用 `--bg` 不透底，不用 `backdrop-filter`。

年月标题仍吸顶，停在导航下方：
```css
.site-nav { position: sticky; top: 0; z-index: 5; height: var(--nav-h); background: var(--bg); }
.group h2 {
  position: sticky; top: var(--nav-h); z-index: 2;
  background: var(--bg);           /* 不透底，滚动时不穿帮 */
  padding: 14px 0 10px; margin: -14px 0 16px;
}
```

### Links
卡片本身即链接（含全部状态，见 Cards）。无独立行内链接。

### Tags / Badges（日期徽章）
即 `.card-date`（见 Cards）：无底色纯文字、tabular-nums，hover 变 accent。

### Timeline（时间线构件）
```css
.timeline { position: relative; padding-top: 8px; padding-bottom: 24px; padding-left: 36px; }
.timeline::before { content: ""; position: absolute; left: 7px; top: 16px; bottom: 16px;
  width: 1px; background: var(--border); }
.group { position: relative; margin-bottom: 56px; }
.group::before { /* 月度圆点 */
  content: ""; position: absolute; left: -36px; top: 10px; width: 15px; height: 15px;
  border-radius: 50%; background: var(--bg); border: 2px solid var(--accent); }
```
> 注：`.timeline` / `.hero` 一律用 padding 长属性覆盖方向，避免 padding 简写覆盖 `.container` 的左右内边距（同优先级规则后者胜）。

## 5. Layout Principles

**Container:**
- Max width: 720px（内容型列表页）
- Padding: 24px（≥600px）/ 20px（<600px）

**Spacing Scale:**
- Hero 内边距: 96px 上 / 56px 下（移动端 72/48）
- Section（年月组）间距: 56px
- 卡片行间距: 10px；卡片内边距: 14px 16px（移动端 12px 14px）

**Grid:**
单列时间线布局，无网格：
```css
.group ul { list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 10px; }
```

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | 无阴影 + 1px `--border` | 卡片默认态（档案纸感） |
| Subtle | `0 4px 14px rgba(var(--text-rgb), .07)` + `translateY(-2px)` | 卡片 hover |
| Focus | `outline: 2px solid var(--accent)` + offset 2px | 键盘导航焦点 |
| Ambient | 420px 径向光团 `rgba(var(--accent-rgb), .10)` | Hero 背景（静态，9s 慢呼吸） |

## 7. Animation & Interaction

**Motion Philosophy**: 克制优雅 — 只用 `opacity` / `transform` / `clip-path` / `color`，入场动画一次后释放
**Tier**: L2 流畅交互
**Dependencies**: 无（CSS + IntersectionObserver + rAF，零第三方）

### 签名动效（L2 六类落点）
| 类别 | 落点 | 实现 |
|------|------|------|
| Text — H1 | Hero 主标题 | `clip-path` mask reveal（一次性，0.1s delay 后 1s） |
| Text — Section H2 | 年月标题 | 滚动 reveal + accent 下划线生长 |
| Text — Body/Label | eyebrow / 副标题 / 日期 | fadeInUp stagger（60ms 步进 ≤480ms） |
| Element | 卡片 | 聚光灯（--mx/--my radial，rAF 节流）+ 浮起 + 箭头位移 |
| Component | 列表卡片 | SpotlightCard 全列表生效 |
| Background | Hero 光团 | 静态 radial 光团 + 9s opacity/scale 呼吸 |

### Entrance Animation
```css
@keyframes revealMask { to { clip-path: inset(0 0 0 0); } }
h1 { clip-path: inset(0 0 100% 0);
  animation: revealMask 1s cubic-bezier(.16,1,.3,1) .1s forwards; }

.reveal { opacity: 0; transform: translateY(24px);
  transition: opacity .7s cubic-bezier(.16,1,.3,1),
              transform .7s cubic-bezier(.16,1,.3,1); }
.reveal.in-view { opacity: 1; transform: none; }
```

### Scroll Behavior
```js
const obs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    if (e.target.hasAttribute('data-stagger')) {
      Array.from(e.target.children).forEach((c, i) => {
        c.style.transitionDelay = Math.min(i * 60, 480) + 'ms';
      });
    }
    e.target.classList.add('in-view');
    obs.unobserve(e.target);
  });
}, { threshold: 0.12 });
```
- 年月 H2 `position: sticky; top: 0`（滚动时标题吸顶）
- H2 下划线：`.group.in-view h2::after { width: 100% }`（0.7s 生长）

### Hover & Focus States
见第 4 章 Cards 完整 CSS；`data-stagger` 容器内卡片自带交错延迟。

### Special Effects
- count-up：归档总数 900ms easeOutCubic（rAF）
- 聚光灯：`document` 委托 `pointermove` + rAF 节流，仅 `(hover: hover)` 设备启用
- 光标跟随全部通过 CSS 变量 `--mx/--my` 写入，单次 repaint

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
}
```
JS 侧：`matchMedia('(prefers-reduced-motion: reduce)')` 命中时跳过 count-up / 聚光灯 / hover 监听，仅保留 IntersectionObserver 类标记（CSS 直接呈现终态）。

## 8. Do's and Don'ts

### Do
- 所有颜色通过 CSS 变量引用（含 `-rgb` 辅助值用于 rgba），页面零硬编码 hex
- 中文正文行高 ≥ 1.7、字距 ≥ 0.02em、字号 ≥ 16px，中文字体族（Noto Sans SC 等）必须在前
- 动效只用 opacity / transform / color / clip-path，入场完成后释放监听
- 每个可交互元素具备 hover + `:focus-visible` 态
- 触摸目标 ≥ 44px（卡片行高 ~56px）
- 所有动效提供 `prefers-reduced-motion` 降级
- 卡片显示的日期与排序依据同源（同一 dateLabel），可读且可校验
- 新增报告自动按日期归组，无需修改代码
- 新增日报只放入 `digests/YYYY-MM-DD.html`，构建时自动进入「日报」列表

### Don't
- ❌ 硬编码 hex 颜色（一律走 CSS 变量）
- ❌ 在移动元素上使用 `filter: blur()` / `backdrop-filter: blur()`
- ❌ 使用 Emoji 图标（编辑部调性，一律内联 SVG）
- ❌ 标题使用渐变文字或投影（克制风格）
- ❌ 无节流的 pointermove 监听（本页仅 1 处委托 + rAF 节流，且限制 `hover: hover` 设备）
- ❌ 引入第三方依赖（GSAP/Lenis/框架）——本页零外部运行时依赖
- ❌ 手动编辑根目录 index.html 或 digests/index.html（由 generate-index.js 生成，改生成器而非产物）
- ❌ 中文字体缺失让系统回退（font-family 必须链接中文字族）
- ❌ 移动端 ≤600px 出现横向溢出（长标题两行截断 + 容器收缩）

## 9. Responsive Behavior

**Breakpoints:**
| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | ≥ 800px | 720px 容器，卡片行内：图标 + 标题 + 日期 + 箭头 |
| Tablet | 600–799px | 同 Desktop（容器自适应） |
| Mobile | < 600px | 容器 padding 20px；hero 72/48px；时间线左距 30px；卡片 padding 12/14px、图标 32px、日期 12px；标题两行截断；隐藏 Hero 光团 |

**Touch Targets:** 最小 44×44px（卡片实际 ≈56px 高）
**Collapsing Strategy:** 单列时间线天然堆叠，无折叠需求；光团等装饰在移动端直接移除

```css
@media (max-width: 599px) {
  .container { padding: 0 20px; }
  .hero { padding-top: 72px; padding-bottom: 48px; }
  .hero::before { display: none; }  /* 光团降级为纯纸面 */
  .timeline { padding-left: 30px; }
  .group::before { left: -30px; }
  .card { padding: 12px 14px; gap: 10px; }
  .card-icon { width: 32px; height: 32px; }
  .card-date { font-size: .75rem; }
}
```