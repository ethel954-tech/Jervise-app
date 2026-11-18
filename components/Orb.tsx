import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

const AG = Animated.createAnimatedComponent(G);

// Rotation durations (ms) for the three ring groups, per state.
const SPEED: Record<OrbState, [number, number, number]> = {
  idle: [30000, 22000, 18000],
  listening: [14000, 10000, 8000],
  thinking: [4000, 3000, 2000],
  speaking: [10000, 8000, 6000],
};

type Props = { state: OrbState; size?: number; onPress?: () => void };

export default function Orb({ state, size = 260, onPress }: Props) {
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const beat = useSharedValue(1);

  useEffect(() => {
    const [d1, d2, d3] = SPEED[state];
    const spin = (v: typeof r1, duration: number, dir: 1 | -1) => {
      cancelAnimation(v);
      const start = v.value;
      v.value = withRepeat(
        withTiming(start + 360 * dir, { duration, easing: Easing.linear }),
        -1,
        false
      );
    };
    spin(r1, d1, 1);
    spin(r2, d2, -1);
    spin(r3, d3, 1);

    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    if (state === "listening" || state === "speaking") {
      const dur = state === "listening" ? 1800 : 1200;
      pulseScale.value = 1;
      pulseOpacity.value = 0.8;
      pulseScale.value = withRepeat(withTiming(1.9, { duration: dur }), -1, false);
      pulseOpacity.value = withRepeat(withTiming(0, { duration: dur }), -1, false);
    } else {
      pulseOpacity.value = 0;
    }

    cancelAnimation(beat);
    if (state === "speaking") {
      beat.value = withRepeat(
        withSequence(withTiming(1.07, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1,
        false
      );
    } else {
      beat.value = withTiming(1, { duration: 200 });
    }
  }, [state]);

  const p1 = useAnimatedProps(() => ({ rotation: r1.value, originX: 150, originY: 150 }));
  const p2 = useAnimatedProps(() => ({ rotation: r2.value, originX: 150, originY: 150 }));
  const p3 = useAnimatedProps(() => ({ rotation: r3.value, originX: 150, originY: 150 }));
  const pp = useAnimatedProps(() => ({
    scale: pulseScale.value,
    opacity: pulseOpacity.value,
    originX: 150,
    originY: 150,
  }));
  const pc = useAnimatedProps(() => ({ scale: beat.value, originX: 150, originY: 150 }));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Talk to Jarvis">
      <Svg width={size} height={size} viewBox="0 0 300 300">
        <Circle cx={150} cy={150} r={143} fill="none" stroke="#818CF8" strokeWidth={1} opacity={0.7} />
        <AG animatedProps={p1 as any}>
          <Circle cx={150} cy={150} r={132} fill="none" stroke="#E0E7FF" strokeWidth={7} strokeDasharray="1.5 9" opacity={0.8} />
        </AG>
        <AG animatedProps={p2 as any}>
          <Circle cx={150} cy={150} r={116} fill="none" stroke="#A5B4FC" strokeWidth={4} strokeDasharray="130 40 60 50 20 60" />
        </AG>
        <AG animatedProps={p3 as any}>
          <Circle cx={150} cy={150} r={100} fill="none" stroke="#E0E7FF" strokeWidth={1.5} strokeDasharray="5 7" opacity={0.9} />
        </AG>
        <AG animatedProps={p2 as any}>
          <Circle cx={150} cy={150} r={88} fill="none" stroke="#FFFFFF" strokeWidth={6} strokeDasharray="80 473" />
        </AG>
        <AG animatedProps={pp as any}>
          <Circle cx={150} cy={150} r={62} fill="none" stroke="#E0E7FF" strokeWidth={2} />
        </AG>
        <AG animatedProps={pc as any}>
          <Circle cx={150} cy={150} r={66} fill="#312E81" stroke="#E0E7FF" strokeWidth={2} />
          <Circle cx={150} cy={150} r={54} fill="#4F46E5" />
          <SvgText x={150} y={155} textAnchor="middle" fontSize={14} fontWeight="500" letterSpacing={3} fill="#FFFFFF">
            JARVIS
          </SvgText>
        </AG>
      </Svg>
    </Pressable>
  );
}
