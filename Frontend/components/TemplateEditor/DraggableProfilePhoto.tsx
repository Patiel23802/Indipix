import React, { useRef, useEffect, useState } from 'react';
import { Image, Animated, PanResponder } from 'react-native';
import { COLORS } from '@/constants/colors';

interface DraggableProfilePhotoProps {
  photoUri: string;
  position: { x: number; y: number };
  size: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdatePosition: (x: number, y: number) => void;
  onUpdateSize: (size: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  onError: () => void;
}

const MIN_SIZE = 40;
const MAX_SIZE = 300;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));

// Prefer __getValue when available (it is in RN Animated), but keep safe fallback.
const readAnimated = (v: Animated.Value, fallback: number) => {
  // @ts-ignore
  if (typeof v.__getValue === 'function') return v.__getValue();
  return fallback;
};

export function DraggableProfilePhoto({
  photoUri,
  position,
  size,
  isSelected,
  onSelect,
  onUpdatePosition,
  onUpdateSize,
  canvasWidth,
  canvasHeight,
  onError,
}: DraggableProfilePhotoProps) {
  // Use transforms for smoother movement (vs left/top)
  const posX = useRef(new Animated.Value(position.x)).current;
  const posY = useRef(new Animated.Value(position.y)).current;
  const animatedSize = useRef(new Animated.Value(size)).current;

  // Base (committed) values — refs so we don't re-render during gestures
  const baseX = useRef(position.x);
  const baseY = useRef(position.y);
  const baseSize = useRef(size);

  // Gesture refs (avoid setState during gesture = smoother)
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const isPinchingRef = useRef(false);

  // Pinch bookkeeping
  const initialPinchDistanceRef = useRef<number | null>(null);
  const pinchStartSizeRef = useRef(size);

  // Resize-handle bookkeeping
  const resizeStartSizeRef = useRef(size);

  // (Optional) local state only for debugging/UI; not required for smoothness
  const [, setGestureTick] = useState(0);

  const getDistance = (t1: any, t2: any) => {
    const dx = t2.pageX - t1.pageX;
    const dy = t2.pageY - t1.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const clampPositionToBounds = (x: number, y: number, s: number) => {
    const maxX = Math.max(0, canvasWidth - s);
    const maxY = Math.max(0, canvasHeight - s);
    return { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) };
  };

  const commit = () => {
    const finalSize = clamp(readAnimated(animatedSize, baseSize.current), MIN_SIZE, MAX_SIZE);
    const rawX = readAnimated(posX, baseX.current);
    const rawY = readAnimated(posY, baseY.current);

    const { x, y } = clampPositionToBounds(rawX, rawY, finalSize);

    baseSize.current = finalSize;
    baseX.current = x;
    baseY.current = y;

    // Snap animated values to committed/clamped values
    animatedSize.setValue(finalSize);
    posX.setValue(x);
    posY.setValue(y);

    // Commit once to parent
    onUpdateSize(finalSize);
    onUpdatePosition(x, y);
  };

  // Sync from props → animated values when NOT interacting
  useEffect(() => {
    if (!isDraggingRef.current && !isResizingRef.current && !isPinchingRef.current) {
      baseX.current = position.x;
      baseY.current = position.y;
      posX.setValue(position.x);
      posY.setValue(position.y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.x, position.y]);

  useEffect(() => {
    if (!isResizingRef.current && !isPinchingRef.current) {
      baseSize.current = size;
      animatedSize.setValue(size);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // Main drag + pinch responder
  const dragPanResponder = useRef(
    PanResponder.create({
      // Capture early (helps inside ScrollView / other responders)
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches?.length === 2) return true;
        return Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2;
      },
      onMoveShouldSetPanResponderCapture: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches?.length === 2) return true;
        return false;
      },
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        onSelect();

        const touches = evt.nativeEvent.touches;
        if (touches?.length === 2) {
          // Pinch started with 2 fingers down immediately
          isPinchingRef.current = true;
          initialPinchDistanceRef.current = getDistance(touches[0], touches[1]);
          pinchStartSizeRef.current = baseSize.current;
          return;
        }

        // Drag start (single finger)
        isDraggingRef.current = true;
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;

        // ✅ Pinch can start mid-gesture when second finger comes down
        if (touches?.length === 2) {
          if (!isPinchingRef.current || initialPinchDistanceRef.current == null) {
            isPinchingRef.current = true;
            isDraggingRef.current = false;

            // Initialize pinch baseline from current animated size
            initialPinchDistanceRef.current = getDistance(touches[0], touches[1]);
            pinchStartSizeRef.current = clamp(
              readAnimated(animatedSize, baseSize.current),
              MIN_SIZE,
              MAX_SIZE
            );
          }

          const currentDistance = getDistance(touches[0], touches[1]);
          const scale = currentDistance / (initialPinchDistanceRef.current || currentDistance);
          const nextSize = clamp(pinchStartSizeRef.current * scale, MIN_SIZE, MAX_SIZE);

          animatedSize.setValue(nextSize);

          // Keep within bounds while resizing
          const { x, y } = clampPositionToBounds(baseX.current, baseY.current, nextSize);
          posX.setValue(x);
          posY.setValue(y);

          return;
        }

        // If pinch ended (back to one finger), finalize pinch but don't jump
        if (isPinchingRef.current && touches?.length === 1) {
          isPinchingRef.current = false;
          initialPinchDistanceRef.current = null;

          // Commit size once (position will be committed on release)
          const finalSize = clamp(readAnimated(animatedSize, baseSize.current), MIN_SIZE, MAX_SIZE);
          baseSize.current = finalSize;
          onUpdateSize(finalSize);
        }

        // Normal drag
        if (!isPinchingRef.current && isDraggingRef.current) {
          const currentSize = clamp(readAnimated(animatedSize, baseSize.current), MIN_SIZE, MAX_SIZE);
          const { x, y } = clampPositionToBounds(baseX.current + gs.dx, baseY.current + gs.dy, currentSize);
          posX.setValue(x);
          posY.setValue(y);
        }

        // Optional: force a tiny render tick for debugging; can remove
        // setGestureTick(t => t + 1);
      },

      onPanResponderRelease: () => {
        // Update base position from animated values then commit once
        baseX.current = readAnimated(posX, baseX.current);
        baseY.current = readAnimated(posY, baseY.current);

        isDraggingRef.current = false;
        isPinchingRef.current = false;
        initialPinchDistanceRef.current = null;

        commit();
      },

      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        isPinchingRef.current = false;
        initialPinchDistanceRef.current = null;

        commit();
      },
    })
  ).current;

  // Resize handle responder (bottom-right)
  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        onSelect();
        isResizingRef.current = true;
        resizeStartSizeRef.current = clamp(readAnimated(animatedSize, baseSize.current), MIN_SIZE, MAX_SIZE);
      },

      onPanResponderMove: (_, gs) => {
        const delta = (gs.dx + gs.dy) / 2;
        const nextSize = clamp(resizeStartSizeRef.current + delta, MIN_SIZE, MAX_SIZE);
        animatedSize.setValue(nextSize);

        const { x, y } = clampPositionToBounds(baseX.current, baseY.current, nextSize);
        posX.setValue(x);
        posY.setValue(y);
      },

      onPanResponderRelease: () => {
        isResizingRef.current = false;
        commit();
      },

      onPanResponderTerminate: () => {
        isResizingRef.current = false;
        commit();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ translateX: posX }, { translateY: posY }],
        width: animatedSize,
        height: animatedSize,
      }}
      {...dragPanResponder.panHandlers}
    >
      <Animated.View
        style={{
          width: animatedSize,
          height: animatedSize,
          borderRadius: Animated.divide(animatedSize, 2),
          overflow: 'hidden',
          borderWidth: isSelected ? 3 : 0,
          borderColor: isSelected ? '#fbbf24' : 'transparent',
          borderStyle: 'solid',
          backgroundColor: 'transparent',
        }}
      >
        <Image
          source={{ uri: photoUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={onError}
        />
      </Animated.View>

      {isSelected && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: -12,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#fbbf24',
            borderWidth: 2,
            borderColor: COLORS.white,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 6,
          }}
          {...resizePanResponder.panHandlers}
        />
      )}
    </Animated.View>
  );
}
