"use client";

import { useMemo } from "react";
import { Barricade } from "./future/Barricade";
import { LedSign } from "./game/LedSign";
import { MusicStand } from "./music/MusicStand";
import { NameSign } from "./movie/NameSign";
import { Scroll } from "./story/Scroll";
import { signsAt } from "../utils/signLayout";
import { SignKind } from "../constants/signLayout.constants";

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
      case SignKind.Scroll:
        return (
          <Scroll
            key={sign.name}
            place={sign.place}
            inkPlace={sign.inkPlace}
            name={sign.name}
            sub={sign.sub}
          />
        );
      case SignKind.Stand:
        return <MusicStand key={sign.name} place={sign.place} name={sign.name} sub={sign.sub} />;
      case SignKind.Led:
        return <LedSign key={sign.name} place={sign.place} name={sign.name} sub={sign.sub} />;
      case SignKind.Board:
        return (
          <NameSign
            key={sign.name}
            place={sign.place}
            name={sign.name}
            sub={sign.sub}
            later={sign.later}
          />
        );
      case SignKind.Barricade:
        return <Barricade key={sign.name} place={sign.place} name={sign.name} sub={sign.sub} />;
    }
  });
}
