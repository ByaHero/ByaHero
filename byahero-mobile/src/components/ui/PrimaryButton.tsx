import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, TouchableOpacityProps } from 'react-native';
import tw from 'twrnc';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

export function PrimaryButton({ title, isLoading, containerStyle, textStyle, disabled, ...props }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      disabled={isLoading || disabled}
      style={[tw`self-center bg-[#1d72f8] rounded-full py-3.5 w-full items-center justify-center shadow-sm mb-4`, containerStyle]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[tw`text-white text-sm font-bold tracking-wider`, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
