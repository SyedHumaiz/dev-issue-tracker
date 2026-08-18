import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

interface EmptyStateProps {
  icon: MaterialIconName;
  title: string;
  subtitle: string;
  iconColor?: string;
  iconContainerClassName?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  iconColor = '#059669',
  iconContainerClassName = 'bg-emerald-50 dark:bg-emerald-950',
  compact = false,
}: EmptyStateProps) {
  return (
    <View
      className={`${compact ? 'mt-8 p-4' : 'mt-16 p-6'} items-center rounded-xl border border-border bg-surface dark:border-border-dark dark:bg-surface-dark`}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-full ${iconContainerClassName}`}>
        <MaterialIcons name={icon} size={21} color={iconColor} />
      </View>
      <Text className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">{title}</Text>
      <Text className="mt-1 text-center text-sm text-muted dark:text-muted-dark">{subtitle}</Text>
    </View>
  );
}
