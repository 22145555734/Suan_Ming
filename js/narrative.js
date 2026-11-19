/**
 * 话术层：同一份盘，三套讲法。
 * 所有输出都带依据，且不改变事实。
 */
import { GAN_WX, WX_LIST, SHENG, ZHI_WX, fmt, shishen, currentDayun, SEASON } from './chart.js';
import {
  DM_FLATTER, SS_FLATTER, SS_ANXIETY, WX_FLATTER, WX_ANXIETY,
  STRENGTH_FLATTER, STRENGTH_ANXIETY, YEAR_FLATTER, YEAR_ANXIETY, PLAIN
} from './copy.js';

function pickSS(f) {
  const all = f.pillars.filter((p) => p.label !== '日').map((p) => ({
    ss: p.ganSS, gan: p.gan, where: p.label + '柱天干'
  }));
  const pri = ['七杀', '伤官', '劫财', '偏财', '正官', '正印', '食神', '比肩', '正财', '偏印'];
  const picked = [];
  pri.forEach((s) => {
    if (picked.length >= 2) return;
    const hit = all.find((x) => x.ss === s);
    if (hit && !picked.some((p) => p.ss === s)) picked.push(hit);
  });
  return picked;
}

function dayAnxiety(f) {
  const m = f.pillars[1].zhi;
  const wx = f.dayWx;
  const monthWx = ZHI_WX[m];
  const season = SEASON[m];
  const state = monthWx === wx ? '得令' : (SHENG[monthWx] === wx ? '得生' : '失令');
  const line = {
    木: '木无根则摇，风一吹就往两边倒。',
    火: '火没有根，你耗电比谁都快。',
    土: '土虚则崩，你兜得住别人，兜不住自己。',
    金: '金寒则脆，看着硬，其实一折就断。',
    水: '水多则滥，什么都想要，最后什么都留不住。'
  }[wx];
  if (state === '得令') return f.dayGan + wx + '生于' + m + '月，' + season + '，这叫得令。但得令的人，往往输在“太顺”上。';
  if (state === '得生') return f.dayGan + wx + '生于' + m + '月，' + season + '，得生。有人撑着，但撑你的人也可能压着你。';
  return f.dayGan + wx + '生于' + m + '月，' + season + '，失令。' + line;
}

function heaviest(f) {
  return WX_LIST.reduce((a, b) => (f.scores[a] >= f.scores[b] ? a : b));
}

export function buildFlatter(f, years) {
  const out = [];
  out.push({ text: DM_FLATTER[f.dayGan][1], basis: '日主 ' + f.dayGan });
  pickSS(f).forEach((x) => {
    out.push({ text: SS_FLATTER[x.ss][1], basis: x.where + ' ' + x.gan + ' · ' + x.ss });
  });
  const maxWx = heaviest(f);
  out.push({ text: '你盘里最重的一笔是' + maxWx + '。' + WX_FLATTER[maxWx][1], basis: '五行 ' + maxWx + ' ' + fmt(f.scores[maxWx]) });
  out.push({ text: STRENGTH_FLATTER[f.strength.verdict][1], basis: '同类 ' + fmt(f.strength.same) + ' / 异类 ' + fmt(f.strength.other) });

  const good = years.filter((y) => y.verdict === '吉')[0] || years.filter((y) => y.verdict === '平')[0];
  if (good) {
    out.push({ text: good.year + ' ' + good.ganzhi + '年，' + good.ss + '到位，是这三十年里少有的顺风年。' + YEAR_FLATTER[good.ss], basis: '流年 ' + good.ganzhi + ' · ' + good.ss });
  }
  const dy = currentDayun(f);
  if (dy) {
    const dySS = shishen(f.dayGan, dy.ganzhi[0]);
    out.push({ text: dy.ganzhi + '大运，' + dySS + '当令。这十年，' + YEAR_FLATTER[dySS], basis: '大运 ' + dy.start_year + '–' + (dy.start_year + 9) + ' · ' + dySS });
  }
  if (f.peach.hits.length) {
    out.push({ text: '桃花落在' + f.peach.spots.join('、') + '，你的' + f.peach.hits.join('、') + '正踩在上面。异性缘不是等来的，是你走到哪儿都带着的。' + (f.peach.yearHit ? '今年流年又踩桃花，热闹。' : ''), basis: '桃花位 ' + f.peach.spots.join('、') });
  }
  return out;
}

export function buildAnxiety(f, years) {
  const out = [];
  out.push({ text: dayAnxiety(f), basis: '日主 ' + f.dayGan + ' · ' + f.pillars[1].zhi + '月' });
  pickSS(f).forEach((x) => {
    out.push({ text: SS_ANXIETY[x.ss][1], basis: x.where + ' ' + x.gan + ' · ' + x.ss });
  });
  const maxWx = heaviest(f);
  out.push({ text: '你盘里' + maxWx + '压得最重。' + WX_ANXIETY[maxWx][1], basis: '五行 ' + maxWx + ' ' + fmt(f.scores[maxWx]) });
  out.push({ text: STRENGTH_ANXIETY[f.strength.verdict][1], basis: '同类 ' + fmt(f.strength.same) + ' / 异类 ' + fmt(f.strength.other) });

  const bad = years.filter((y) => y.verdict === '凶')[0];
  if (bad) {
    out.push({ text: bad.year + ' ' + bad.ganzhi + '年，' + bad.ss + '临身。' + YEAR_ANXIETY[bad.ss], basis: '流年 ' + bad.ganzhi + ' · ' + bad.ss });
  }
  const dy = currentDayun(f);
  if (dy) {
    const dySS = shishen(f.dayGan, dy.ganzhi[0]);
    out.push({ text: dy.ganzhi + '大运，' + dySS + '压头。这十年，' + YEAR_ANXIETY[dySS], basis: '大运 ' + dy.start_year + '–' + (dy.start_year + 9) + ' · ' + dySS });
  }
  if (f.peach.hits.length) {
    out.push({ text: '桃花落在' + f.peach.spots.join('、') + '，命里带着，甩不掉。' + f.peach.hits.join('、') + '被桃花一冲，感情上的账最容易算不清。' + (f.peach.yearHit ? '今年流年又踩桃花，更要小心。' : ''), basis: '桃花位 ' + f.peach.spots.join('、') });
  }
  return out;
}

export function buildQuotes(f) {
  const out = [];
  const add = (q) => out.push({ q, plain: PLAIN[q] || '' });
  add(DM_FLATTER[f.dayGan][0]);
  pickSS(f).forEach((x) => {
    add(SS_FLATTER[x.ss][0]);
    add(SS_ANXIETY[x.ss][0]);
  });
  const maxWx = heaviest(f);
  add(WX_FLATTER[maxWx][0]);
  add(STRENGTH_FLATTER[f.strength.verdict][0]);
  if (f.peach.hits.length) {
    add('桃花坐命，主风流俊雅。');
    add('桃花带煞，风流成性。');
  }
  return out;
}

export { pickSS };
