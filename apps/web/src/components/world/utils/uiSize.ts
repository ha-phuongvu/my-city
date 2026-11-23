import { useEffect } from "react";
import { UI_MONTH_VAR, UI_SIZE, UI_VAR } from "../constants/uiSize.constants";

export function useUiSize() {
  useEffect(() => {
    const U = UI_SIZE;
    const root = document.documentElement;
    const size = () => {
      const [w, h] = [window.innerWidth, window.innerHeight];
      if (!w || !h) return;
      const byWidth = U.least + ((1 - U.least) * (w - U.small)) / (U.full - U.small);
      const byHeight = (U.tall * h) / U.pile;
      const ui = Math.max(U.least, Math.min(1, byWidth, byHeight));
      const month = Math.max(
        U.smallest,
        Math.min(1, (h - U.cal * ui - U.edge) / U.month[1], (w - U.edge) / U.month[0]),
      );
      root.style.setProperty(UI_VAR, ui.toFixed(3));
      root.style.setProperty(UI_MONTH_VAR, month.toFixed(3));
    };
    size();
    window.addEventListener("resize", size);
    return () => {
      window.removeEventListener("resize", size);
      root.style.removeProperty(UI_VAR);
      root.style.removeProperty(UI_MONTH_VAR);
    };
  }, []);
}
