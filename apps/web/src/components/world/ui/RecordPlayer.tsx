"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BACK, DECK, PLAYLIST, PlayState } from "../constants/ui/RecordPlayer.constants";
import "./RecordPlayer.css";
import { useStill } from "../utils/pointing";

export type PlayerWords = {
  label: string;
  playing: string;
  play: string;
  pause: string;
  previous: string;
  next: string;
  empty: string;
};

export function RecordPlayer({ words, start }: { words: PlayerWords; start: boolean }) {
  const still = useStill();
  const [song, setSong] = useState(0);
  const [state, setState] = useState(PlayState.Stopped);
  const audio = useRef<HTMLAudioElement | null>(null);
  const disc = useRef<SVGGElement>(null);
  const arm = useRef<SVGGElement>(null);

  const deck = useRef({
    angle: 0,
    vel: 0,
    armAt: DECK.arm.off as number,
    landing: 0,
    chose: false,
    raf: 0,
    last: 0,
  });
  const playing = useRef(false);

  const goOn = useRef(false);
  const current = PLAYLIST[song];

  const tick = useCallback(() => {
    const d = deck.current;
    if (d.raf) return;
    d.last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - d.last) / 1000);
      d.last = now;
      const a = audio.current;
      const on = playing.current;
      if (on && d.landing && now >= d.landing && a) {
        d.landing = 0;
        void a.play().catch(() => {});
      }
      const p = a && a.duration ? Math.min(1, a.currentTime / a.duration) : 0;
      const A = DECK.arm;
      const target = on ? A.start + (A.end - A.start) * p : A.off;

      d.armAt = still ? target : d.armAt + (target - d.armAt) * Math.min(1, dt / (DECK.swing / 3));
      const want = on && !still ? DECK.spin : 0;
      d.vel =
        want > d.vel
          ? Math.min(want, d.vel + (DECK.spin / DECK.spinUp) * dt)
          : Math.max(want, d.vel - (DECK.spin / DECK.spinDown) * dt);
      d.angle = (d.angle + d.vel * dt) % 360;
      disc.current?.setAttribute("transform", `rotate(${d.angle.toFixed(2)} 110 120)`);
      arm.current?.setAttribute("transform", `rotate(${d.armAt.toFixed(2)} 218 22)`);
      if (on || d.vel || Math.abs(d.armAt - target) > 0.05) d.raf = requestAnimationFrame(step);
      else d.raf = 0;
    };
    d.raf = requestAnimationFrame(step);
  }, [still]);

  const play = useCallback(() => {
    if (!audio.current || playing.current) return;
    playing.current = true;
    setState(PlayState.Playing);

    deck.current.landing = performance.now() + (still ? 0 : DECK.swing * 1000);
    tick();
  }, [still, tick]);

  const pause = () => {
    if (!playing.current) return;
    playing.current = false;
    deck.current.landing = 0;
    audio.current?.pause();
    setState(PlayState.Paused);
    tick();
  };

  const load = (i: number, go: boolean) => {
    audio.current?.pause();
    playing.current = false;

    if (i === song && audio.current) {
      audio.current.currentTime = 0;
      setState(PlayState.Stopped);
      if (go) play();
      else tick();
      return;
    }
    goOn.current = go;
    setSong(i);
    setState(PlayState.Stopped);
    tick();
  };
  useEffect(() => {
    if (!goOn.current) return;
    goOn.current = false;
    play();
  }, [song, play]);

  const skip = (d: number) => {
    const a = audio.current;
    if (!a || !PLAYLIST.length) return;
    const going = playing.current;
    if (d < 0 && a.currentTime > BACK) {
      a.currentTime = 0;
      return;
    }
    load((song + d + PLAYLIST.length) % PLAYLIST.length, going);
  };

  useEffect(() => {
    const d = deck.current;

    return () => {
      cancelAnimationFrame(d.raf);
      d.raf = 0;
      playing.current = false;
    };
  }, []);

  useEffect(() => {
    if (start && !deck.current.chose) play();
  }, [start, play]);

  return (
    <div
      className="rp-player"
      role="group"
      aria-label={state === PlayState.Playing ? words.playing : words.label}

      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {current && (
        <audio
          key={current.src}
          ref={audio}
          src={current.src}
          preload="auto"

          onEnded={() => load((song + 1) % PLAYLIST.length, true)}
        />
      )}
      <svg viewBox="0 0 240 236" aria-hidden="true">
        <g ref={disc}>
          <circle cx="110" cy="120" r="100" fill="#0d0d0f" />
          <circle cx="110" cy="120" r="88" fill="none" stroke="#3a3a3f" strokeWidth="5" />
          <circle cx="110" cy="120" r="74" fill="none" stroke="#3a3a3f" strokeWidth="4" />
          <circle cx="110" cy="120" r="94" fill="none" stroke="#202024" strokeWidth="1.2" />
          <circle cx="110" cy="120" r="81" fill="none" stroke="#202024" strokeWidth="1" />
          <circle cx="110" cy="120" r="66" fill="none" stroke="#202024" strokeWidth="1" />
          <circle cx="110" cy="120" r="30" fill="#8e3b3e" />
          <path
            d="M 110 98 A 22 22 0 0 1 131 113"
            fill="none"
            stroke="#c97a7a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 110 142 A 22 22 0 0 1 89 127"
            fill="none"
            stroke="#c97a7a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="110" cy="120" r="30" fill="none" stroke="#f4ece6" strokeWidth="2.5" />
        </g>
        <path d="M 110 20 A 100 100 0 0 1 110 220 Z" fill="#ffffff" opacity="0.07" />
        <path d="M 110 90 A 30 30 0 0 1 110 150 Z" fill="#ffffff" opacity="0.12" />
        <circle cx="110" cy="120" r="6.5" fill="#151515" stroke="#f4ece6" strokeWidth="1.5" />
        <g ref={arm} transform={`rotate(${DECK.arm.off} 218 22)`}>
          <line
            x1="218"
            y1="22"
            x2="158"
            y2="143"
            stroke="#9c7322"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <line
            x1="218"
            y1="22"
            x2="158"
            y2="143"
            stroke="#c39236"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect
            x="-9"
            y="-17"
            width="18"
            height="34"
            rx="9"
            fill="#b4862b"
            transform="translate(206 46) rotate(26.6)"
          />
          <rect
            x="-12"
            y="-19"
            width="24"
            height="38"
            rx="10"
            fill="#b4862b"
            stroke="#9c7322"
            strokeWidth="2"
            transform="translate(155 150) rotate(26.6)"
          />
          <circle cx="218" cy="22" r="13" fill="#9c7322" />
          <circle cx="218" cy="22" r="7" fill="#d6a849" />
        </g>
      </svg>
      <p className="rp-song" aria-live="polite">
        {current ? (
          <>
            {current.title}
            <small>{current.by ?? ""}</small>
          </>
        ) : (
          words.empty
        )}
      </p>
      <div className="rp-buttons">
        <button
          type="button"
          aria-label={words.previous}
          disabled={!current}
          onClick={() => skip(-1)}
        >
          <svg viewBox="0 0 14 14" aria-hidden="true">
            <rect x="2" y="2.6" width="2" height="8.8" rx="0.8" fill="currentColor" />
            <path
              d="M12 2.8 L5.2 7 L12 11.2 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="rp-main"
          aria-label={state === PlayState.Playing ? words.pause : words.play}
          disabled={!current}
          onClick={() => {
            deck.current.chose = true;
            if (playing.current) pause();
            else play();
          }}
        >
          <svg viewBox="0 0 14 14" aria-hidden="true">
            {state === PlayState.Playing ? (
              <>
                <rect x="2.8" y="2.2" width="3.1" height="9.6" rx="1" fill="currentColor" />
                <rect x="8.1" y="2.2" width="3.1" height="9.6" rx="1" fill="currentColor" />
              </>
            ) : (
              <path
                d="M4.2 2.2 L12.2 7 L4.2 11.8 Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>
        <button type="button" aria-label={words.next} disabled={!current} onClick={() => skip(1)}>
          <svg viewBox="0 0 14 14" aria-hidden="true">
            <rect x="10" y="2.6" width="2" height="8.8" rx="0.8" fill="currentColor" />
            <path
              d="M2 2.8 L8.8 7 L2 11.2 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
