import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import tw from 'twrnc';

export default function Page() {
  return (
    <ScrollView style={tw`flex-1 bg-slate-900`} contentContainerStyle={tw`p-6`}>
      <View style={tw`bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700`}>
        <Text style={tw`text-white text-xl font-bold mb-4`}>Manage Stops</Text>
        <Text style={tw`text-slate-400`}>
          This module is under construction. It will display the related functionality.
        </Text>
      </View>
    </ScrollView>
  );
}
