import { Text, Pressable, View } from 'react-native';

export function SegmentedTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (value: T) => void; tabs: { value: T; label: string }[] }) {
  return (
    <View className="flex-row border-b border-border dark:border-border-dark">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return <Pressable key={tab.value} className={active ? 'flex-1 items-center border-b-2 border-blue-600 px-3 py-3 dark:border-blue-400' : 'flex-1 items-center border-b-2 border-transparent px-3 py-3'} onPress={() => onChange(tab.value)} accessibilityRole="tab" accessibilityState={{ selected: active }}><Text className={active ? 'text-sm font-semibold text-foreground dark:text-foreground-dark' : 'text-sm font-medium text-muted dark:text-muted-dark'}>{tab.label}</Text></Pressable>;
      })}
    </View>
  );
}
