/**
 * 三种讲法：原句、美话、焦虑。
 * 三者共用同一份事实，只在措辞上分岔。
 */
import { el, clear, $ } from '../dom.js';
import { UI } from '../copy.js';
import { buildQuotes, buildFlatter, buildAnxiety } from '../narrative.js';

const no = (i) => String(i + 1).padStart(2, '0');

function intro(key) {
  const p = UI.result.panels[key];
  return el('header', { class: 'panel-intro' }, [
    el('span', { class: 'panel-kicker', text: p.kicker }),
    el('h2', { class: 'panel-title', text: p.title }),
    el('p', { class: 'panel-lede', text: p.lede })
  ]);
}

function quoteItems(items) {
  return el('ol', { class: 'story-list' }, items.map((it, i) =>
    el('li', { class: 'story-item' }, [
      el('span', { class: 'story-no', text: no(i) }),
      el('div', { class: 'story-body' }, [
        el('p', { class: 'story-quote', text: it.q }),
        it.plain ? el('p', { class: 'story-plain', text: it.plain }) : null
      ])
    ])
  ));
}

function sayItems(items) {
  return el('ol', { class: 'story-list' }, items.map((it, i) =>
    el('li', { class: 'story-item' }, [
      el('span', { class: 'story-no', text: no(i) }),
      el('div', { class: 'story-body' }, [
        el('p', { class: 'story-say', text: it.text }),
        el('p', { class: 'story-basis', text: it.basis })
      ])
    ])
  ));
}

function panel(sel, key, body) {
  const root = $(sel);
  clear(root);
  root.appendChild(intro(key));
  root.appendChild(body);
}

export function renderStories(f, years) {
  panel('#panel-quote', 'quote', quoteItems(buildQuotes(f)));
  panel('#panel-flatter', 'flatter', sayItems(buildFlatter(f, years)));
  panel('#panel-anxiety', 'anxiety', sayItems(buildAnxiety(f, years)));
}

export function renderColophon() {
  const root = $('#colophon');
  clear(root);
  root.appendChild(el('div', { class: 'seal', 'aria-hidden': 'true', text: '命' }));
  root.appendChild(el('p', { class: 'coda' }, [
    el('span', { text: UI.result.coda[0] }),
    el('span', { class: 'is-seal', text: UI.result.coda[1] })
  ]));
  root.appendChild(el('p', { class: 'disclaimer', text: UI.result.colophon }));
  root.appendChild(el('p', { class: 'signature' }, [
    el('span', { text: '纸 · 墨 · 印 —— 一份可复查的样本' }),
    el('a', {
      class: 'star-link',
      href: 'https://github.com/22145555734/Suan_Ming',
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'GitHub · star'
    })
  ]));
}
