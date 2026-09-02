import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export interface IncomingSosAlert {
  id?: string | number;
  sender_name?: string;
  sender_email?: string;
  location_text?: string;
  created_at?: string;
}

interface InAppSosBannerProps {
  alert: IncomingSosAlert | null;
  onDismiss: () => void;
}

export const InAppSosBanner: React.FC<InAppSosBannerProps> = ({ alert, onDismiss }) => {
  if (!alert) return null;

  const senderName = alert.sender_name || alert.sender_email || 'A Passenger';
  const location = alert.location_text || 'Live coordinates shared';

  const handleView = () => {
    onDismiss();
    router.push('/passenger/notifications' as any);
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={!!alert}
      onRequestClose={onDismiss}
    >
      <View style={tw`flex-1 bg-black/60 justify-center items-center px-5`}>
        <View style={tw`w-full max-w-sm bg-white rounded-3xl overflow-hidden border-2 border-red-500 shadow-2xl`}>
          {/* Header Banner */}
          <View style={tw`bg-red-600 px-6 py-4 flex-row items-center gap-3`}>
            <View style={tw`w-10 h-10 rounded-full bg-white/20 justify-center items-center`}>
              <MaterialIcons name="warning" size={24} color="#ffffff" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-white font-black text-xs uppercase tracking-widest`}>
                EMERGENCY SOS ALERT
              </Text>
              <Text style={tw`text-white/90 text-xs font-semibold mt-0.5`}>
                Immediate assistance requested!
              </Text>
            </View>
          </View>

          {/* Body Content */}
          <View style={tw`p-6 items-center text-center`}>
            <Text style={tw`text-lg font-black text-slate-800 text-center mb-1`}>
              {senderName}
            </Text>
            <Text style={tw`text-xs font-bold text-red-600 text-center mb-4`}>
              Triggered a Panic Alert
            </Text>

            <View style={tw`w-full bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex-row items-center gap-3`}>
              <MaterialIcons name="location-on" size={22} color="#ef4444" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-[10px] font-black text-red-500 uppercase tracking-wider`}>
                  LAST KNOWN LOCATION
                </Text>
                <Text style={tw`text-xs font-bold text-slate-800 mt-0.5`} numberOfLines={2}>
                  {location}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={tw`w-full gap-2.5`}>
              <TouchableOpacity
                onPress={handleView}
                activeOpacity={0.8}
                style={tw`w-full bg-red-600 py-3.5 rounded-full items-center justify-center shadow-md`}
              >
                <Text style={tw`text-white font-black text-sm uppercase tracking-wider`}>
                  View Notifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onDismiss}
                activeOpacity={0.7}
                style={tw`w-full bg-slate-100 py-3 rounded-full items-center justify-center`}
              >
                <Text style={tw`text-slate-600 font-bold text-xs uppercase tracking-wider`}>
                  Acknowledge & Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
