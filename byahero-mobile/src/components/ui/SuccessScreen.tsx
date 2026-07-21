import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface SuccessScreenProps {
  title: string;
  message: string;
}

export function SuccessScreen({ title, message }: SuccessScreenProps) {
  return (
    <View style={tw`items-center py-10`}>
      <MaterialIcons name="check-circle" size={64} color="#10b981" />
      <Text style={tw`text-lg font-black text-[#1e3a8a] mt-4 mb-2`}>{title}</Text>
      <Text style={tw`text-xs text-slate-400 font-semibold text-center leading-relaxed px-5`}>
        {message}
      </Text>
      <Text style={tw`text-xs text-slate-300 font-semibold mt-8`}>Redirecting you home...</Text>
    </View>
  );
}
