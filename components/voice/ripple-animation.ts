/**
 * Ripple Animation Factory
 *
 * Creates animated ripple effects for the voice recording button.
 * Manages three concentric pulse rings with staggered timing.
 */

import {
  SharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";

export interface RippleAnimationValues {
  pulseScale1: SharedValue<number>;
  pulseScale2: SharedValue<number>;
  pulseScale3: SharedValue<number>;
  pulseOpacity1: SharedValue<number>;
  pulseOpacity2: SharedValue<number>;
  pulseOpacity3: SharedValue<number>;
  micScale: SharedValue<number>;
}

/**
 * Start the pulsing ripple animation
 * Creates three concentric rings that pulse outward
 */
export function startPulseAnimation(values: RippleAnimationValues): void {
  const { pulseScale1, pulseScale2, pulseScale3, pulseOpacity1, pulseOpacity2, pulseOpacity3, micScale } = values;

  // Ripple 1
  pulseScale1.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) })
    ),
    -1,
    false
  );
  pulseOpacity1.value = withRepeat(
    withSequence(
      withTiming(0.5, { duration: 0 }),
      withTiming(0, { duration: 1200 })
    ),
    -1,
    false
  );

  // Ripple 2 (delayed)
  pulseScale2.value = withRepeat(
    withDelay(
      400,
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) })
      )
    ),
    -1,
    false
  );
  pulseOpacity2.value = withRepeat(
    withDelay(
      400,
      withSequence(
        withTiming(0.4, { duration: 0 }),
        withTiming(0, { duration: 1200 })
      )
    ),
    -1,
    false
  );

  // Ripple 3 (more delayed)
  pulseScale3.value = withRepeat(
    withDelay(
      800,
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) })
      )
    ),
    -1,
    false
  );
  pulseOpacity3.value = withRepeat(
    withDelay(
      800,
      withSequence(
        withTiming(0.3, { duration: 0 }),
        withTiming(0, { duration: 1200 })
      )
    ),
    -1,
    false
  );

  // Mic pulse
  micScale.value = withRepeat(
    withSequence(
      withTiming(1.05, { duration: 300 }),
      withTiming(1, { duration: 300 })
    ),
    -1,
    false
  );
}

/**
 * Stop the pulsing animation and reset to initial values
 */
export function stopPulseAnimation(values: RippleAnimationValues): void {
  const { pulseScale1, pulseScale2, pulseScale3, pulseOpacity1, pulseOpacity2, pulseOpacity3, micScale } = values;

  cancelAnimation(pulseScale1);
  cancelAnimation(pulseScale2);
  cancelAnimation(pulseScale3);
  cancelAnimation(pulseOpacity1);
  cancelAnimation(pulseOpacity2);
  cancelAnimation(pulseOpacity3);
  cancelAnimation(micScale);

  pulseScale1.value = 1;
  pulseScale2.value = 1;
  pulseScale3.value = 1;
  pulseOpacity1.value = 0.4;
  pulseOpacity2.value = 0.3;
  pulseOpacity3.value = 0.2;
  micScale.value = 1;
}

/**
 * Custom hook to create animated styles for the ripple rings
 * Named with "use" prefix to comply with React hooks rules
 */
export function useRippleStyles(values: RippleAnimationValues) {
  const pulseStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: values.pulseScale1.value }],
    opacity: values.pulseOpacity1.value,
  }));

  const pulseStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: values.pulseScale2.value }],
    opacity: values.pulseOpacity2.value,
  }));

  const pulseStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: values.pulseScale3.value }],
    opacity: values.pulseOpacity3.value,
  }));

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: values.micScale.value }],
  }));

  return { pulseStyle1, pulseStyle2, pulseStyle3, micAnimatedStyle };
}
