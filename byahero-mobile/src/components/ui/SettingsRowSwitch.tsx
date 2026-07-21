import React from 'react';
import { View, Text, Switch } from 'react-native';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';

interface SettingsRowSwitchProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  iconName?: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor?: string;
  isLast?: boolean;
  containerStyle?: any;
}

export function SettingsRowSwitch({
  title,
  description,
  value,
  onValueChange,
  iconName,
  iconColor = '#1e3a8a',
  isLast = true,
  containerStyle
}: SettingsRowSwitchProps) {
  return (
    <View style={[
      tw`flex-row items-center justify-between p-4`,
      !isLast && tw`border-b border-slate-100`,
      containerStyle
    ]}>
      <View style={tw`flex-row items-center flex-1 mr-4`}>
        {iconName && (
          <View style={[tw`w-10 h-10 rounded-2xl justify-center items-center mr-3.5`, { backgroundColor: iconColor + '15' }]}>
            <MaterialIcons name={iconName} size={20} color={iconColor} />
          </View>
        )}
        <View style={tw`flex-1`}>
          <Text style={tw`text-sm font-semibold text-slate-700`}>{title}</Text>
          <Text style={tw`text-xs text-slate-400 mt-0.5`} numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
        thumbColor={value ? '#1e3a8a' : '#f4f3f4'}
      />
    </View>
  );
}
