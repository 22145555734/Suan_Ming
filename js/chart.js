/**
 * 排盘核心：只算可复查的事实，不含任何解读。
 * 依赖 vendor/lunar.js 暴露的全局 Solar（lunar-javascript 1.7.x）。
 */

export const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
export const GAN_YANG = { 甲: 1, 乙: 0, 丙: 1, 丁: 0, 戊: 1, 己: 0, 庚: 1, 辛: 0, 壬: 1, 癸: 0 };
export const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
export const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
export const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
export const WX_LIST = ['木', '火', '土', '金', '水'];
const HIDE_W = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.25, 0.15] };
const SEASON = {
  寅: '初春，木气初生', 卯: '仲春，木最旺', 辰: '春末湿土',
  巳: '初夏，火起', 午: '仲夏，火最旺', 未: '夏末燥土',
  申: '初秋，金气初生', 酉: '仲秋，金最旺', 戌: '秋末燥土',
  亥: '初冬，水起', 子: '仲冬，水最旺', 丑: '冬末湿土'
};
const TRIAD = { 申: '申子辰', 子: '申子辰', 辰: '申子辰', 寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌', 巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑', 亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未' };
const PEACH = { 申子辰: '酉', 寅午戌: '卯', 巳酉丑: '午', 亥卯未: '子' };

export const WX_CLASS = { 木: 'wx-mu', 火: 'wx-huo', 土: 'wx-tu', 金: 'wx-jin', 水: 'wx-shui' };

const pad = (n) => String(n).padStart(2, '0');

export const fmt = (n) => Number(n).toFixed(2);

export function shishen(dayGan, otherGan) {
  const dw = GAN_WX[dayGan], ow = GAN_WX[otherGan];
  const same = GAN_YANG[dayGan] === GAN_YANG[otherGan];
  if (ow === dw) return same ? '比肩' : '劫财';
  if (SHENG[dw] === ow) return same ? '食神' : '伤官';
  if (KE[dw] === ow) return same ? '偏财' : '正财';
  if (KE[ow] === dw) return same ? '七杀' : '正官';
  return same ? '偏印' : '正印';
}

function needLunar() {
  if (typeof Solar === 'undefined') throw new Error('排盘库未能加载：vendor/lunar.js 缺失');
  return Solar;
}

/**
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr HH:mm
 * @param {'男'|'女'} gender
 * @param {number} lon 出生地经度（东经为正）
 * @param {number} deltaMin 额外时间修正（用于相邻时辰推演）
 */
export function compute(dateStr, timeStr, gender, lon, deltaMin) {
  const Solar = needLunar();
  const dp = dateStr.split('-').map(Number);
  const tp = (timeStr || '12:00').split(':').map(Number);
  const offset = Math.round((lon - 120) * 4) + (deltaMin || 0);
  const dt = new Date(dp[0], dp[1] - 1, dp[2], tp[0], tp[1], 0);
  dt.setMinutes(dt.getMinutes() + offset);

  const solar = Solar.fromYmdHms(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes(), 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const pillars = [
    { label: '年', gan: ec.getYearGan(), zhi: ec.getYearZhi(), ganSS: ec.getYearShiShenGan(), hide: ec.getYearHideGan(), zhiSS: ec.getYearShiShenZhi(), nayin: ec.getYearNaYin() },
    { label: '月', gan: ec.getMonthGan(), zhi: ec.getMonthZhi(), ganSS: ec.getMonthShiShenGan(), hide: ec.getMonthHideGan(), zhiSS: ec.getMonthShiShenZhi(), nayin: ec.getMonthNaYin() },
    { label: '日', gan: ec.getDayGan(), zhi: ec.getDayZhi(), ganSS: '日主', hide: ec.getDayHideGan(), zhiSS: ec.getDayShiShenZhi(), nayin: ec.getDayNaYin() },
    { label: '时', gan: ec.getTimeGan(), zhi: ec.getTimeZhi(), ganSS: ec.getTimeShiShenGan(), hide: ec.getTimeHideGan(), zhiSS: ec.getTimeShiShenZhi(), nayin: ec.getTimeNaYin() }
  ];

  const scores = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((p) => {
    scores[GAN_WX[p.gan]] += 1;
    p.hide.forEach((g, i) => { scores[GAN_WX[g]] += HIDE_W[p.hide.length][i]; });
  });
  WX_LIST.forEach((k) => { scores[k] = Math.round(scores[k] * 100) / 100; });

  const dayGan = ec.getDayGan();
  const me = GAN_WX[dayGan];
  const shengMe = Object.keys(SHENG).find((k) => SHENG[k] === me);
  const same = scores[me] + scores[shengMe];
  const other = WX_LIST.filter((k) => k !== me && k !== shengMe)
    .reduce((a, k) => a + scores[k], 0);
  const total = same + other || 1;
  const ratio = same / total;
  const verdict = ratio > 0.5 ? '偏强' : (ratio < 0.4 ? '偏弱' : '中和');

  const yun = ec.getYun(gender === '男' ? 1 : 0);
  const dayun = yun.getDaYun().slice(0, 10).map((d) => ({
    start_year: d.getStartYear(),
    ganzhi: d.getGanZhi(),
    start_age: d.getStartAge(),
    end_age: d.getEndAge()
  })).filter((d) => d.ganzhi);

  const now = new Date();
  const liunianGz = Solar.fromYmd(now.getFullYear(), 6, 1).getLunar().getYearInGanZhiExact();

  const spots = {};
  pillars.forEach((p) => { spots[PEACH[TRIAD[p.zhi]]] = true; });
  const peachSpots = Object.keys(spots);
  const peachHits = pillars.filter((p) => peachSpots.indexOf(p.zhi) >= 0)
    .map((p) => p.label + '支' + p.zhi);

  return {
    dateStr, timeStr: timeStr || '12:00', gender, lon,
    offset: Math.round((lon - 120) * 4),
    solarText: dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()),
    lunarText: lunar.getYearInChinese() + '年' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese(),
    prevJieqi: lunar.getPrevJieQi().getName() + ' ' + lunar.getPrevJieQi().getSolar().toYmdHms(),
    pillars,
    scores,
    dayGan,
    dayWx: me,
    strength: { same: Math.round(same * 100) / 100, other: Math.round(other * 100) / 100, ratio, verdict },
    yunStart: yun.getStartYear() + '年' + yun.getStartMonth() + '个月',
    dayun,
    liunian: { year: now.getFullYear(), ganzhi: liunianGz },
    peach: { spots: peachSpots, hits: peachHits, yearHit: peachSpots.indexOf(liunianGz[1]) >= 0 }
  };
}

export function currentDayun(f) {
  const y = f.liunian.year;
  let cur = null;
  f.dayun.forEach((d) => {
    if (y >= d.start_year && y < d.start_year + 10) cur = d;
  });
  return cur;
}

export function hourCandidates(dateStr, timeStr, gender, lon) {
  const base = compute(dateStr, timeStr, gender, lon, 0);
  const baseDay = base.pillars[2].gan + base.pillars[2].zhi;
  const baseKey = base.pillars[3].gan + base.pillars[3].zhi;
  const out = [];
  const seen = {};
  [-120, -60, 0, 60, 120].forEach((dlt) => {
    const c = compute(dateStr, timeStr, gender, lon, dlt);
    if (c.pillars[2].gan + c.pillars[2].zhi !== baseDay) return;
    const p = c.pillars[3];
    const key = p.gan + p.zhi;
    if (seen[key]) return;
    seen[key] = true;
    out.push({ pillar: p, current: key === baseKey });
  });
  return out;
}

function yearVerdict(f, ss, zhi) {
  const weak = f.strength.verdict === '偏弱';
  const strong = f.strength.verdict === '偏强';
  const zw = ZHI_WX[zhi];
  const shengMe = Object.keys(SHENG).find((k) => SHENG[k] === f.dayWx);
  const supportZhi = (zw === f.dayWx || zw === shengMe);
  const base = { 正印: 2, 偏印: 1, 比肩: 0, 劫财: -1, 食神: 1, 伤官: -1, 正财: 1, 偏财: 0, 正官: 1, 七杀: -2 };
  let score = base[ss] || 0;
  const supportSS = ['正印', '偏印', '比肩', '劫财'].indexOf(ss) >= 0;
  const drainSS = ['正财', '偏财', '正官', '七杀'].indexOf(ss) >= 0;
  if (weak) {
    if (supportSS) score += 1;
    if (drainSS) score -= 1;
    score += supportZhi ? 1 : -1;
  } else if (strong) {
    if (drainSS) score += 1;
    if (supportSS) score -= 1;
    score += supportZhi ? -1 : 1;
  }
  return score >= 2 ? '吉' : (score <= -1 ? '凶' : '平');
}

export function liunianList(f, from, to) {
  const Solar = needLunar();
  const out = [];
  for (let y = from; y <= to; y++) {
    const gz = Solar.fromYmd(y, 6, 1).getLunar().getYearInGanZhiExact();
    const ss = shishen(f.dayGan, gz[0]);
    out.push({ year: y, ganzhi: gz, ss, verdict: yearVerdict(f, ss, gz[1]) });
  }
  return out;
}

export { SEASON, TRIAD, PEACH };
