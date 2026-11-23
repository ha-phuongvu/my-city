"use client";

import { Dancing_Script } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import { Language } from "@/i18n/language";
import { KeyName } from "../constants/keys.constants";
import "./Calendar.css";
import { CHECK_EVERY, DATE_LOCALES, SNOW_CAP, TEAR_MS } from "../constants/ui/Calendar.constants";
import { isWinter } from "../utils/season";

const hand = Dancing_Script({ weight: "700", subsets: ["latin", "vietnamese"] });

export type CalendarWords = { open: string; previous: string; next: string; today: string };

const same = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function weeksOf(shown: Date) {
  const lead = (shown.getDay() + 6) % 7;
  const start = new Date(shown.getFullYear(), shown.getMonth(), 1 - lead);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const first = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7);
    if (w > 3 && first.getMonth() !== shown.getMonth()) break;
    weeks.push(
      Array.from(
        { length: 7 },
        (_, k) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + k),
      ),
    );
  }
  return weeks;
}

function Page({ day, locale, className }: { day: Date; locale: string; className: string }) {
  return (
    <span className={className}>
      <span className="cal-weekday">{day.toLocaleDateString(locale, { weekday: "long" })}</span>
      <span className={`cal-date ${hand.className}`}>{day.getDate()}</span>
      <span className="cal-month">
        {day.toLocaleDateString(locale, { month: "long", year: "numeric" })}
      </span>
    </span>
  );
}

export function Calendar({ words, language }: { words: CalendarWords; language: Language }) {
  const locale = DATE_LOCALES[language];
  const [day, setDay] = useState(() => new Date());
  const [torn, setTorn] = useState<Date | null>(null);
  const [shown, setShown] = useState<Date | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const open = shown !== null;

  const shownDay = useRef(day);
  useEffect(() => {
    const check = () => {
      const now = new Date();
      if (same(now, shownDay.current)) return;
      setTorn(shownDay.current);
      shownDay.current = now;
      setDay(now);
      setShown((month) => (month ? new Date(now.getFullYear(), now.getMonth(), 1) : month));
    };
    const timer = setInterval(check, CHECK_EVERY);
    const seen = () => !document.hidden && check();
    document.addEventListener("visibilitychange", seen);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", seen);
    };
  }, []);
  useEffect(() => {
    if (!torn) return;
    const timer = setTimeout(() => setTorn(null), TEAR_MS);
    return () => clearTimeout(timer);
  }, [torn]);

  useEffect(() => {
    if (!open) return;
    title.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key !== KeyName.Escape) return;
      setShown(null);
      button.current?.focus();
    };
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setShown(null);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, [open]);

  const monthOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const today = new Date();

  const weekdays = Array.from({ length: 7 }, (_, k) => new Date(2024, 0, 1 + k));
  const whole = day.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      ref={box}
      className={open ? "cal-box cal-open" : "cal-box"}

      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <span className="cal-strings" aria-hidden="true">
        <i />
        <i />
      </span>
      {isWinter() && (
        <span className="cal-snow" aria-hidden="true">
          <svg viewBox="0 0 128 17" preserveAspectRatio="none">
            <path d={SNOW_CAP.snow} fill={SNOW_CAP.colors.snow} />
            <path
              d={SNOW_CAP.lit}
              fill="none"
              stroke={SNOW_CAP.colors.lit}
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path
              d={SNOW_CAP.shade}
              fill="none"
              stroke={SNOW_CAP.colors.shade}
              strokeWidth="0.9"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      <button
        ref={button}
        type="button"
        className="cal-cal"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={words.open.replace("{date}", whole)}
        onClick={() => setShown(open ? null : monthOf(day))}
      >
        <span className="cal-top" aria-hidden="true">
          <i />
          <i />
        </span>
        <span className="cal-sheet">
          <Page day={day} locale={locale} className="cal-page" />
          {torn && <Page day={torn} locale={locale} className="cal-page cal-tear" />}
        </span>
        <span className="cal-stack" aria-hidden="true" />
      </button>
      {shown && (
        <div className="cal-popup" role="dialog" aria-labelledby="calendar-month">
          <div className="cal-head">
            <button
              type="button"
              aria-label={words.previous}
              onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <h3 id="calendar-month" ref={title} tabIndex={-1} className={hand.className}>
              {shown.toLocaleDateString(locale, { month: "long", year: "numeric" })}
            </h3>
            <button
              type="button"
              aria-label={words.next}
              onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>
          <table className="cal-grid">
            <thead>
              <tr>
                {weekdays.map((d) => (
                  <th
                    key={d.getDay()}
                    scope="col"
                    abbr={d.toLocaleDateString(locale, { weekday: "long" })}
                  >
                    {language === Language.English
                      ? d.toLocaleDateString(locale, { weekday: "short" }).slice(0, 2)
                      : d.toLocaleDateString(locale, { weekday: "narrow" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeksOf(shown).map((week) => (
                <tr key={week[0].toISOString()}>
                  {week.map((d) => {
                    const other = d.getMonth() !== shown.getMonth();
                    const now = !other && same(d, today);
                    return (
                      <td
                        key={d.toISOString()}
                        className={other ? "cal-other" : now ? "cal-today" : undefined}
                        aria-current={now ? "date" : undefined}
                      >
                        <span>{d.getDate()}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cal-foot">
            <button type="button" onClick={() => setShown(monthOf(new Date()))}>
              {words.today}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
