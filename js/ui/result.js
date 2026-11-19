/**
 * 结果页：英雄四柱 + 粘性 Tab + 四个面板。
 */
import { GAN_WX, ZHI_WX, WX_CLASS, fmt } from '../chart.js';
import { el, clear, $, $$ } from '../dom.js';
import { UI } from '../copy.js';
import { renderFacts } from './facts.js';
import { renderStories, renderColophon } from './stories.js';

let tabButtons = [];
let active = 'facts';
let tabsBound = false;

function wxSpan(ch, wx) {
  return el('span', { class: WX_CLASS[wx], text: ch });
}

function hero(f, ctx) {
  const root = $('#hero');
  clear(root);

  const dateText = f.dateStr.split('-').join('.');
  const off = f.offset >= 0 ? '+' + f.offset : '−' + Math.abs(f.offset);
  const jie = f.prevJieqi.split(' ');

  root.appendChild(el('p', { class: 'hero-meta' }, dateText + ' ' + f.timeStr + ' · ' + f.gender + ' · ' + ctx.cityName));
  root.appendChild(el('p', { class: 'hero-lunar' },
    '农历 ' + f.lunarText + ' · 真太阳时 ' + off + ' 分 · ' + jie[0] + (jie[1] ? ' ' + jie[1].slice(5) : '')));

  root.appendChild(el('div', { class: 'hero-pillars' }, f.pillars.map((p) =>
    el('div', { class: 'hp' + (p.label === '日' ? ' is-day' : '') }, [
      el('span', { class: 'hp-label', text: p.label }),
      wxSpan(p.gan, GAN_WX[p.gan]),
      wxSpan(p.zhi, ZHI_WX[p.zhi])
    ])
  )));

  root.appendChild(el('div', { class: 'hero-foot' }, [
    el('span', { class: 'dm', text: f.dayGan + f.dayWx + '日主' }),
    el('span', { class: 'tag', text: f.strength.verdict }),
    el('span', { class: 'note', text: '同类 ' + fmt(f.strength.same) + ' · 异类 ' + fmt(f.strength.other) })
  ]));
}

function buildTabs() {
  const tabs = $('#tabs');
  clear(tabs);

  tabButtons = UI.result.tabs.map((t) =>
    el('button', {
      type: 'button',
      role: 'tab',
      id: 'tab-' + t.key,
      'aria-controls': 'panel-' + t.key,
      'aria-selected': 'false',
      tabindex: '-1',
      text: t.label,
      on: { click: () => setTab(t.key) }
    })
  );

  tabButtons.forEach((b) => tabs.appendChild(b));
  tabs.appendChild(el('span', { class: 'tabs-ink', 'aria-hidden': 'true' }));

  if (tabsBound) return;
  tabsBound = true;

  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const keys = UI.result.tabs.map((t) => t.key);
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = (keys.indexOf(active) + step + keys.length) % keys.length;
    setTab(keys[next]);
    tabButtons[next].focus();
  });
}

export function setTab(key, scroll = true) {
  const idx = Math.max(0, UI.result.tabs.findIndex((t) => t.key === key));
  active = UI.result.tabs[idx].key;

  tabButtons.forEach((b, i) => {
    const on = i === idx;
    b.classList.toggle('is-active', on);
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });

  $('#tabs').style.setProperty('--tab-i', idx);

  $$('.panel').forEach((p) => {
    const on = p.dataset.panel === active;
    p.classList.toggle('is-active', on);
    p.hidden = !on;
  });

  if (scroll) {
    const tabs = $('#tabs');
    window.scrollTo({ top: Math.max(0, tabs.offsetTop - 6), behavior: 'auto' });
  }
}

export function renderResult(f, alts, ctx) {
  active = 'facts';
  hero(f, ctx);
  buildTabs();
  renderFacts(f, alts, ctx);
  renderStories(f, ctx.years);
  renderColophon();
  setTab('facts', false);
}
