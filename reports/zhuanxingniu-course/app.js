/* ==========================================================================
   《迎转型牛，重在交易》互动课堂 — app.js
   零依赖：IntersectionObserver + 原生 DOM/SVG
   ========================================================================== */
'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- 1. 滚动进度 / 导航态 / 章节高亮 ---------- */
(function initNav() {
  const nav = $('#nav');
  const bar = $('#scrollProgress');
  const pct = $('#navPct');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = `scaleX(${p})`;
      pct.textContent = Math.round(p * 100) + '%';
      nav.classList.toggle('scrolled', window.scrollY > 50);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = $$('#navLinks a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.getAttribute('data-spy');
      links.forEach(a => a.classList.toggle('active', a.getAttribute('data-spy-link') === id));
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  $$('[data-spy]').forEach(s => spy.observe(s));
})();

/* ---------- 2. Reveal 入场（含同级 stagger） ---------- */
(function initReveal() {
  // 同父元素下的 .reveal 依次延迟，形成 stagger
  const groups = new Map();
  $$('.reveal').forEach(el => {
    const p = el.parentElement;
    if (!groups.has(p)) groups.set(p, 0);
    const i = groups.get(p);
    el.style.transitionDelay = Math.min(i * 0.08, 0.5) + 's';
    groups.set(p, i + 1);
  });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$('.reveal, .blur-reveal, .quote-line').forEach(el => obs.observe(el));
})();

/* ---------- 3. Hero 三问卡聚光灯（仅精密指针设备） ---------- */
(function initSpotlight() {
  if (!window.matchMedia('(hover: hover)').matches || REDUCED) return;
  let raf = null;
  $('#qCards').addEventListener('pointermove', (ev) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const card = ev.target.closest('.q-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
      card.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  });
})();

/* ---------- 4. SVG 描边生长动画 ---------- */
function watchDrawLines(root) {
  const lines = $$('.draw-line', root).filter(el => !el.getAttribute('stroke-dasharray'));
  lines.forEach(el => {
    const len = el.getTotalLength();
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = REDUCED ? 0 : len;
  });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.strokeDashoffset = 0; obs.unobserve(e.target); } });
  }, { threshold: 0.4 });
  lines.forEach(el => obs.observe(el));
}
watchDrawLines(document);

/* ---------- 5. W1 时间滑块：核心矛盾之变 ---------- */
(function initEra() {
  const DATA = [
    {
      v1: '缺生产 · 缺产能', d1: '入世后中国成为世界工厂，全世界的需求都等中国满足——第一反应是融资、上产线、扩产能。',
      v2: '融资市场 · 服务生产', d2: '大量 IPO、大量募资，目的只有一个：扩产，满足全球需求。',
      v3: '一天打新十几个', d3: '可以连打一星期。资本市场开足马力为生产扩张服务。',
      knob: '12%'
    },
    {
      v1: '转折点：贸易战', d1: '2018 年起关税与壁垒出现，中国制造不再能畅行全球——商品出不去。',
      v2: '定位开始重估', d2: '产能不再稀缺，宏观矛盾从生产端悄悄滑向需求端。',
      v3: '扩产逻辑失效', d3: '继续为扩产融资，只会加重过剩。政策开始围绕新矛盾改写。',
      knob: '50%'
    },
    {
      v1: '缺需求 · 内需不足', d1: '产业过剩、消费疲弱——上个月上海社零单月 -7%，消费压力非常大。',
      v2: '内需市场 · 促消费 · 股东回报', d2: '提振消费最直接的是增收——于是有了「上市公司必须分红」。',
      v3: 'IPO 收紧 · 强制分红', d3: '能上市的基本是硬科技；以前从没有过的分红要求出现了。',
      knob: '88%'
    }
  ];
  const range = $('#eraRange');
  const cells = [$('#eraV1'), $('#eraD1'), $('#eraV2'), $('#eraD2'), $('#eraV3'), $('#eraD3')];
  const knob = $('#eraKnob');
  const labels = $$('.era-labels span');
  function render(i) {
    const d = DATA[i];
    $$('.era-cell').forEach(c => c.classList.add('swap'));
    setTimeout(() => {
      $('#eraV1').textContent = d.v1; $('#eraD1').textContent = d.d1;
      $('#eraV2').textContent = d.v2; $('#eraD2').textContent = d.d2;
      $('#eraV3').textContent = d.v3; $('#eraD3').textContent = d.d3;
      $$('.era-cell').forEach(c => c.classList.remove('swap'));
    }, REDUCED ? 0 : 180);
    knob.style.left = d.knob;
    labels.forEach((l, j) => l.classList.toggle('on', j === i));
    range.style.setProperty('--fill', (i / 2 * 100) + '%');
  }
  range.addEventListener('input', () => render(+range.value));
  render(2);
})();

/* ---------- 6. W2 信贷模拟器 ---------- */
(function initCredit() {
  const slider = $('#dpSlider');
  const PRICE = 300;
  function render() {
    const p = +slider.value;
    const self = PRICE * p / 100;
    const bank = PRICE - self;
    $('#dpPct').textContent = p + '%';
    $('#dpSelf').textContent = self + ' 万';
    $('#dpBank').textContent = bank + ' 万';
    $('#dpNew').textContent = bank + ' 万';
    $('#barSelf').style.width = (self / PRICE * 100) + '%';
    $('#barBank').style.width = (bank / PRICE * 100) + '%';
    $('#barNew').style.width = (bank / PRICE * 100) + '%';
    slider.style.setProperty('--fill', ((p - 10) / 40 * 100) + '%');
  }
  slider.addEventListener('input', render);
  render();

  // 蒸发 vs A股 对比条：进入视口时生长
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      $('#fillEvap').style.width = '87%';   // 100 / 115
      $('#fillAstock').style.width = '100%';
      obs.disconnect();
    });
  }, { threshold: 0.5 });
  obs.observe($('#fillAstock').closest('.cmp-bars'));
})();

/* ---------- 7. W3 政策措辞时间轴 ---------- */
(function initTimeline() {
  const DATA = [
    {
      quote: '「努力提振资本市场」',
      plain: '924 行情的起点：央行资金变相入市、各种长期资本入市——这是市场的拐点。7 天涨了 1000 点后，政策随即给楼市和股市降温。',
      pos: '位置判断：<b>拐点</b>。积贫积弱的市场被一把拉起。'
    },
    {
      quote: '「持续稳定和活跃资本市场」',
      plain: '中美对等关税、市场大跌之后给出。「活跃」好理解——成交量从 1 万亿放到 2 万亿；「持续稳定」= 横盘震荡。',
      pos: '位置判断：<b>不许跌</b>。告诉大家：这个市场不要跌了。'
    },
    {
      quote: '「巩固资本市场回稳成果」',
      plain: '品一品「巩固」：趋势完全确立就不需要巩固了。4 月告诉你稳定，7 月说巩固——',
      pos: '位置判断：<b>刚从底下爬起来</b>，还在山脚下。'
    },
    {
      quote: '（只字不提）',
      plain: '10 月、12 月再也没提资本市场。为什么？都上 4000 点了，再给政策不就火上浇油了吗。',
      pos: '位置判断：<b>已恢复正常</b>。不提，恰恰说明不需要扶了。'
    },
    {
      quote: '「稳定和增强资本市场信心」',
      plain: '从「稳定」到「增强」。如果真的没有高点了，还讲增强就说不通；如果真过热了，措辞会是「防范风险」。',
      pos: '位置判断：<b>行至中途</b>——后续应该还有高点。'
    }
  ];
  const nodes = $$('.tl-node');
  const detail = $('#tlDetail');
  function render(i) {
    nodes.forEach((n, j) => n.classList.toggle('on', j === i));
    detail.classList.add('swap');
    setTimeout(() => {
      $('#tlQuote').textContent = DATA[i].quote;
      $('#tlPlain').textContent = DATA[i].plain;
      $('#tlPos').innerHTML = DATA[i].pos;
      detail.classList.remove('swap');
    }, REDUCED ? 0 : 160);
  }
  nodes.forEach(n => n.addEventListener('click', () => render(+n.dataset.idx)));
  render(0);
})();

/* ---------- 8. W4 三因子仪表盘 ---------- */
(function initFactors() {
  const state = { profit: 0, rate: 0, risk: 0 }; // 1=up, 0=flat, -1=down
  const NAMES = { profit: '盈利', rate: '利率', risk: '风险' };
  // 对股价的贡献：盈利↑利好；利率↑利空（分母）；风险↑利空
  const IMPACT = { profit: [1, 0, -1], rate: [-1, 0, 1], risk: [-1, 0, 1] };

  function impactOf(f) { return IMPACT[f][state[f] + 1]; }

  function render() {
    let score = 0;
    const why = [];
    $$('.factor-row').forEach(row => {
      const f = row.dataset.factor;
      const imp = impactOf(f);
      score += imp;
      const st = $('.fstate', row);
      st.classList.remove('up', 'down');
      if (state[f] === 0) { st.textContent = '中性'; }
      else {
        const good = imp > 0;
        st.textContent = (state[f] === 1 ? '↑ ' : '↓ ') + (good ? '利好' : '利空');
        st.classList.add(good ? 'up' : 'down');
        why.push(`${NAMES[f]}${state[f] === 1 ? '上调' : '下调'} → ${good ? '推动上涨' : '构成压力'}`);
      }
    });

    const box = $('#factorResult');
    box.classList.remove('bull', 'bear');
    if (score > 0) {
      box.classList.add('bull');
      $('#frArrow').textContent = '↗';
      $('#frVerdict').textContent = '推演：偏涨（利好 ' + score + ' 项）';
    } else if (score < 0) {
      box.classList.add('bear');
      $('#frArrow').textContent = '↘';
      $('#frVerdict').textContent = '推演：偏跌（利空 ' + (-score) + ' 项）';
    } else {
      $('#frArrow').textContent = '→';
      $('#frVerdict').textContent = '三个因子互相抵消或都没变，股价没有方向性理由';
    }
    $('#frWhy').textContent = why.length ? why.join('；') + '。' : '所有因子都在「没变」档。';
  }

  $$('.factor-row').forEach(row => {
    const f = row.dataset.factor;
    $$('.seg button', row).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.seg button', row).forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        state[f] = btn.dataset.v === 'up' ? 1 : btn.dataset.v === 'down' ? -1 : 0;
        $('#frReveal').style.display = 'none';
        render();
      });
    });
  });

  $('#factorPreset').addEventListener('click', () => {
    // 真实读数：盈利没变 / 利率没变（美债只涨零点几个点）/ 风险没变
    state.profit = 0; state.rate = 0; state.risk = 0;
    $$('.factor-row').forEach(row => {
      $$('.seg button', row).forEach(b => b.classList.toggle('on', b.dataset.v === 'flat'));
    });
    render();
    $('#frReveal').style.display = 'block';
  });
  $('#factorReset').addEventListener('click', () => {
    state.profit = 0; state.rate = 0; state.risk = 0;
    $$('.factor-row').forEach(row => {
      $$('.seg button', row).forEach(b => b.classList.toggle('on', b.dataset.v === 'flat'));
    });
    $('#frReveal').style.display = 'none';
    render();
  });
  render();
})();

/* ---------- 9. W5 仓位天平 ---------- */
(function initPosition() {
  const range = $('#posRange');
  function forceWord(v) { return v >= 60 ? '充足' : v >= 30 ? '一般' : '枯竭'; }
  function render() {
    const v = +range.value;
    $('#posBig').textContent = v + '%';
    $('#posStk').style.width = v + '%';
    $('#posCsh').style.width = (100 - v) + '%';
    $('#posStk').textContent = v >= 12 ? `股票 ${v}%` : '';
    $('#posCsh').textContent = (100 - v) >= 12 ? `现金 ${100 - v}%` : '';
    $('#posBuy').textContent = `${forceWord(100 - v)}（现金 ${100 - v}%）`;
    $('#posSell').textContent = `${forceWord(v)}（股票 ${v}%）`;
    range.style.setProperty('--fill', v + '%');

    const box = $('#posVerdict');
    box.classList.remove('zone-crash', 'zone-boom');
    if (v <= 15) {
      box.classList.add('zone-boom');
      box.innerHTML = '<span class="zv">极端空仓区 → 只能涨，而且暴涨</span>没人手里有股票，就没有空头、没有卖盘——挂涨停价都买不到，一笔单子就能打到涨停。<strong>924 就是这样</strong>：两融担保比例 ~120%（爆仓线边缘）、私募仓位 40%+、公募禁止净卖出，利好一来，七天一千点。';
    } else if (v >= 85) {
      box.classList.add('zone-crash');
      box.innerHTML = '<span class="zv">极端满仓区 → 一旦有人必须卖，就是暴跌</span>股票要靠钱推，满仓意味着没有钱了、没人接。<strong>2015 就是这样</strong>：一清配资，加杠杆的人不得不砸盘，市场没有缓冲，一路崩下来。';
    } else {
      box.innerHTML = '<span class="zv">常态博弈区</span>多空双方都有弹药，价格由博弈决定。把滑块拉到两端试试——看看 924 和 2015 的土壤长什么样。';
    }
  }
  range.addEventListener('input', render);
  render();
})();

/* ---------- 10. W6 十人会场 + 拥挤度 ---------- */
(function initCrowd() {
  let you = false;
  $('#crowdToggle').addEventListener('click', () => {
    you = !you;
    $('#youSeat').classList.toggle('you', you);
    $('#crowdInsight').style.display = you ? 'block' : 'none';
    $('#crowdToggle').textContent = you ? '退出视角' : '切换视角：你是那 7 个人之一';
  });
  const fills = $$('.crowd-bar .fill');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      fills.forEach(f => { f.style.width = f.dataset.w + '%'; });
      obs.disconnect();
    });
  }, { threshold: 0.5 });
  if (fills.length) obs.observe(fills[0].closest('.crowd-bars'));
})();

/* ---------- 11. W7 反身性螺旋 ---------- */
(function initSpiral() {
  const PRICES = [100, 97.5, 93, 87, 81, 74, 69];
  const SEQ = [0, 1, 2, 3, 2, 3]; // 节点点亮顺序：③④循环
  const X0 = 40, DX = 56;
  const y = p => 195 - (p - 60) / 45 * 170;
  const line = $('#spiralLine');
  const nodes = $$('.sp-node');
  const btn = $('#spiralBtn');
  let beat = 0, running = false;

  function reset() {
    beat = 0;
    line.setAttribute('points', `${X0},${y(PRICES[0])}`);
    nodes.forEach(n => n.classList.remove('lit'));
    btn.textContent = '投放利空：Meta 出租算力';
    btn.disabled = false;
  }
  function step() {
    if (beat >= SEQ.length) {
      running = false;
      btn.textContent = '再看一次';
      btn.disabled = false;
      return;
    }
    nodes[SEQ[beat]].classList.add('lit');
    beat++;
    const pts = PRICES.slice(0, beat + 1).map((p, i) => `${X0 + i * DX},${y(p)}`).join(' ');
    line.setAttribute('points', pts);
    setTimeout(step, REDUCED ? 60 : 750);
  }
  btn.addEventListener('click', () => {
    if (running) return;
    reset();
    running = true;
    btn.disabled = true;
    setTimeout(step, REDUCED ? 60 : 400);
  });
  reset();
})();

/* ---------- 12. W8 箱体交易练习 ---------- */
(function initTrader() {
  const PRICES = [100, 110, 103, 115, 101, 113, 105, 117, 102, 114, 106, 118, 104];
  const LO = 100, HI = 118, PMIN = 96, PMAX = 122;
  const X0 = 36, X1 = 544;
  const xs = i => X0 + (X1 - X0) * i / (PRICES.length - 1);
  const y = p => 232 - (p - PMIN) / (PMAX - PMIN) * 204;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = $('#traderSvg');

  // 静态元素：支撑/压力线 + 标签
  function el(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  svg.appendChild(el('line', { x1: 28, y1: y(LO), x2: 552, y2: y(LO), stroke: 'var(--down)', 'stroke-width': 1.5, 'stroke-dasharray': '7 6' }));
  svg.appendChild(el('line', { x1: 28, y1: y(HI), x2: 552, y2: y(HI), stroke: 'var(--accent)', 'stroke-width': 1.5, 'stroke-dasharray': '7 6' }));
  const tLo = el('text', { x: 552, y: y(LO) + 16, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--down)', 'font-weight': 700 }); tLo.textContent = '支撑位 100'; svg.appendChild(tLo);
  const tHi = el('text', { x: 552, y: y(HI) - 8, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--accent)', 'font-weight': 700 }); tHi.textContent = '压力位 118'; svg.appendChild(tHi);
  const line = el('polyline', { fill: 'none', stroke: 'var(--border-strong)', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); svg.appendChild(line);
  const marks = el('g', {}); svg.appendChild(marks);
  const cursor = el('circle', { r: 6, fill: 'var(--gold)', stroke: 'var(--surface)', 'stroke-width': 2.5 }); svg.appendChild(cursor);

  let idx, cash, shares, buyPrice, trades;
  const fmt = n => Math.round(n).toLocaleString('zh-CN');

  function log(msg, cls) {
    const d = document.createElement('div');
    d.className = 'lg' + (cls ? ' ' + cls : '');
    d.innerHTML = msg;
    const box = $('#traderLog');
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }
  function hud() {
    const p = PRICES[idx];
    $('#hudPrice').textContent = p.toFixed(1);
    $('#hudCash').textContent = fmt(cash);
    $('#hudPos').textContent = shares > 0 ? fmt(shares) + ' 股' : '空仓';
    const pnlEl = $('#hudPnl');
    let pnl;
    if (shares > 0) pnl = (p - buyPrice) / buyPrice;
    else pnl = cash / 10000 - 1;
    pnlEl.textContent = (pnl >= 0 ? '+' : '') + (pnl * 100).toFixed(1) + '%';
    pnlEl.classList.toggle('up', pnl > 0);
    pnlEl.classList.toggle('down', pnl < 0);
    const ended = idx >= PRICES.length - 1;
    $('#btnBuy').disabled = shares > 0 || ended;
    $('#btnSell').disabled = shares === 0 || ended;
    $('#btnNext').disabled = ended;
  }
  function draw() {
    const pts = PRICES.slice(0, idx + 1).map((p, i) => `${xs(i)},${y(p)}`).join(' ');
    line.setAttribute('points', pts);
    cursor.setAttribute('cx', xs(idx));
    cursor.setAttribute('cy', y(PRICES[idx]));
  }
  function mark(i, kind) { // kind: 'buy' | 'sell'
    const c = el('circle', {
      cx: xs(i), cy: y(PRICES[i]), r: 8,
      fill: kind === 'buy' ? 'var(--accent)' : 'var(--down)',
      stroke: 'var(--surface)', 'stroke-width': 2.5
    });
    marks.appendChild(c);
    const t = el('text', { x: xs(i), y: y(PRICES[i]) + (kind === 'buy' ? 22 : -14), 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: kind === 'buy' ? 'var(--accent)' : 'var(--down)' });
    t.textContent = kind === 'buy' ? '买' : '卖';
    marks.appendChild(t);
  }

  function finish() {
    const p = PRICES[PRICES.length - 1];
    const total = cash + shares * p;
    const ret = total / 10000 - 1;
    const holdRet = p / PRICES[0] - 1; // 持有不动
    const box = $('#traderSummary');
    let comment;
    if (ret >= 0.15) comment = '节奏大师级——你把箱体的每一段都吃到了。';
    else if (ret > holdRet) comment = '不错，跑赢了「持有不动」。高抛低吸生效了。';
    else if (ret > 0) comment = '小赚，但没跑赢多少——回想一下是不是哪笔追高了。';
    else comment = '被箱体上了一课：追涨杀跌在震荡市里会被两面打脸。点「重来」再试一次。';
    box.innerHTML = `<div class="ts-t">结算：你的收益率 <span class="num ${ret >= 0 ? 'up' : 'down'}">${(ret >= 0 ? '+' : '') + (ret * 100).toFixed(1)}%</span> ｜ 持有不动 <span class="num">+${(holdRet * 100).toFixed(1)}%</span> ｜ 交易 ${trades} 笔</div><div>${comment} 记住口诀：<strong>跌多了买，涨多了卖</strong>；以及唯一要盯的变量——<strong>量能</strong>。</div>`;
    box.classList.add('show');
    log(`行情结束。结算收益率 <b>${(ret * 100).toFixed(1)}%</b>。`);
  }

  $('#btnBuy').addEventListener('click', () => {
    const p = PRICES[idx];
    shares = Math.floor(cash / p * 100) / 100;
    buyPrice = p;
    cash = 0;
    trades++;
    mark(idx, 'buy');
    if (p <= 104) log(`在 <b>${p}</b> 买入 —— 漂亮的低吸，靠近支撑位。`, 'good');
    else if (p >= 113) log(`在 <b>${p}</b> 买入 —— 追高了，这里离压力位很近。`, 'bad');
    else log(`在 <b>${p}</b> 买入。位置中庸，看下一步。`);
    hud();
  });
  $('#btnSell').addEventListener('click', () => {
    const p = PRICES[idx];
    cash = shares * p;
    const gain = (p - buyPrice) / buyPrice * 100;
    shares = 0;
    trades++;
    mark(idx, 'sell');
    if (p >= 113) log(`在 <b>${p}</b> 卖出（${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%）—— 漂亮的高抛，贴近压力位。`, 'good');
    else if (p <= 105) log(`在 <b>${p}</b> 卖出（${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%）—— 杀跌了，支撑位附近不该卖。`, 'bad');
    hud();
  });
  $('#btnNext').addEventListener('click', () => {
    if (idx < PRICES.length - 1) {
      idx++; draw(); hud();
      if (idx >= PRICES.length - 1) finish(); // 走到最后一段：按现价结算（含浮动持仓）
    }
  });
  $('#btnReset').addEventListener('click', init);

  function init() {
    idx = 0; cash = 10000; shares = 0; buyPrice = 0; trades = 0;
    marks.innerHTML = '';
    $('#traderLog').innerHTML = '<div class="lg">行情就绪。口诀：跌多了买，涨多了卖。</div>';
    $('#traderSummary').classList.remove('show');
    draw(); hud();
  }
  init();
})();

/* ---------- 13. W9 风险光谱归类 ---------- */
(function initSpectrum() {
  let picked = null;
  const pool = $('#specPool');
  const zones = { high: $('#zoneHigh'), low: $('#zoneLow') };
  const result = $('#specResult');

  function clearJudge() {
    $$('.spec-card').forEach(c => c.classList.remove('judged-ok', 'judged-bad'));
    Object.values(zones).forEach(z => z.classList.remove('judged-ok', 'judged-bad'));
    result.textContent = '';
  }
  $$('.spec-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('judged-ok')) return;
      if (card.parentElement.classList.contains('z-cards')) {
        pool.appendChild(card); // 已归区的点一下放回池子
        card.classList.remove('picked');
        clearJudge();
        return;
      }
      if (picked) picked.classList.remove('picked');
      picked = picked === card ? null : card;
      card.classList.toggle('picked', picked === card);
      Object.values(zones).forEach(z => z.classList.toggle('armed', !!picked));
    });
  });
  Object.values(zones).forEach(zone => {
    zone.addEventListener('click', () => {
      if (!picked) return;
      $('.z-cards', zone).appendChild(picked);
      picked.classList.remove('picked');
      picked = null;
      Object.values(zones).forEach(z => z.classList.remove('armed'));
      clearJudge();
    });
  });
  $('#specCheck').addEventListener('click', () => {
    clearJudge();
    let ok = 0, total = 0, misplaced = 0;
    $$('.spec-card').forEach(card => {
      const inZone = card.parentElement.classList.contains('z-cards');
      if (!inZone) return;
      total++;
      const zoneKey = card.parentElement.parentElement.id === 'zoneHigh' ? 'high' : 'low';
      const good = zoneKey === card.dataset.zone;
      card.classList.add(good ? 'judged-ok' : 'judged-bad');
      if (good) ok++; else misplaced++;
    });
    const unassigned = 8 - total;
    if (unassigned > 0) { result.textContent = `还有 ${unassigned} 张卡片没归区。`; return; }
    Object.entries(zones).forEach(([k, z]) => {
      const bad = $$('.spec-card.judged-bad', z).length > 0;
      z.classList.add(bad ? 'judged-bad' : 'judged-ok');
    });
    result.textContent = misplaced === 0
      ? '8 / 8 全对！小盘 + 高市盈率 = 高风险；与安全相关 = 低风险。'
      : `${ok} / 8 正确。红框的放错了——想想「300 年回本」那张该在哪。`;
  });
  $('#specReset').addEventListener('click', () => {
    $$('.spec-card').forEach(c => { pool.appendChild(c); c.classList.remove('picked'); });
    picked = null;
    Object.values(zones).forEach(z => z.classList.remove('armed'));
    clearJudge();
  });
})();

/* ---------- 14. W10 半年报筛选器 ---------- */
(function initFilter() {
  const switches = $$('.f-switch');
  const rows = $$('.ind-row:not(.ind-head)');
  const count = $('#filterCount');
  function render() {
    const on = new Set(switches.filter(s => s.classList.contains('on')).map(s => s.dataset.f));
    let hit = 0;
    rows.forEach(row => {
      let pass = true;
      if (on.has('growth') && row.dataset.growth !== '1') pass = false;
      if (on.has('hold') && row.dataset.hold !== 'low') pass = false;
      if (on.has('flat') && row.dataset.flat !== '1') pass = false;
      row.classList.toggle('dim', on.size > 0 && !pass);
      row.classList.toggle('hit', on.size > 0 && pass);
      if (on.size > 0 && pass) hit++;
    });
    if (on.size === 0) count.textContent = '未开启筛选：共 8 个行业。';
    else if (hit === 0) count.textContent = '没有行业同时满足——条件太苛刻了？不，是大部分行业确实不符合。';
    else count.textContent = `开启 ${on.size} 个条件：${hit} 个行业留下。注意那个「本月 +30%」的特殊行业——它满足全部三条。`;
  }
  switches.forEach(sw => sw.addEventListener('click', () => { sw.classList.toggle('on'); render(); }));
  render();
})();

/* ---------- 15. 检查点 Quiz + 进度 + 印章 ---------- */
(function initQuiz() {
  const KEY = 'zxn-progress-v1';
  let passed = [];
  try { passed = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { passed = []; }

  function updateFinal() {
    $('#finalProgress').textContent = `检查点进度：${passed.length} / 5`;
    if (passed.length >= 5) {
      $('#seal').classList.add('show');
      $('#sealHint').textContent = '全部通过。愿你踩准每一次高低切换。';
    }
  }
  function markDone(quiz) {
    quiz.classList.add('done');
    const id = quiz.dataset.quiz;
    $('.stamp-ok', quiz).textContent = '本章检查点通过 ✓';
    $$('.quiz-q', quiz).forEach(q => {
      $$('.quiz-option', q).forEach(o => {
        o.disabled = true;
        if (o.dataset.correct === '1') o.classList.add('correct');
      });
      $('.quiz-explain', q).classList.add('show');
    });
    $('.quiz-count', quiz).textContent = '2 / 2 已答对';
    if (!passed.includes(id)) {
      passed.push(id);
      try { localStorage.setItem(KEY, JSON.stringify(passed)); } catch (e) { /* 私密模式 */ }
    }
    updateFinal();
  }

  $$('.quiz').forEach(quiz => {
    const questions = $$('.quiz-q', quiz);
    let solved = 0;
    if (passed.includes(quiz.dataset.quiz)) { markDone(quiz); return; }
    questions.forEach(q => {
      $$('.quiz-option', q).forEach(opt => {
        opt.addEventListener('click', () => {
          if (q.classList.contains('solved')) return;
          $('.quiz-explain', q).classList.add('show');
          if (opt.dataset.correct === '1') {
            q.classList.add('solved');
            opt.classList.add('correct');
            $$('.quiz-option', q).forEach(o => { o.disabled = true; o.classList.remove('wrong'); });
            solved++;
            $('.quiz-count', quiz).textContent = `${solved} / ${questions.length} 已答对`;
            if (solved === questions.length) markDone(quiz);
          } else {
            opt.classList.add('wrong');
            setTimeout(() => opt.classList.remove('wrong'), 900);
          }
        });
      });
    });
  });
  updateFinal();
})();

/* ---------- 16. 终章自答卡 ---------- */
(function initAnswers() {
  $$('.answer-card .a-mask').forEach(mask => {
    const open = () => mask.parentElement.classList.add('open');
    mask.addEventListener('click', open);
    mask.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
})();
