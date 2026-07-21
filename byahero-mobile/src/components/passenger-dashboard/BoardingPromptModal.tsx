import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface BoardingPromptModalProps {
  visible: boolean;
  busIdentifier: string | undefined;
  onAccept: () => void;
  onReject: () => void;
}

export function BoardingPromptModal({ visible, busIdentifier, onAccept, onReject }: BoardingPromptModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
        <View style={tw`bg-white w-full rounded-3xl p-6 shadow-xl`}>
          <View style={tw`items-center mb-4`}>
            <View style={tw`w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4`}>
              <MaterialIcons name="directions-bus" size={32} color="#1e3a8a" />
            </View>
            <Text style={[tw`text-xl text-center text-slate-800 mb-2`, { fontFamily: 'Inter_900Black' }]}>
              Boarding Bus?
            </Text>
            <Text style={[tw`text-sm text-center text-slate-500`, { fontFamily: 'Inter_500Medium' }]}>
              Are you boarding Bus {busIdentifier}?
            </Text>
          </View>
          <View style={tw`flex-row justify-between gap-3`}>
            <TouchableOpacity onPress={onReject} style={tw`flex-1 bg-slate-100 py-4 rounded-xl items-center`}>
              <Text style={[tw`text-slate-600`, { fontFamily: 'Inter_700Bold' }]}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} style={tw`flex-1 bg-blue-600 py-4 rounded-xl items-center`}>
              <Text style={[tw`text-white`, { fontFamily: 'Inter_700Bold' }]}>Yes, Board</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
