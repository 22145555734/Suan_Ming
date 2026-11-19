#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""排盘：只输出可查证的事实，不做任何解读、不掺任何评价词。

用法：
  python suan.py --date 1990-06-15 --time 14:30 --gender 男 --lon 116.4
  python suan.py --date 1990-06-15 --time 14:30 --json
"""
import argparse
import json
import sys
from datetime import datetime, timedelta

from lunar_python import Solar

sys.stdout.reconfigure(encoding="utf-8")

GAN_WX = {"甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
          "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水"}
SHENG = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}   # 我生
KE = {"木": "土", "土": "水", "水": "火", "火": "金", "金": "木"}       # 我克


def hide_weights(n):
    return {1: [1.0], 2: [0.7, 0.3], 3: [0.6, 0.25, 0.15]}[n]


def wuxing_scores(ec):
    """天干 1 分；地支按藏干加权（本气 .6 / 中气 .25 / 余气 .15，两藏干 .7/.3）。"""
    scores = {k: 0.0 for k in "木火土金水"}
    for gan in (ec.getYearGan(), ec.getMonthGan(), ec.getDayGan(), ec.getTimeGan()):
        if gan:
            scores[GAN_WX[gan]] += 1.0
    for hide in (ec.getYearHideGan(), ec.getMonthHideGan(),
                 ec.getDayHideGan(), ec.getTimeHideGan()):
        if not hide:
            continue
        for g, w in zip(hide, hide_weights(len(hide))):
            scores[GAN_WX[g]] += w
    return {k: round(v, 2) for k, v in scores.items()}


def strength(day_gan, scores):
    """简化强弱：同我 + 生我 = 同类；我生 + 我克 + 克我 = 异类。"""
    me = GAN_WX[day_gan]
    sheng_me = next(k for k, v in SHENG.items() if v == me)  # 生我的五行
    same = scores[me] + scores[sheng_me]
    other = sum(v for k, v in scores.items() if k not in (me, sheng_me))
    total = same + other or 1
    ratio = same / total
    verdict = "偏强" if ratio > 0.5 else ("偏弱" if ratio < 0.4 else "中和")
    return {
        "day_master": day_gan, "element": me,
        "same": round(same, 2), "other": round(other, 2),
        "ratio": round(ratio, 3), "verdict": verdict,
    }


def pillar(label, gan, zhi, gan_ss, hide, zhi_ss, nayin):
    return {
        "label": label, "gan": gan, "zhi": zhi,
        "gan_shishen": gan_ss, "hide_gan": hide, "zhi_shishen": zhi_ss,
        "nayin": nayin,
    }


def build(date_str, time_str, gender, lon):
    y, m, d = map(int, date_str.split("-"))
    if time_str:
        hh, mm = map(int, time_str.split(":"))
    else:
        hh, mm = 12, 0

    # 真太阳时：以东经 120° 为基准，每差 1° 差 4 分钟（不含均时差）
    offset_min = round((lon - 120.0) * 4) if lon is not None else 0
    dt = datetime(y, m, d, hh, mm) + timedelta(minutes=offset_min)
    # 时辰边界是 23,1,3,5… 点，用 (h+1)//2 判断分段
    crossed = ((dt.hour + 1) // 2) != ((hh + 1) // 2) if time_str else False

    solar = Solar.fromYmdHms(dt.year, dt.month, dt.day, dt.hour, dt.minute, 0)
    lunar = solar.getLunar()
    ec = lunar.getEightChar()

    pillars = [
        pillar("年", ec.getYearGan(), ec.getYearZhi(), ec.getYearShiShenGan(),
               ec.getYearHideGan(), ec.getYearShiShenZhi(), ec.getYearNaYin()),
        pillar("月", ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthShiShenGan(),
               ec.getMonthHideGan(), ec.getMonthShiShenZhi(), ec.getMonthNaYin()),
        pillar("日", ec.getDayGan(), ec.getDayZhi(), "日主",
               ec.getDayHideGan(), ec.getDayShiShenZhi(), ec.getDayNaYin()),
        pillar("时", ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeShiShenGan(),
               ec.getTimeHideGan(), ec.getTimeShiShenZhi(), ec.getTimeNaYin()),
    ]

    scores = wuxing_scores(ec)
    st = strength(ec.getDayGan(), scores)

    yun = ec.getYun(1 if gender == "男" else 0)
    dayun = []
    for d_ in yun.getDaYun():
        dayun.append({
            "start_year": d_.getStartYear(), "ganzhi": d_.getGanZhi(),
            "start_age": d_.getStartAge(), "end_age": d_.getEndAge(),
        })
        if len(dayun) >= 9:
            break

    now = datetime.now()
    liunian_solar = Solar.fromYmd(now.year, 6, 1)
    liunian = liunian_solar.getLunar().getYearInGanZhiExact()

    return {
        "input": {
            "solar": f"{y:04d}-{m:02d}-{d:02d}", "time": time_str or "未知(按12:00)",
            "gender": gender, "longitude": lon,
            "true_solar_correction_min": offset_min,
            "hour_branch_changed": crossed,
        },
        "calendar": {
            "lunar": f"{lunar.getYearInChinese()}年{lunar.getMonthInChinese()}月{lunar.getDayInChinese()}",
            "prev_jieqi": lunar.getPrevJieQi().getName(),
            "prev_jieqi_time": lunar.getPrevJieQi().getSolar().toYmdHms(),
        },
        "pillars": pillars,
        "wuxing": scores,
        "strength": st,
        "dayun": {"start": f"{yun.getStartYear()}年{yun.getStartMonth()}个月",
                  "list": dayun},
        "liunian_now": {"year": now.year, "ganzhi": liunian},
    }


def render(r):
    i, c, st = r["input"], r["calendar"], r["strength"]
    out = []
    out.append("【输入】公历 %s %s，%s，经度 %s，真太阳时修正 %+d 分" % (
        i["solar"], i["time"], i["gender"], i["longitude"],
        i["true_solar_correction_min"]))
    if i["hour_branch_changed"]:
        out.append("  注意：真太阳时修正跨过时辰边界，时柱以修正后为准。")
    out.append("【历法】农历 %s；上一节气 %s %s" % (
        c["lunar"], c["prev_jieqi"], c["prev_jieqi_time"]))
    out.append("【四柱】")
    for p in r["pillars"]:
        out.append("  %s柱 %s%s | 天干十神:%s | 藏干:%s | 支十神:%s | 纳音:%s" % (
            p["label"], p["gan"], p["zhi"], p["gan_shishen"],
            "".join(p["hide_gan"]), " ".join(p["zhi_shishen"]), p["nayin"]))
    w = r["wuxing"]
    out.append("【五行】木%.2f 火%.2f 土%.2f 金%.2f 水%.2f（天干1分，地支藏干加权）" % (
        w["木"], w["火"], w["土"], w["金"], w["水"]))
    out.append("【日主】%s%s；同类 %.2f / 异类 %.2f（%.1f%%）→ %s（简化判定）" % (
        st["day_master"], st["element"], st["same"], st["other"],
        st["ratio"] * 100, st["verdict"]))
    out.append("【大运】起运 %s" % r["dayun"]["start"])
    for d in r["dayun"]["list"]:
        gz = d["ganzhi"] or "（起运前）"
        out.append("  %s 起 %s 岁  %s" % (d["start_year"], d["start_age"], gz))
    out.append("【流年】%d 年 %s" % (r["liunian_now"]["year"], r["liunian_now"]["ganzhi"]))
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="公历 YYYY-MM-DD")
    ap.add_argument("--time", default=None, help="HH:MM，缺省按 12:00 排（时柱不可信）")
    ap.add_argument("--gender", default="男", choices=["男", "女"])
    ap.add_argument("--lon", type=float, default=120.0, help="出生地经度，默认 120")
    ap.add_argument("--json", action="store_true", help="输出 JSON")
    a = ap.parse_args()

    r = build(a.date, a.time, a.gender, a.lon)
    print(json.dumps(r, ensure_ascii=False, indent=2) if a.json else render(r))


if __name__ == "__main__":
    main()
