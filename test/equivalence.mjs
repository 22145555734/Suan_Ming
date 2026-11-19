/**
 * 把新排盘结果和归档的旧版逐项对一遍。
 * 用法：node test/equivalence.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { compute, hourCandidates, liunianList } from '../js/chart.js';
import { buildQuotes, buildFlatter, buildAnxiety } from '../js/narrative.js';

/* 旧版是 IIFE + 全局 Solar，这里在 vm 里给它一个最小环境 */
const lunarCode = fs.readFileSync(new URL('../vendor/lunar.js', import.meta.url), 'utf8');
const sandbox = { console, Date, Math, JSON };
vm.createContext(sandbox);
vm.runInContext(lunarCode, sandbox);
globalThis.Solar = sandbox.Solar;

const oldCode = fs.readFileSync(new URL('../archive/v3/app.js', import.meta.url), 'utf8');
const mod = { exports: {} };
const wrap = vm.runInContext('(function (module, exports) {\n' + oldCode + '\n})', sandbox);
wrap(mod, mod.exports);
const old = mod.exports;

const cases = [
  { date: '1995-01-13', time: '07:30', gender: '男', lon: 113.3 },
  { date: '1988-12-03', time: '23:10', gender: '女', lon: 121.5 },
  { date: '2000-02-29', time: '00:05', gender: '男', lon: 104.1 },
  { date: '1976-07-15', time: '12:00', gender: '女', lon: 87.6 },
  { date: '2003-10-08', time: '18:45', gender: '男', lon: 120 }
];

let bad = 0;

function check(label, a, b) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) {
    bad++;
    console.log('✗ ' + label);
    console.log('  old: ' + sa);
    console.log('  new: ' + sb);
  }
}

for (const c of cases) {
  const a = old.compute(c.date, c.time, c.gender, c.lon, 0);
  const b = compute(c.date, c.time, c.gender, c.lon, 0);
  const tag = c.date + ' ' + c.time + ' ' + c.gender + ' ' + c.lon;

  check(tag + ' · pillars', a.pillars, b.pillars);
  check(tag + ' · scores', a.scores, b.scores);
  check(tag + ' · strength', a.strength, b.strength);
  check(tag + ' · solarText', a.solarText, b.solarText);
  check(tag + ' · lunarText', a.lunarText, b.lunarText);
  check(tag + ' · dayun', a.dayun, b.dayun);
  check(tag + ' · peach', a.peach, b.peach);
  check(tag + ' · offset', a.offset, b.offset);
  check(tag + ' · yunStart', a.yunStart, b.yunStart);

  const ya = old.liunianList(a, a.liunian.year - 10, a.liunian.year + 19);
  const yb = liunianList(b, b.liunian.year - 10, b.liunian.year + 19);
  check(tag + ' · liunian', ya, yb);

  const aa = old.hourCandidates(c.date, c.time, c.gender, c.lon);
  const ab = hourCandidates(c.date, c.time, c.gender, c.lon);
  check(tag + ' · hourCandidates', aa, ab);

  check(tag + ' · quotes', old.buildQuotes(a), buildQuotes(b));
  check(tag + ' · flatter', old.buildFlatter(a, ya), buildFlatter(b, yb));
  check(tag + ' · anxiety', old.buildAnxiety(a, ya), buildAnxiety(b, yb));
}

if (bad) {
  console.log('\n' + bad + ' 处不一致');
  process.exit(1);
}
console.log('✓ ' + cases.length + ' 组输入，全部字段与旧版一致');
