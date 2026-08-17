import { Text, TouchableOpacity, View } from 'react-native';

export function SegmentedTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (value: T) => void; tabs: { value: T; label: string }[] }) {
  return (
    <View className="flex-row border-b border-border dark:border-border-dark">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return <TouchableOpacity key={tab.value} className={`flex-1 items-center px-3 py-3 ${active ? 'border-b-2 border-blue-600 dark:border-blue-400' : 'border-b-2 border-transparent'}`} onPress={() => onChange(tab.value)} activeOpacity={0.7} accessibilityRole="tab" accessibilityState={{ selected: active }}><Text className={`text-sm ${active ? 'font-semibold text-foreground dark:text-foreground-dark' : 'font-medium text-muted dark:text-muted-dark'}`}>{tab.label}</Text></TouchableOpacity>;
      })}
    </View>
  );
}
