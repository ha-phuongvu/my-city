import { Dancing_Script } from "next/font/google";
import { DOTS } from "../constants/ui/Loading.constants";
import "./Loading.css";

const hand = Dancing_Script({ weight: "700", subsets: ["latin", "vietnamese"] });

export function Loading({
  label,
  progress,
  done,
}: {
  label: string;
  progress: number;
  done: boolean;
}) {
  const percent = Math.round(progress * 100);
  return (
    <div
      className={["ld-sheet", hand.className, done && "ld-done"].filter(Boolean).join(" ")}
      aria-hidden={done}
    >
      <div className="ld-row">
        <div
          className="ld-bar"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className="ld-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="ld-percent" aria-hidden="true">
          {percent}%
        </span>
      </div>
      <p className="ld-words" aria-hidden="true">
        {label}
        {Array.from({ length: DOTS }, (_, i) => (
          <span key={i} className="ld-dot" style={{ animationDelay: `${i * 0.18}s` }}>
            .
          </span>
        ))}
      </p>
    </div>
  );
}
