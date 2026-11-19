/**
 * 入口：读输入、排盘、切屏。
 */
import { compute, hourCandidates, liunianList } from './chart.js';
import { PROVINCES } from './cities.js';
import { $, $$, showScreen } from './dom.js';
import { renderResult } from './ui/result.js';

const STORE_KEY = 'suanming.input.v2';
const DEFAULT = { date: '1995-06-18', time: '12:00', gender: '男', province: '北京', city: '北京', lon: 116.43, uncertain: false };

const state = { ...DEFAULT };

/* ------------------------------ 读上次输入 ------------------------------ */

function findProvince(name) {
  return PROVINCES.find(([p]) => p === name);
}

function cityOf(provinceName, cityName) {
  const p = findProvince(provinceName);
  if (!p) return null;
  const c = p[1].find(([n]) => n === cityName);
  return c ? { province: p[0], city: c[0], lon: c[1] } : null;
}

function nearestCity(lon) {
  let best = null;
  for (const [p, cities] of PROVINCES) {
    for (const [n, lng] of cities) {
      const d = Math.abs(lng - lon);
      if (!best || d < best.d) best = { province: p, city: n, lon: lng, d };
    }
  }
  return best && best.d < 0.15 ? best : null;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(saved.date)) state.date = saved.date;
      if (/^\d{2}:\d{2}$/.test(saved.time)) state.time = saved.time;
      if (saved.gender === '男' || saved.gender === '女') state.gender = saved.gender;
      const hit = cityOf(saved.province, saved.city) ||
        (typeof saved.lon === 'number' && isFinite(saved.lon) ? nearestCity(saved.lon) : null);
      if (hit) {
        state.province = hit.province;
        state.city = hit.city;
        state.lon = hit.lon;
      }
      state.uncertain = Boolean(saved.uncertain);
    }
  } catch (e) { /* 忽略损坏的本地数据 */ }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      date: state.date, time: state.time, gender: state.gender,
      province: state.province, city: state.city, lon: state.lon, uncertain: state.uncertain
    }));
  } catch (e) { /* 隐私模式下写不进去，不影响使用 */ }
}

/* ------------------------------ 界面同步 ------------------------------ */

const dateLabel = () => $('#date-value').textContent = state.date.split('-').join('.');
const timeLabel = () => $('#time-value').textContent = state.time || '12:00';

function fillProvinces() {
  const sel = $('#in-province');
  sel.innerHTML = '';
  for (const [p] of PROVINCES) sel.append(new Option(p, p));
}

function fillCities(provinceName, cityName) {
  const sel = $('#in-city');
  const p = findProvince(provinceName) || PROVINCES[0];
  sel.innerHTML = '';
  for (const [n, lon] of p[1]) sel.append(new Option(n, String(lon)));
  const pick = p[1].find(([n]) => n === cityName) || p[1][0];
  sel.value = String(pick[1]);
}

function syncPlace() {
  $('#province-value').textContent = state.province;
  $('#city-value').textContent = state.city;
}

function setGender(g) {
  state.gender = g;
  const box = $('#gender');
  box.dataset.v = g;
  $$('#gender button').forEach((b) => {
    const on = b.dataset.g === g;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

/* ------------------------------ 生日面板 ------------------------------ */

const dp = { y: 1995, m: 6, d: 18 };
const pad2 = (n) => String(n).padStart(2, '0');
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const maxYear = () => new Date().getFullYear();

function weekday(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return '星期' + '日一二三四五六'[new Date(y, m - 1, d).getDay()];
}

function ensureDays() {
  const box = $('#dp-days');
  if (box.children.length) return;
  for (let d = 1; d <= 31; d++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(d);
    b.dataset.d = String(d);
    b.addEventListener('click', () => { dp.d = d; paintSheet(); });
    box.appendChild(b);
  }
}

function paintDays() {
  const max = daysInMonth(dp.y, dp.m);
  $$('#dp-days button').forEach((b) => {
    const d = Number(b.dataset.d);
    b.disabled = d > max;
    const on = d === dp.d;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function paintSheet() {
  const max = daysInMonth(dp.y, dp.m);
  if (dp.d > max) dp.d = max;
  if (dp.d < 1) dp.d = 1;

  $$('#dp-months button').forEach((b) => {
    const on = Number(b.dataset.m) === dp.m;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  paintDays();

  const raw = $('#dp-year').value.trim();
  const y = Number(raw);
  const yearOk = /^\d{4}$/.test(raw) && y >= 1900 && y <= maxYear();
  const showError = raw.length === 4 && !yearOk;
  $('#dp-year').classList.toggle('is-error', showError);
  $('#dp-year').setAttribute('aria-invalid', String(showError));

  if (!yearOk) {
    $('#dp-ok').disabled = true;
    $('#dp-preview').textContent = '输入 1900–' + maxYear() + ' 之间的年份';
    return;
  }

  const iso = y + '-' + pad2(dp.m) + '-' + pad2(dp.d);
  if (iso > todayStr()) {
    $('#dp-ok').disabled = true;
    $('#dp-preview').textContent = '还没到这一天';
    return;
  }

  $('#dp-ok').disabled = false;
  $('#dp-preview').textContent = y + ' 年 ' + dp.m + ' 月 ' + dp.d + ' 日 · ' + weekday(iso);
}

function openDateSheet() {
  const parts = ($('#in-date').value || DEFAULT.date).split('-').map(Number);
  dp.y = parts[0] || 1995;
  dp.m = parts[1] || 6;
  dp.d = parts[2] || 18;

  $('#dp-year').value = String(dp.y);
  $('#dp-range').textContent = '1900–' + maxYear();

  const months = $('#dp-months');
  if (!months.children.length) {
    for (let m = 1; m <= 12; m++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(m);
      b.dataset.m = String(m);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { dp.m = m; paintSheet(); });
      months.appendChild(b);
    }
  }

  ensureDays();
  paintSheet();
  $('#date-sheet').hidden = false;
  document.documentElement.classList.add('is-sheet-open');
  $('#date-open').setAttribute('aria-expanded', 'true');
  $('#date-sheet .sheet-panel').focus();
}

function closeDateSheet() {
  if ($('#date-sheet').hidden) return;
  $('#date-sheet').hidden = true;
  document.documentElement.classList.remove('is-sheet-open');
  $('#date-open').setAttribute('aria-expanded', 'false');
  $('#date-open').focus();
}

function commitDate() {
  const raw = $('#dp-year').value.trim();
  const y = Number(raw);
  if (!/^\d{4}$/.test(raw) || y < 1900 || y > maxYear()) {
    paintSheet();
    $('#dp-year').focus();
    return;
  }

  const iso = y + '-' + pad2(dp.m) + '-' + pad2(dp.d);
  if (iso > todayStr()) return;

  $('#in-date').value = iso;
  state.date = iso;
  dateLabel();
  error('');
  closeDateSheet();
}

function bindDateSheet() {
  $('#date-open').addEventListener('click', openDateSheet);
  $('#sheet-close').addEventListener('click', closeDateSheet);
  $('#dp-ok').addEventListener('click', commitDate);

  $('#date-sheet').addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-close]')) closeDateSheet();
  });

  $('#dp-year').addEventListener('input', (e) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (clean !== e.target.value) e.target.value = clean;
    if (/^\d{4}$/.test(clean)) {
      const y = Number(clean);
      if (y >= 1900 && y <= maxYear()) dp.y = y;
    }
    paintSheet();
  });

  $('#dp-year').addEventListener('blur', () => {
    const y = Number($('#dp-year').value);
    if (!/^\d{4}$/.test($('#dp-year').value) || y < 1900 || y > maxYear()) {
      $('#dp-year').value = String(dp.y);
      paintSheet();
    }
  });

  $('#dp-year').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitDate(); }
  });

  document.addEventListener('keydown', (e) => {
    if ($('#date-sheet').hidden) return;
    if (e.key === 'Escape') { closeDateSheet(); return; }
    if (e.key !== 'Tab') return;
    const focusables = $$('#date-sheet button, #date-sheet input')
      .filter((n) => !n.disabled && n.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

function boot() {
  load();

  $('#in-date').value = state.date;
  $('#in-time').value = state.time;
  $('#in-uncertain').checked = state.uncertain;

  fillProvinces();
  $('#in-province').value = state.province;
  fillCities(state.province, state.city);
  $('#in-city').value = String(state.lon);

  dateLabel();
  timeLabel();
  syncPlace();
  setGender(state.gender);
}

/* ------------------------------ 事件 ------------------------------ */

function error(msg) {
  const box = $('#form-error');
  if (!msg) {
    box.hidden = true;
    box.textContent = '';
    return;
  }
  box.textContent = msg;
  box.hidden = false;
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function submit(e) {
  if (e) e.preventDefault();
  error('');

  const date = $('#in-date').value || state.date;
  const time = $('#in-time').value || '12:00';
  const lon = parseFloat($('#in-city').value);
  const uncertain = $('#in-uncertain').checked;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    error('请选择一个公历生日。');
    return;
  }
  if (date > todayStr()) {
    error('生日不能晚于今天。');
    return;
  }

  state.date = date;
  state.time = time;
  state.province = $('#in-province').value;
  const cityOpt = $('#in-city').selectedOptions[0];
  if (cityOpt) state.city = cityOpt.textContent;
  state.lon = isFinite(lon) ? lon : 120;
  state.uncertain = uncertain;

  let f;
  try {
    f = compute(date, time, state.gender, state.lon, 0);
  } catch (err) {
    error(err instanceof Error ? err.message : '排盘失败，请刷新后重试。');
    return;
  }

  const years = liunianList(f, f.liunian.year - 10, f.liunian.year + 19);
  const alts = uncertain ? hourCandidates(date, time, state.gender, state.lon) : null;

  save();

  renderResult(f, alts, { years, cityName: state.city });
  showScreen('result');

  try {
    history.pushState({ suanming: 'result' }, '', location.href);
  } catch (err) { /* file:// 下可能不允许 */ }
}

function bind() {
  $('#btn-start').addEventListener('click', () => showScreen('input'));
  $('#btn-home').addEventListener('click', () => showScreen('cover'));

  bindDateSheet();

  $('#in-time').addEventListener('input', (e) => {
    state.time = e.target.value || '12:00';
    timeLabel();
  });

  $('#in-province').addEventListener('change', (e) => {
    const p = findProvince(e.target.value) || PROVINCES[0];
    state.province = p[0];
    state.city = p[1][0][0];
    state.lon = p[1][0][1];
    fillCities(state.province, state.city);
    syncPlace();
  });

  $('#in-city').addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (!opt) return;
    state.city = opt.textContent;
    state.lon = parseFloat(opt.value) || 120;
    syncPlace();
  });

  $('#in-uncertain').addEventListener('change', (e) => {
    state.uncertain = e.target.checked;
  });

  $$('#gender button').forEach((b) => {
    b.addEventListener('click', () => setGender(b.dataset.g));
  });

  $('#birth-form').addEventListener('submit', submit);

  const back = () => {
    if (history.state && history.state.suanming === 'result') {
      history.back();
      return;
    }
    showScreen('input');
  };

  $('#btn-back').addEventListener('click', back);
  $('#btn-restart').addEventListener('click', () => showScreen('input'));

  window.addEventListener('popstate', () => {
    const resultShown = !$('#screen-result').hidden;
    if (resultShown) showScreen('input');
  });
}

/* ------------------------------ 启动 ------------------------------ */

boot();
bind();

if ('serviceWorker' in navigator && location.protocol.startsWith('http') &&
    location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* 离线缓存失败不影响排盘 */ });
  });
}
