import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';

interface GuestNoticeProps {
  message: string;
  type?: 'info' | 'warning';
  actionText?: string;
  onActionPress?: () => void;
}

export function GuestNotice({ message, type = 'info', actionText, onActionPress }: GuestNoticeProps) {
  const isWarning = type === 'warning';
  const bgColor = isWarning ? 'bg-yellow-50' : 'bg-blue-50';
  const borderColor = isWarning ? 'border-yellow-100' : 'border-blue-100';
  const iconColor = isWarning ? '#b45309' : '#1d4ed8';
  const textColor = isWarning ? 'text-amber-800/90' : 'text-blue-800/90';

  return (
    <View style={tw`${bgColor} border ${borderColor} rounded-3xl p-4 mb-4 flex-row items-center`}>
      <MaterialIcons name={isWarning ? 'warning' : 'info'} size={20} color={iconColor} style={tw`mr-2`} />
      <Text style={tw`text-xs ${textColor} leading-relaxed flex-1`}>
        {message}{' '}
        {actionText && (
          <Text 
            style={tw`font-bold text-[#1e3a8a] underline`} 
            onPress={onActionPress}
          >
            {actionText}
          </Text>
        )}
      </Text>
    </View>
  );
}
