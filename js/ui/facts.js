/**
 * 「事实」面板：四柱、五行、大运、流年、时柱候选、附注。
 * 只呈现排盘结果，不解释。
 */
import { WX_LIST, WX_CLASS, GAN_WX, ZHI_WX, fmt, currentDayun } from '../chart.js';
import { el, clear, $ } from '../dom.js';

function wxChar(ch, wx) {
  return el('span', { class: WX_CLASS[wx], text: ch });
}

function section(no, title, hint, children) {
  return el('section', { class: 'section' }, [
    el('div', { class: 'sec-head' }, [
      el('span', { class: 'sec-no', text: no }),
      el('h2', { text: title }),
      hint ? el('span', { class: 'sec-hint', text: hint }) : null
    ]),
    children
  ]);
}

function metaRow(label, value) {
  return el('div', {}, [el('dt', { text: label }), el('dd', {}, value)]);
}

/* ------------------------------ 四柱 ------------------------------ */

function pillarCard(p) {
  const isDay = p.label === '日';
  return el('article', { class: 'pillar-card' + (isDay ? ' is-day' : '') }, [
    el('div', { class: 'pc-head' }, [
      el('span', { class: 'pc-label', text: p.label + '柱' }),
      el('span', { class: 'pc-ss', text: p.ganSS })
    ]),
    el('div', { class: 'pc-chars' }, [
      wxChar(p.gan, GAN_WX[p.gan]),
      wxChar(p.zhi, ZHI_WX[p.zhi])
    ]),
    el('dl', { class: 'pc-meta' }, [
      metaRow('藏干', p.hide.map((g) => wxChar(g, GAN_WX[g]))),
      metaRow('支神', p.zhiSS.join(' ')),
      metaRow('纳音', p.nayin)
    ])
  ]);
}

/* ------------------------------ 五行 ------------------------------ */

function wuxing(f) {
  const max = Math.max(...WX_LIST.map((k) => f.scores[k])) || 1;
  const rows = WX_LIST.map((k) =>
    el('div', { class: 'wx-row ' + WX_CLASS[k] }, [
      el('span', { class: 'wx-name', text: k }),
      el('span', { class: 'wx-track' }, [
        el('span', { class: 'wx-fill', style: { width: Math.round((f.scores[k] / max) * 100) + '%' } })
      ]),
      el('span', { class: 'wx-val', text: fmt(f.scores[k]) })
    ])
  );

  const pct = (f.strength.ratio * 100).toFixed(1);

  return el('div', { class: 'wx-card' }, [
    ...rows,
    el('div', { class: 'strength' }, [
      el('span', { class: 'sv', text: f.strength.verdict }),
      el('div', { class: 'sbody' }, [
        el('div', { class: 'sbar' }, [
          el('i', { style: { width: pct + '%' } })
        ]),
        el('div', { class: 'smeta' }, [
          el('span', { text: '同类 ' + fmt(f.strength.same) + ' · 异类 ' + fmt(f.strength.other) }),
          el('span', { text: pct + '%' })
        ])
      ])
    ])
  ]);
}

/* ------------------------------ 大运 / 流年 ------------------------------ */

function dayun(f) {
  const now = currentDayun(f);
  const cards = f.dayun.map((d) => {
    const isNow = now && d.ganzhi === now.ganzhi && d.start_year === now.start_year;
    return el('div', {
      class: 'dy' + (isNow ? ' is-now' : ''),
      role: 'listitem'
    }, [
      el('b', { text: d.ganzhi }),
      el('span', { text: d.start_year + '–' + (d.start_year + 9) }),
      el('em', { text: d.start_age + '–' + d.end_age + ' 岁' })
    ]);
  });

  return el('div', { class: 'dy-grid', role: 'list', 'aria-label': '大运' }, cards);
}

function liunian(f, years) {
  const cards = years.map((y) => {
    const cls = [
      'ln',
      y.verdict === '吉' ? 'is-good' : '',
      y.verdict === '凶' ? 'is-bad' : '',
      y.year < f.liunian.year ? 'is-past' : '',
      y.year === f.liunian.year ? 'is-now' : ''
    ].filter(Boolean).join(' ');

    return el('div', { class: cls, role: 'listitem', title: y.year + ' ' + y.ganzhi + ' · ' + y.ss + ' · ' + y.verdict }, [
      el('span', { class: 'ly', text: String(y.year) }),
      el('span', { class: 'lg', text: y.ganzhi }),
      el('span', { class: 'ls', text: y.ss + ' · ' + y.verdict })
    ]);
  });

  return el('div', { class: 'ln-grid', role: 'list', 'aria-label': '流年' }, cards);
}

/* ------------------------------ 时柱 ------------------------------ */

function hourChips(alts) {
  if (!alts || alts.length < 2) return [];
  return [el('div', { class: 'hours' }, alts.map((a) => {
    const p = a.pillar;
    return el('span', { class: 'hour-chip' + (a.current ? ' is-now' : '') }, [
      wxChar(p.gan, GAN_WX[p.gan]),
      wxChar(p.zhi, ZHI_WX[p.zhi]),
      el('small', { text: a.current ? '当前' : '相邻' })
    ]);
  }))];
}

function hoursCard(f, alts) {
  const current = f.pillars[3].gan + f.pillars[3].zhi;

  if (alts && alts.length >= 2) {
    const others = alts.filter((a) => !a.current)
      .map((a) => a.pillar.gan + a.pillar.zhi).join(' / ');
    return el('div', { class: 'note-card' }, [
      el('strong', { text: '时柱可能不止一个' }),
      '当前时柱 ' + current + '；若出生时间落在相邻时辰，可能是 ' + (others || '—') +
      '。日主、年月日三柱、大运、流年不受影响，只有时柱十神会变。',
      ...hourChips(alts)
    ]);
  }

  return el('div', { class: 'note-card' }, [
    el('strong', { text: '时柱按 ' + f.timeStr + ' 定' }),
    '现在是 ' + current + '。若出生时间记不准，回输入页打开「时间记不准」，这里会列出相邻时辰的时柱，' +
    '以及哪些结论会跟着变。'
  ]);
}

/* ------------------------------ 组装 ------------------------------ */

export function renderFacts(f, alts, ctx) {
  const root = $('#panel-facts');
  clear(root);

  const years = ctx.years;
  const city = ctx.cityName;

  root.appendChild(section('01', '四柱', '年 · 月 · 日 · 时',
    el('div', { class: 'pillar-grid' }, f.pillars.map(pillarCard))));

  root.appendChild(section('02', '五行', '按藏干加权', wuxing(f)));

  root.appendChild(section('03', '大运', '起运 ' + f.yunStart, dayun(f)));

  root.appendChild(section('04', '流年', years[0].year + '–' + years[years.length - 1].year + ' · 当前 ' + f.liunian.year, liunian(f, years)));

  const hourSection = section('05', '时柱候选', '视出生时间而定', hoursCard(f, alts));
  root.appendChild(hourSection);

  const peach = f.peach.spots.join('、') +
    (f.peach.hits.length ? '；命带 ' + f.peach.hits.join('、') : '；四柱未踩') +
    (f.peach.yearHit ? '；今年流年踩桃花' : '');

  const offset = f.offset >= 0 ? '+' + f.offset : '−' + Math.abs(f.offset);

  root.appendChild(section('06', '附注', '可复查的计算项', el('dl', { class: 'meta' }, [
    metaRow('公历', f.solarText + '（真太阳时）'),
    metaRow('农历', f.lunarText),
    metaRow('经度', city + ' · ' + f.lon + '°E · 修正 ' + offset + ' 分'),
    metaRow('交节', f.prevJieqi),
    metaRow('起运', f.yunStart),
    metaRow('流年', f.liunian.year + ' ' + f.liunian.ganzhi),
    metaRow('桃花', peach)
  ])));
}
