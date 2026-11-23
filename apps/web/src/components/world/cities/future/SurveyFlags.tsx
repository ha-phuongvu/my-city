"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Vector3 } from "three";
import { SURVEY_FLAGS } from "../../constants/fieldLayout.constants";
import { SurveyFlag } from "./SurveyFlag";
import { frameOf, prototypeMatrix } from "../../utils/prototype";
import {
  LEAD_STEP,
  PERIOD,
  PERIOD_STEP,
  SCALE,
} from "../../constants/cities/future/SurveyFlags.constants";

export function SurveyFlags() {
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const { scene } = useGLTF("/models/survey-flag.glb", "/draco/");
  const foot = useMemo(() => {
    const frame = frameOf(scene);
    return frame ? new Vector3(0, 0, 0.15).applyMatrix4(prototypeMatrix(frame)) : new Vector3();
  }, [scene]);
  return SURVEY_FLAGS.map((flag, i) => (
    <group key={i} position={[flag.x, 0, flag.z]} scale={SCALE}>
      <group position={[-foot.x, -foot.y, -foot.z]}>
        <SurveyFlag
          kind={flag.kind}
          period={PERIOD + i * PERIOD_STEP}
          lead={i * LEAD_STEP}
          speed={still ? 0 : 1}
        />
      </group>
    </group>
  ));
}
