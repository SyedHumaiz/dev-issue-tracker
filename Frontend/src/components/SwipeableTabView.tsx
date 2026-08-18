import { PanResponder, View } from 'react-native';
import { ReactNode, useMemo } from 'react';

export function SwipeableTabView({ activeIndex, tabCount, onChange, children }: {
  activeIndex: number;
  tabCount: number;
  onChange: (index: number) => void;
  children: ReactNode;
}) {
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderRelease: (_, gesture) => {
      const isSwipe = Math.abs(gesture.dx) > 56 || Math.abs(gesture.vx) > 0.45;
      if (!isSwipe) return;
      if (gesture.dx < 0 && activeIndex < tabCount - 1) onChange(activeIndex + 1);
      if (gesture.dx > 0 && activeIndex > 0) onChange(activeIndex - 1);
    },
  }), [activeIndex, onChange, tabCount]);

  return <View className="flex-1" {...panResponder.panHandlers}>{children}</View>;
}
