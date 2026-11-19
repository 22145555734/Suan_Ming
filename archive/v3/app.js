(function () {
  'use strict';

  if (typeof Solar === 'undefined') {
    if (typeof document !== 'undefined') {
      var fb = document.getElementById('facts-body');
      if (fb) fb.innerHTML = '<p style="color:var(--hot)">排盘库未能加载，请确认 vendor/lunar.js 存在。</p>';
    }
    return;
  }

  var GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var GAN_YANG = { 甲: 1, 乙: 0, 丙: 1, 丁: 0, 戊: 1, 己: 0, 庚: 1, 辛: 0, 壬: 1, 癸: 0 };
  var ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  var HIDE_W = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.25, 0.15] };
  var WX_LIST = ['木', '火', '土', '金', '水'];
  var SEASON = {
    寅: '初春，木气初生', 卯: '仲春，木最旺', 辰: '春末湿土',
    巳: '初夏，火起', 午: '仲夏，火最旺', 未: '夏末燥土',
    申: '初秋，金气初生', 酉: '仲秋，金最旺', 戌: '秋末燥土',
    亥: '初冬，水起', 子: '仲冬，水最旺', 丑: '冬末湿土'
  };
  var TRIAD = { 申: '申子辰', 子: '申子辰', 辰: '申子辰', 寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌', 巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑', 亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未' };
  var PEACH = { 申子辰: '酉', 寅午戌: '卯', 巳酉丑: '午', 亥卯未: '子' };

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(n) { return Number(n).toFixed(2); }

  function shishen(dayGan, otherGan) {
    var dw = GAN_WX[dayGan], ow = GAN_WX[otherGan];
    var same = GAN_YANG[dayGan] === GAN_YANG[otherGan];
    if (ow === dw) return same ? '比肩' : '劫财';
    if (SHENG[dw] === ow) return same ? '食神' : '伤官';
    if (KE[dw] === ow) return same ? '偏财' : '正财';
    if (KE[ow] === dw) return same ? '七杀' : '正官';
    return same ? '偏印' : '正印';
  }

  function compute(dateStr, timeStr, gender, lon, deltaMin) {
    var dp = dateStr.split('-').map(Number);
    var tp = (timeStr || '12:00').split(':').map(Number);
    var offset = Math.round((lon - 120) * 4) + (deltaMin || 0);
    var dt = new Date(dp[0], dp[1] - 1, dp[2], tp[0], tp[1], 0);
    dt.setMinutes(dt.getMinutes() + offset);

    var solar = Solar.fromYmdHms(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes(), 0);
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();

    var pillars = [
      { label: '年', gan: ec.getYearGan(), zhi: ec.getYearZhi(), ganSS: ec.getYearShiShenGan(), hide: ec.getYearHideGan(), zhiSS: ec.getYearShiShenZhi(), nayin: ec.getYearNaYin() },
      { label: '月', gan: ec.getMonthGan(), zhi: ec.getMonthZhi(), ganSS: ec.getMonthShiShenGan(), hide: ec.getMonthHideGan(), zhiSS: ec.getMonthShiShenZhi(), nayin: ec.getMonthNaYin() },
      { label: '日', gan: ec.getDayGan(), zhi: ec.getDayZhi(), ganSS: '日主', hide: ec.getDayHideGan(), zhiSS: ec.getDayShiShenZhi(), nayin: ec.getDayNaYin() },
      { label: '时', gan: ec.getTimeGan(), zhi: ec.getTimeZhi(), ganSS: ec.getTimeShiShenGan(), hide: ec.getTimeHideGan(), zhiSS: ec.getTimeShiShenZhi(), nayin: ec.getTimeNaYin() }
    ];

    var scores = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach(function (p) {
      scores[GAN_WX[p.gan]] += 1;
      p.hide.forEach(function (g, i) { scores[GAN_WX[g]] += HIDE_W[p.hide.length][i]; });
    });
    WX_LIST.forEach(function (k) { scores[k] = Math.round(scores[k] * 100) / 100; });

    var dayGan = ec.getDayGan();
    var me = GAN_WX[dayGan];
    var shengMe = Object.keys(SHENG).find(function (k) { return SHENG[k] === me; });
    var same = scores[me] + scores[shengMe];
    var other = WX_LIST.filter(function (k) { return k !== me && k !== shengMe; })
      .reduce(function (a, k) { return a + scores[k]; }, 0);
    var total = same + other || 1;
    var ratio = same / total;
    var verdict = ratio > 0.5 ? '偏强' : (ratio < 0.4 ? '偏弱' : '中和');

    var yun = ec.getYun(gender === '男' ? 1 : 0);
    var dayun = yun.getDaYun().slice(0, 10).map(function (d) {
      return { start_year: d.getStartYear(), ganzhi: d.getGanZhi(), start_age: d.getStartAge(), end_age: d.getEndAge() };
    }).filter(function (d) { return d.ganzhi; });

    var now = new Date();
    var liunianGz = Solar.fromYmd(now.getFullYear(), 6, 1).getLunar().getYearInGanZhiExact();

    var spots = {};
    pillars.forEach(function (p) { spots[PEACH[TRIAD[p.zhi]]] = true; });
    var peachSpots = Object.keys(spots);
    var peachHits = pillars.filter(function (p) { return peachSpots.indexOf(p.zhi) >= 0; })
      .map(function (p) { return p.label + '支' + p.zhi; });

    return {
      dateStr: dateStr, timeStr: timeStr || '12:00', gender: gender, lon: lon,
      offset: Math.round((lon - 120) * 4),
      solarText: dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()),
      lunarText: lunar.getYearInChinese() + '年' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese(),
      prevJieqi: lunar.getPrevJieQi().getName() + ' ' + lunar.getPrevJieQi().getSolar().toYmdHms(),
      pillars: pillars,
      scores: scores,
      dayGan: dayGan,
      dayWx: me,
      strength: { same: Math.round(same * 100) / 100, other: Math.round(other * 100) / 100, ratio: ratio, verdict: verdict },
      yunStart: yun.getStartYear() + '年' + yun.getStartMonth() + '个月',
      dayun: dayun,
      liunian: { year: now.getFullYear(), ganzhi: liunianGz },
      peach: { spots: peachSpots, hits: peachHits, yearHit: peachSpots.indexOf(liunianGz[1]) >= 0 }
    };
  }

  function currentDayun(f) {
    var y = f.liunian.year, cur = null;
    f.dayun.forEach(function (d) {
      if (y >= d.start_year && y < d.start_year + 10) cur = d;
    });
    return cur;
  }

  function hourCandidates(dateStr, timeStr, gender, lon) {
    var base = compute(dateStr, timeStr, gender, lon, 0);
    var baseDay = base.pillars[2].gan + base.pillars[2].zhi;
    var baseKey = base.pillars[3].gan + base.pillars[3].zhi;
    var out = [], seen = {};
    [-120, -60, 0, 60, 120].forEach(function (dlt) {
      var c = compute(dateStr, timeStr, gender, lon, dlt);
      if (c.pillars[2].gan + c.pillars[2].zhi !== baseDay) return;
      var p = c.pillars[3];
      var key = p.gan + p.zhi;
      if (seen[key]) return;
      seen[key] = true;
      out.push({ pillar: p, current: key === baseKey });
    });
    return out;
  }

  function yearVerdict(f, ss, zhi) {
    var weak = f.strength.verdict === '偏弱';
    var strong = f.strength.verdict === '偏强';
    var zw = ZHI_WX[zhi];
    var shengMe = Object.keys(SHENG).find(function (k) { return SHENG[k] === f.dayWx; });
    var supportZhi = (zw === f.dayWx || zw === shengMe);
    var base = { 正印: 2, 偏印: 1, 比肩: 0, 劫财: -1, 食神: 1, 伤官: -1, 正财: 1, 偏财: 0, 正官: 1, 七杀: -2 };
    var score = base[ss] || 0;
    var supportSS = ['正印', '偏印', '比肩', '劫财'].indexOf(ss) >= 0;
    var drainSS = ['正财', '偏财', '正官', '七杀'].indexOf(ss) >= 0;
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

  function liunianList(f, from, to) {
    var out = [];
    for (var y = from; y <= to; y++) {
      var gz = Solar.fromYmd(y, 6, 1).getLunar().getYearInGanZhiExact();
      var ss = shishen(f.dayGan, gz[0]);
      out.push({ year: y, ganzhi: gz, ss: ss, verdict: yearVerdict(f, ss, gz[1]) });
    }
    return out;
  }

  /* ---------- 原句与白话 ---------- */

  var DM_FLATTER = {
    甲: ['甲木参天，脱胎要火。', '甲木日主——参天之木。你不是随风倒的人，你是一旦扎下根，就只顾往上长的人。'],
    乙: ['乙木虽柔，刲羊解牛。', '乙木日主——藤萝之木。你不跟人硬碰，你绕着长，最后所有人都得借你的力。'],
    丙: ['丙火猛烈，欺霜侮雪。', '丙火日主——太阳之火。你藏不住情绪，也藏不住热情，喜欢谁，谁都看得出来。'],
    丁: ['丁火柔中，内性昭融。', '丁火日主——灯烛之火。太阳的光所有人共享，灯烛的光只照亮身边几个人。你不是最扎眼的，但你是熟人圈里最有用的。'],
    戊: ['戊土固重，既中且正。', '戊土日主——城墙之土。你不轻易表态，但真到事上，你是那个兜底的人。'],
    己: ['己土卑湿，中正蓄藏。', '己土日主——田园之土。你看起来软，其实你能养人，也能容人。'],
    庚: ['庚金带煞，刚健为最。', '庚金日主——刀剑之金。你说话直、下手快，不喜欢拖泥带水。'],
    辛: ['辛金软弱，温润而清。', '辛金日主——珠玉之金。你不是锋利，你是精致；不是冷，是挑。'],
    壬: ['壬水通河，能泄金气。', '壬水日主——江河之水。你方向感强，一旦认准就往下游走，拦不住。'],
    癸: ['癸水至弱，达于天津。', '癸水日主——雨露之水。你细、你慢，但你渗得进去。']
  };

  var DM_ANXIETY_Q = {
    木: '木无根则摇，身弱不胜财官。',
    火: '火无根则熄，身弱不胜财官。',
    土: '土虚则崩，身弱不胜财官。',
    金: '金寒则脆，身弱不胜财官。',
    水: '水多则滥，身弱不胜财官。'
  };

  var SS_FLATTER = {
    正印: ['印绶生身，主聪明多智。', '正印护身，长辈缘、老师缘不差，关键节点总有人拉你一把。'],
    偏印: ['偏印有气，主机巧多能。', '偏印的人直觉准，学东西不走寻常路。'],
    比肩: ['比肩扶身，主自立。', '比肩说明你身边同频的人不少，不必一个人硬扛。'],
    劫财: ['劫财有制，主魄力。', '劫财是把双刃剑——总有人跟你抢，也总有人陪你冲。'],
    食神: ['食神有气胜财官。', '食神有口福，也懂得把日子过出滋味。'],
    伤官: ['伤官吐秀，主聪明。', '伤官是创造力。你不服管，换个说法是有主见。'],
    正财: ['正财归垣，主勤俭。', '正财踏实，你属于会攒的人。'],
    偏财: ['偏财有气，主豪爽。', '偏财活络，财路不止一条。'],
    七杀: ['七杀有制化为权。', '七杀有魄力，关键时刻你敢拍板。'],
    正官: ['正官佩印，主贵。', '正官守规矩、有分寸，容易被看见。']
  };

  var SS_ANXIETY = {
    正印: ['印重身衰，反成滞碍。', '印重压身，想得多，做得少。'],
    偏印: ['枭神夺食，主饥馑。', '偏印夺食，想法憋在心里，说不出口。'],
    比肩: ['比肩争财，兄弟不睦。', '比肩争财，朋友之间容易有算不清的账。'],
    劫财: ['劫财羊刃，破财伤妻。', '劫财夺财，破财、合伙生变。'],
    食神: ['食神受制，主口舌。', '食神受制，有口难言。'],
    伤官: ['伤官见官，为祸百端。', '伤官克官，主不服管、口舌是非。'],
    正财: ['财逢劫刃，聚散无常。', '正财怕劫，到手的钱容易被分走。'],
    偏财: ['偏财无制，主耗散。', '偏财不稳，来得快，走得也快。'],
    七杀: ['七杀攻身，无制则凶。', '七杀攻身，压力从四面来。'],
    正官: ['官杀混杂，进退失据。', '正官受克，规矩压下来，动辄得咎。']
  };

  var WX_FLATTER = {
    木: ['木主仁，曲直有度。', '你爱生长、爱往上走。'],
    火: ['火主礼，其性炎上。', '你有热度，能点亮身边的人。'],
    土: ['土主信，厚德载物。', '你稳，能承载。'],
    金: ['金主义，锋锐有界。', '你有锋芒，也有边界。'],
    水: ['水主智，随物赋形。', '你灵活，能绕开障碍。']
  };

  var WX_ANXIETY = {
    木: ['木旺无制，主偏枯。', '木过旺则折，太想长，反而容易断。'],
    火: ['火旺无制，主偏枯。', '火过旺则焦，烧得太快。'],
    土: ['土旺无制，主偏枯。', '土过旺则滞，容易卡住。'],
    金: ['金旺无制，主偏枯。', '金过旺则伤，伤人伤己。'],
    水: ['水旺无制，主偏枯。', '水过旺则滥，什么都想要，最后什么都留不住。']
  };

  var STRENGTH_FLATTER = {
    偏弱: ['身弱有印，赖印生扶。', '你是需要被滋养的人，所以更敏感、更会察言观色。'],
    偏强: ['身强有制，主担当。', '你有主见，扛得住事。'],
    中和: ['五气流通，主一生顺遂。', '五气流通，不是偏科命。']
  };

  var STRENGTH_ANXIETY = {
    偏弱: ['身弱不担财官。', '你是身弱担不起财官的盘，机会到了也接不住。'],
    偏强: ['身强无制，主刚愎。', '你身强无制，容易刚愎自用，把路走窄。'],
    中和: ['五行无主，随波逐流。', '看似平衡，其实没有一样是你的护身符。']
  };

  var YEAR_FLATTER = {
    比肩: '同辈托你一把，开口找人比一个人死磕有用。',
    劫财: '有人陪你冲，别一个人扛。',
    食神: '适合把日子过舒服，创作和表达都顺。',
    伤官: '表达和创造力被打开，适合把想法拿出来。',
    偏财: '财路活络，适合把该收的收回来。',
    正财: '踏实进账的一年。',
    七杀: '担子压过来，但也把你推上台面。',
    正官: '被看见的一年，适合担一点责任。',
    偏印: '适合学新东西、走偏门。',
    正印: '适合学习、沉淀，跟长辈老师多走动。'
  };

  var YEAR_ANXIETY = {
    比肩: '比肩争财，朋友之间容易有账算不清。',
    劫财: '劫财透干，破财、合伙生变、借贷要当心。',
    食神: '食神受制，有话说不出口。',
    伤官: '伤官见官，口舌是非，别跟上级硬碰。',
    偏财: '偏财不稳，投资、投机都容易翻车。',
    正财: '正财被劫，到手的钱容易飞。',
    七杀: '七杀攻身，压力从四面来。',
    正官: '正官临身，规矩压下来，动辄得咎。',
    偏印: '偏印夺食，想法憋成心结。',
    正印: '印星压身，想得多做得少，容易内耗。'
  };

  function dayAnxiety(f) {
    var m = f.pillars[1].zhi;
    var wx = f.dayWx;
    var monthWx = ZHI_WX[m];
    var season = SEASON[m];
    var state = monthWx === wx ? '得令' : (SHENG[monthWx] === wx ? '得生' : '失令');
    var line = {
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

  function pickSS(f) {
    var all = f.pillars.filter(function (p) { return p.label !== '日'; }).map(function (p) {
      return { ss: p.ganSS, gan: p.gan, where: p.label + '柱天干' };
    });
    var pri = ['七杀', '伤官', '劫财', '偏财', '正官', '正印', '食神', '比肩', '正财', '偏印'];
    var picked = [];
    pri.forEach(function (s) {
      if (picked.length >= 2) return;
      var hit = all.find(function (x) { return x.ss === s; });
      if (hit && !picked.some(function (p) { return p.ss === s; })) picked.push(hit);
    });
    return picked;
  }

  var PLAIN = {
    '甲木参天，脱胎要火。': '甲木像参天大树，需要火来疏通、催发。',
    '乙木虽柔，刲羊解牛。': '乙木虽然柔软，却能从土里钻出来。',
    '丙火猛烈，欺霜侮雪。': '丙火是太阳，势头猛烈，能压过霜雪。',
    '丁火柔中，内性昭融。': '丁火是灯烛，性情温和内敛，内里明亮。',
    '戊土固重，既中且正。': '戊土厚重稳固，居中守正。',
    '己土卑湿，中正蓄藏。': '己土低湿，性中正，能蓄藏万物。',
    '庚金带煞，刚健为最。': '庚金带肃杀之气，最为刚健。',
    '辛金软弱，温润而清。': '辛金柔软，温润清秀。',
    '壬水通河，能泄金气。': '壬水像大河，能泄掉金气。',
    '癸水至弱，达于天津。': '癸水极柔，却能升到天上变成雨露。',
    '印绶生身，主聪明多智。': '印星生扶日主，传统说法主聪明、好学。',
    '偏印有气，主机巧多能。': '偏印有力，主机灵、多才艺。',
    '比肩扶身，主自立。': '比肩帮扶日主，主能自立。',
    '劫财有制，主魄力。': '劫财被制住，主有魄力。',
    '食神有气胜财官。': '食神有力，传统上比财官还难得。',
    '伤官吐秀，主聪明。': '伤官把才华吐露出来，主聪明。',
    '正财归垣，主勤俭。': '正财归位，主勤俭持家。',
    '偏财有气，主豪爽。': '偏财有力，主豪爽大方。',
    '七杀有制化为权。': '七杀被制住，就能变成权柄。',
    '正官佩印，主贵。': '正官配印，传统上主贵气。',
    '印重身衰，反成滞碍。': '印星太重而日主弱，反而变成拖累。',
    '枭神夺食，主饥馑。': '偏印克食神，传统上主衣食有忧。',
    '比肩争财，兄弟不睦。': '比肩多了会争财，主兄弟朋友不和。',
    '劫财羊刃，破财伤妻。': '劫财羊刃，传统上主破财、伤妻。',
    '食神受制，主口舌。': '食神被压住，主口舌是非。',
    '伤官见官，为祸百端。': '伤官遇到正官，传统上主灾祸多。',
    '财逢劫刃，聚散无常。': '财遇到劫财羊刃，主聚散不定。',
    '偏财无制，主耗散。': '偏财不受制，主耗财。',
    '七杀攻身，无制则凶。': '七杀克身，没有制化就凶。',
    '官杀混杂，进退失据。': '正官七杀混杂，主进退两难。',
    '木主仁，曲直有度。': '木在五行里主仁，能屈能伸。',
    '火主礼，其性炎上。': '火主礼，性质向上。',
    '土主信，厚德载物。': '土主信，厚重能承载。',
    '金主义，锋锐有界。': '金主“义”，锋利、有边界。',
    '水主智，随物赋形。': '水主智，能随环境改变形状。',
    '身弱有印，赖印生扶。': '日主弱但有印星生扶，靠印星支撑。',
    '身强有制，主担当。': '日主强而有制，主能担当。',
    '五气流通，主一生顺遂。': '五行流通不偏，传统上主一生顺遂。',
    '桃花坐命，主风流俊雅。': '命带桃花，传统上主异性缘好、风度好。',
    '桃花带煞，风流成性。': '桃花与煞同柱，主感情纠葛多。'
  };

  function buildFlatter(f, years) {
    var out = [];
    out.push({ text: DM_FLATTER[f.dayGan][1], basis: '日主 ' + f.dayGan });
    pickSS(f).forEach(function (x) {
      out.push({ text: SS_FLATTER[x.ss][1], basis: x.where + ' ' + x.gan + ' · ' + x.ss });
    });
    var maxWx = WX_LIST.reduce(function (a, b) { return f.scores[a] >= f.scores[b] ? a : b; });
    out.push({ text: '你盘里最重的一笔是' + maxWx + '。' + WX_FLATTER[maxWx][1], basis: '五行 ' + maxWx + ' ' + fmt(f.scores[maxWx]) });
    out.push({ text: STRENGTH_FLATTER[f.strength.verdict][1], basis: '同类 ' + fmt(f.strength.same) + ' / 异类 ' + fmt(f.strength.other) });

    var good = years.filter(function (y) { return y.verdict === '吉'; })[0] || years.filter(function (y) { return y.verdict === '平'; })[0];
    if (good) {
      out.push({ text: good.year + ' ' + good.ganzhi + '年，' + good.ss + '到位，是这三十年里少有的顺风年。' + YEAR_FLATTER[good.ss], basis: '流年 ' + good.ganzhi + ' · ' + good.ss });
    }
    var dy = currentDayun(f);
    if (dy) {
      var dySS = shishen(f.dayGan, dy.ganzhi[0]);
      out.push({ text: dy.ganzhi + '大运，' + dySS + '当令。这十年，' + YEAR_FLATTER[dySS], basis: '大运 ' + dy.start_year + '–' + (dy.start_year + 9) + ' · ' + dySS });
    }
    if (f.peach.hits.length) {
      out.push({ text: '桃花落在' + f.peach.spots.join('、') + '，你的' + f.peach.hits.join('、') + '正踩在上面。异性缘不是等来的，是你走到哪儿都带着的。' + (f.peach.yearHit ? '今年流年又踩桃花，热闹。' : ''), basis: '桃花位 ' + f.peach.spots.join('、') });
    }
    return out;
  }

  function buildAnxiety(f, years) {
    var out = [];
    out.push({ text: dayAnxiety(f), basis: '日主 ' + f.dayGan + ' · ' + f.pillars[1].zhi + '月' });
    pickSS(f).forEach(function (x) {
      out.push({ text: SS_ANXIETY[x.ss][1], basis: x.where + ' ' + x.gan + ' · ' + x.ss });
    });
    var maxWx = WX_LIST.reduce(function (a, b) { return f.scores[a] >= f.scores[b] ? a : b; });
    out.push({ text: '你盘里' + maxWx + '压得最重。' + WX_ANXIETY[maxWx][1], basis: '五行 ' + maxWx + ' ' + fmt(f.scores[maxWx]) });
    out.push({ text: STRENGTH_ANXIETY[f.strength.verdict][1], basis: '同类 ' + fmt(f.strength.same) + ' / 异类 ' + fmt(f.strength.other) });

    var bad = years.filter(function (y) { return y.verdict === '凶'; })[0];
    if (bad) {
      out.push({ text: bad.year + ' ' + bad.ganzhi + '年，' + bad.ss + '临身。' + YEAR_ANXIETY[bad.ss], basis: '流年 ' + bad.ganzhi + ' · ' + bad.ss });
    }
    var dy = currentDayun(f);
    if (dy) {
      var dySS = shishen(f.dayGan, dy.ganzhi[0]);
      out.push({ text: dy.ganzhi + '大运，' + dySS + '压头。这十年，' + YEAR_ANXIETY[dySS], basis: '大运 ' + dy.start_year + '–' + (dy.start_year + 9) + ' · ' + dySS });
    }
    if (f.peach.hits.length) {
      out.push({ text: '桃花落在' + f.peach.spots.join('、') + '，命里带着，甩不掉。' + f.peach.hits.join('、') + '被桃花一冲，感情上的账最容易算不清。' + (f.peach.yearHit ? '今年流年又踩桃花，更要小心。' : ''), basis: '桃花位 ' + f.peach.spots.join('、') });
    }
    return out;
  }

  function buildQuotes(f) {
    var out = [];
    function add(q) { out.push({ q: q, plain: PLAIN[q] || '' }); }
    add(DM_FLATTER[f.dayGan][0]);
    pickSS(f).forEach(function (x) {
      add(SS_FLATTER[x.ss][0]);
      add(SS_ANXIETY[x.ss][0]);
    });
    var maxWx = WX_LIST.reduce(function (a, b) { return f.scores[a] >= f.scores[b] ? a : b; });
    add(WX_FLATTER[maxWx][0]);
    add(STRENGTH_FLATTER[f.strength.verdict][0]);
    if (f.peach.hits.length) {
      add('桃花坐命，主风流俊雅。');
      add('桃花带煞，风流成性。');
    }
    return out;
  }

  /* ---------- 渲染 ---------- */

  function wxBars(scores) {
    var max = Math.max.apply(null, WX_LIST.map(function (k) { return scores[k]; })) || 1;
    return WX_LIST.map(function (k) {
      var pct = Math.round((scores[k] / max) * 100);
      return '<div class="wx-row"><span>' + k + '</span><div class="wx-track"><div class="wx-fill" style="width:' + pct + '%"></div></div><span class="wx-val">' + fmt(scores[k]) + '</span></div>';
    }).join('');
  }

  function hourNote(alts) {
    if (!alts || alts.length < 2) return '';
    var cur = alts.find(function (a) { return a.current; }) || alts[0];
    var others = alts.filter(function (a) { return a !== cur; });
    var curGz = cur.pillar.gan + cur.pillar.zhi;
    var altGz = others.map(function (a) { return a.pillar.gan + a.pillar.zhi; }).join(' / ');
    return '<div class="hour-note"><strong>时柱可能不止一个</strong>当前时柱 <span class="alt">' + curGz + '</span>；若出生时间落在相邻时辰，可能是 <span class="alt">' + altGz + '</span>。日主、年月日三柱、大运、流年不受影响，只有时柱十神会变。</div>';
  }

  function render(f, alts) {
    document.getElementById('facts-sub').textContent =
      f.dateStr + ' ' + f.timeStr + ' · ' + f.gender + ' · 真太阳时 ' + (f.offset >= 0 ? '+' : '') + f.offset + ' 分 · 农历 ' + f.lunarText;

    var dyHtml = f.dayun.map(function (d) {
      var active = f.liunian.year >= d.start_year && f.liunian.year < d.start_year + 10;
      return '<div class="dy' + (active ? ' now' : '') + '"><b>' + d.ganzhi + '</b>' + d.start_age + '–' + d.end_age + '岁</div>';
    }).join('');

    var years = liunianList(f, f.liunian.year - 10, f.liunian.year + 19);
    var lnHtml = years.map(function (y) {
      var cls = (y.verdict === '吉' ? ' good' : (y.verdict === '凶' ? ' bad' : '')) +
        (y.year < f.liunian.year ? ' past' : '') +
        (y.year === f.liunian.year ? ' now' : '');
      return '<div class="ln' + cls + '"><b>' + y.year + '</b><span>' + y.ganzhi + '</span><i>' + y.ss + '</i><em>' + y.verdict + '</em></div>';
    }).join('');

    var peachText = f.peach.hits.length
      ? '桃花位 ' + f.peach.spots.join('、') + '；命带 ' + f.peach.hits.join('、') + (f.peach.yearHit ? '；今年流年踩桃花' : '')
      : '桃花位 ' + (f.peach.spots.join('、') || '—') + '；四柱未踩' + (f.peach.yearHit ? '；今年流年踩桃花' : '');

    document.getElementById('facts-body').innerHTML =
      '<div class="table-wrap"><table><thead><tr><th>柱</th><th>干支</th><th>天干十神</th><th>藏干</th><th>支十神</th><th>纳音</th></tr></thead><tbody>' +
      f.pillars.map(function (p) {
        return '<tr><td>' + p.label + '</td><td class="ganzhi">' + p.gan + p.zhi + '</td><td>' + p.ganSS + '</td><td>' + p.hide.join('') + '</td><td>' + p.zhiSS.join(' ') + '</td><td>' + p.nayin + '</td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div class="lower"><div><h3>五行加权</h3>' + wxBars(f.scores) +
      '<div class="verdict" style="margin-top:14px">' + f.strength.verdict +
      '<small>同类 ' + fmt(f.strength.same) + ' · 异类 ' + fmt(f.strength.other) + ' · ' + (f.strength.ratio * 100).toFixed(1) + '%</small></div></div>' +
      '<div><h3>大运 · 起运 ' + f.yunStart + '</h3><div class="dayun-scroll">' + dyHtml + '</div>' +
      '<h3 style="margin-top:14px">流年 ' + f.liunian.year + '</h3><div class="ganzhi" style="font-family:var(--font-mono);font-size:18px;font-weight:600;letter-spacing:.08em">' + f.liunian.ganzhi + '</div></div></div>' +
      '<div class="liunian-block"><h3>流年 · 过去十年 + 未来二十年</h3><div class="liunian-scroll">' + lnHtml + '</div><div class="peach">' + peachText + '</div></div>' +
      hourNote(alts);

    function lines(items) {
      return items.map(function (it) {
        return '<div class="line"><p>' + it.text + '</p><span class="basis">依据：' + it.basis + '</span></div>';
      }).join('');
    }
    function quoteLines(items) {
      return items.map(function (it) {
        return '<div class="line"><p class="quote-text">' + it.q + '</p><p class="quote-plain">' + it.plain + '</p></div>';
      }).join('');
    }
    document.getElementById('source-lines').innerHTML = quoteLines(buildQuotes(f));
    document.getElementById('flatter-lines').innerHTML = lines(buildFlatter(f, years));
    document.getElementById('anxiety-lines').innerHTML = lines(buildAnxiety(f, years));
  }

  function refresh() {
    var dateStr = document.getElementById('date').value;
    if (!dateStr) return;
    var timeStr = document.getElementById('time').value || '12:00';
    var gender = document.querySelector('#gender button.on').dataset.v;
    var lon = parseFloat(document.getElementById('city').value);
    var uncertain = document.getElementById('uncertain').checked;

    var f = compute(dateStr, timeStr, gender, lon, 0);
    var alts = uncertain ? hourCandidates(dateStr, timeStr, gender, lon) : null;
    render(f, alts);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { compute: compute, shishen: shishen, hourCandidates: hourCandidates, liunianList: liunianList, buildQuotes: buildQuotes, buildFlatter: buildFlatter, buildAnxiety: buildAnxiety };
  }

  if (typeof document !== 'undefined') {
    function showScreen(name) {
      ['cover', 'input', 'result'].forEach(function (n) {
        document.getElementById('screen-' + n).classList.toggle('active', n === name);
      });
      window.scrollTo(0, 0);
    }

    document.getElementById('start-btn').addEventListener('click', function () {
      showScreen('input');
    });

    document.getElementById('back-btn').addEventListener('click', function () {
      showScreen('input');
    });

    document.getElementById('form').addEventListener('submit', function (e) {
      e.preventDefault();
      refresh();
      showScreen('result');
    });

    ['date', 'time', 'city', 'uncertain'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', refresh);
    });

    document.querySelectorAll('#gender button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#gender button').forEach(function (b) { b.classList.remove('on'); });
        btn.classList.add('on');
        refresh();
      });
    });
  }
})();
