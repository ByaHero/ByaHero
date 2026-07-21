import React from 'react';
import { View, TextInput, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import tw from 'twrnc';

interface OtpInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function OtpInput({ containerStyle, inputStyle, ...props }: OtpInputProps) {
  return (
    <View style={[tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-5`, containerStyle]}>
      <TextInput
        placeholder="000000"
        placeholderTextColor="#7a98c8"
        keyboardType="numeric"
        maxLength={6}
        textAlign="center"
        style={[tw`flex-1 color-[#0f172a] py-3 text-lg font-bold`, { letterSpacing: 6 }, inputStyle]}
        {...props}
      />
    </View>
  );
}
