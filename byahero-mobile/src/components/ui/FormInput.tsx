import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

interface FormInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  isPassword?: boolean;
}

export function FormInput({ containerStyle, inputStyle, isPassword, ...props }: FormInputProps) {
  const [secureTextEntry, setSecureTextEntry] = useState(isPassword);

  return (
    <View style={[tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-4`, containerStyle]}>
      <TextInput
        placeholderTextColor="#7a98c8"
        secureTextEntry={secureTextEntry}
        style={[tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`, inputStyle]}
        {...props}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
          <Ionicons name={secureTextEntry ? "eye-off" : "eye"} size={18} color="#7a98c8" />
        </TouchableOpacity>
      )}
    </View>
  );
}
