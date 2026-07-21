import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';

interface WaitingStatusModalProps {
  visible: boolean;
  onClose: () => void;
  waitingFeedback: 'waiting' | 'cancelled' | null;
  setWaitingFeedback: (f: 'waiting' | 'cancelled' | null) => void;
  isBoarded: boolean;
  boardedBus: string;
  boardedRoute: string;
  isWaiting: boolean;
  waitingLocation: string;
  waitingSecondsLeft: number | null;
  handleCancelWaiting: () => void;
  isUpdatingWaiting: boolean;
  nearestStopName: string | null;
  handleSetWaiting: (stopName: string) => void;
}

export function WaitingStatusModal({
  visible,
  onClose,
  waitingFeedback,
  setWaitingFeedback,
  isBoarded,
  boardedBus,
  boardedRoute,
  isWaiting,
  waitingLocation,
  waitingSecondsLeft,
  handleCancelWaiting,
  isUpdatingWaiting,
  nearestStopName,
  handleSetWaiting
}: WaitingStatusModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
        <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
          <TouchableOpacity
            onPress={() => {
              setWaitingFeedback(null);
              onClose();
            }}
            style={tw`absolute top-4 right-4 p-1 z-10`}
          >
            <MaterialIcons name="close" size={22} color="#94a3b8" />
          </TouchableOpacity>

          {waitingFeedback !== null ? (
            <View style={tw`w-full items-center py-2`}>
              <View style={tw`w-16 h-16 rounded-full items-center justify-center mb-4 ${waitingFeedback === 'waiting' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <MaterialIcons
                  name={waitingFeedback === 'waiting' ? 'check-circle' : 'remove-circle'}
                  size={40}
                  color={waitingFeedback === 'waiting' ? '#10b981' : '#94a3b8'}
                />
              </View>
              <Text style={[tw`text-base font-black text-slate-800 text-center mb-2`, { fontFamily: 'Inter_900Black' }]}>
                {waitingFeedback === 'waiting'
                  ? 'You are now registered as a waiting passenger'
                  : 'You are currently not waiting for a bus'}
              </Text>
              <Text style={[tw`text-xs text-slate-400 text-center`, { fontFamily: 'Inter_400Regular' }]}>
                {waitingFeedback === 'waiting'
                  ? 'Conductors can see you are waiting nearby.'
                  : 'Your waiting status has been removed.'}
              </Text>
            </View>
          ) : (
            <>
              <Image
                source={require('../../../assets/images/waitingMark.svg')}
                style={tw`w-[80px] h-[80px] mb-4`}
                contentFit="contain"
              />
              <Text style={[tw`text-lg font-black text-slate-800 text-center mb-1.5`, { fontFamily: 'Inter_900Black' }]}>
                Are you waiting for a bus?
              </Text>

              {isBoarded ? (
                <>
                  <View style={tw`bg-blue-50 border border-blue-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                    <Text style={[tw`text-xs font-black text-blue-800 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                      STATUS: BOARDED
                    </Text>
                    <Text style={[tw`text-[15px] font-black text-[#1e3a8a] text-center mb-1`, { fontFamily: 'Inter_900Black' }]}>
                      Bus {boardedBus}
                    </Text>
                    <Text style={[tw`text-[11px] text-blue-600 font-semibold text-center uppercase tracking-wider`, { fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
                      Route: {boardedRoute}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    style={tw`w-full bg-slate-100 py-3 rounded-full justify-center items-center mb-2`}
                  >
                    <Text style={[tw`text-slate-500 font-black text-sm`, { fontFamily: 'Inter_900Black' }]}>Close</Text>
                  </TouchableOpacity>
                </>
              ) : isWaiting ? (
                <>
                  <View style={tw`bg-emerald-50 border border-emerald-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                    <Text style={[tw`text-xs font-black text-emerald-800 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                      STATUS: WAITING
                    </Text>
                    <Text style={[tw`text-[13px] text-emerald-600 font-semibold text-center`, { fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
                      At {waitingLocation}
                    </Text>
                    {waitingSecondsLeft !== null && (
                      <View style={tw`mt-2 flex-row items-center`}>
                        <Text style={[tw`text-[11px] text-emerald-500`, { fontFamily: 'Inter_500Medium' }]}>
                          {waitingSecondsLeft > 0
                            ? `Expires in ${Math.floor(waitingSecondsLeft / 60)}m ${waitingSecondsLeft % 60}s`
                            : 'Expired — refreshing...'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={handleCancelWaiting}
                    disabled={isUpdatingWaiting}
                    activeOpacity={0.85}
                    style={tw`w-full mb-2 items-center ${isUpdatingWaiting ? 'opacity-60' : ''}`}
                  >
                    <Image
                      source={require('../../../assets/images/stopWaiting.svg')}
                      style={{ width: '100%', height: 62, maxWidth: 276 }}
                      contentFit="contain"
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {nearestStopName ? (
                    <>
                      <View style={tw`bg-blue-50 border border-blue-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                        <Text style={[tw`text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                          RECOGNIZED LOCATION
                        </Text>
                        <Text style={[tw`text-[15px] font-black text-[#1e3a8a] text-center`, { fontFamily: 'Inter_900Black' }]} numberOfLines={2}>
                          {nearestStopName}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleSetWaiting(nearestStopName)}
                        disabled={isUpdatingWaiting}
                        activeOpacity={0.85}
                        style={tw`w-full mb-2 items-center ${isUpdatingWaiting ? 'opacity-60' : ''}`}
                      >
                        <Image
                          source={require('../../../assets/images/waitingButtonPill.svg')}
                          style={{ width: '100%', height: 62, maxWidth: 276 }}
                          contentFit="contain"
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={tw`bg-red-50 border border-red-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                        <Text style={[tw`text-[10px] font-black text-red-800 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                          UNRECOGNIZED LOCATION
                        </Text>
                        <Text style={[tw`text-xs text-red-500 font-semibold text-center leading-relaxed`, { fontFamily: 'Inter_500Medium' }]}>
                          Waiting can only be activated at designated pickup points or stops.
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={onClose}
                        style={tw`w-full bg-slate-100 py-3 rounded-full justify-center items-center mb-2`}
                      >
                        <Text style={[tw`text-slate-500 font-black text-sm`, { fontFamily: 'Inter_900Black' }]}>Close</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
