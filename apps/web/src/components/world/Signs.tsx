"use client";

import { useMemo } from "react";
import { Barricade } from "./models/Barricade";
import { LedSign } from "./models/LedSign";
import { MusicStand } from "./models/MusicStand";
import { NameSign } from "./models/NameSign";
import { Scroll } from "./models/Scroll";
import { signsAt } from "./signLayout";

/**
 * The cities' name signs on their lawns, and the barricade at the future-city plot, as on the
 * prototype's map: Story City's scroll (its quill writes the name again when pointed at), Music
 * City's music stand (plays its tune), Game City's LED board (the name runs across it), Movie
 * City's wooden sign, and the barricade (its lamps blink).
 */
export function Signs() {
  const signs = useMemo(() => signsAt(), []);
  return signs.map((sign) => {
    switch (sign.kind) {
      case "scroll":
        return <Scroll key={sign.name} place={sign.place} inkPlace={sign.inkPlace} name={sign.name} sub={sign.sub} />;
      case "stand":
        return <MusicStand key={sign.name} place={sign.place} name={sign.name} sub={sign.sub} />;
      case "led":
        return <LedSign key={sign.name} place={sign.place} name={sign.name} sub={sign.sub} />;
      case "board":
        return <NameSign key={sign.name} place={sign.place} name={sign.name} sub={sign.sub} later={sign.later} />;
      case "barricade":
        return <Barricade key={sign.name} place={sign.place} name={sign.name} sub={sign.sub} />;
    }
  });
}
