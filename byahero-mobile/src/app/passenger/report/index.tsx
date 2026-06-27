import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';
import TourOverlay, { tourSteps } from '../../../components/TourOverlay';
import { handleTourLayout } from '../../../components/TourRegistry';

export default function ReportProblemScreen() {
  const { bus_number } = useLocalSearchParams<{ bus_number?: string }>();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const reportCardRef = useRef<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      async function checkTour() {
        const stepVal = await AsyncStorage.getItem('byahero_active_tour_step');
        if (stepVal !== null) {
          const stepIdx = parseInt(stepVal, 10);
          const stepInfo = tourSteps[stepIdx];
          if (stepInfo && stepInfo.screen === '/passenger/report/index') {
            setActiveStep(stepIdx);
          } else {
            setActiveStep(null);
          }
        } else {
          setActiveStep(null);
        }
      }
      checkTour();
      return () => {
        setActiveStep(null);
      };
    }, [])
  );
  
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [othersDetails, setOthersDetails] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const reasons = [
    'No Air Conditioning / Poor Ventilation in Bus',
    'Dirty or Unclean Bus',
    'Broken Seats or Unsafe Interior',
    'Reckless Driving',
    'Over-speeding / Sudden Braking',
    'Unprofessional Behavior of Driver or Conductor',
    'Discount Not Applied (Senior / PWD / Student)',
    'No Receipt',
    'Line Cutting',
  ];

  useEffect(() => {
    async function loadBuses() {
      if (bus_number) {
        setSelectedBus(bus_number);
        return;
      }

      try {
        const cachedBuses = await AsyncStorage.getItem('byahero_cached_buses') || '[]';
        let parsedBuses = JSON.parse(cachedBuses);
        
        const serverUrl = await getServerUrl();
        const res = await fetch(`${serverUrl}/api/buses`);
        const data = await res.json();
        if (data && data.buses) {
          parsedBuses = data.buses;
          await AsyncStorage.setItem('byahero_cached_buses', JSON.stringify(parsedBuses));
        }
        setBuses(parsedBuses);
      } catch (err) {
        console.warn('Failed to load buses, using default list:', err);
        setBuses([
          { code: 'BUS-001' }, { code: 'BUS-002' }, { code: 'BUS-003' },
          { code: 'BUS-004' }, { code: 'BUS-005' }, { code: 'BUS-006' }
        ]);
      }
    }
    loadBuses();
  }, [bus_number]);

  const handleSubmit = async () => {
    if (!selectedBus) {
      Alert.alert('Validation Error', 'Please select or enter a bus number.');
      return;
    }
    if (!reportReason && !othersDetails.trim()) {
      Alert.alert('Validation Error', 'Please select a reason or specify details in the others field.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      bus_number: selectedBus,
      report_reason: reportReason || 'Others',
      contact_number: contactNumber.trim(),
      others_details: othersDetails.trim(),
    };

    try {
      const serverUrl = await getServerUrl();
      const formData = new FormData();
      formData.append('bus_number', payload.bus_number);
      formData.append('report_reason', payload.report_reason);
      formData.append('contact_number', payload.contact_number);
      formData.append('others_details', payload.others_details);

      const res = await fetch(`${serverUrl}/passenger/report/submitReport.php?json=1`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (data && data.success) {
        setSuccessMsg(data.message || 'Your report has been submitted successfully!');
        setSubmitted(true);
        setTimeout(() => {
          router.replace('/passenger');
        }, 2500);
      } else {
        Alert.alert('Saved Locally', 'Saved report locally. Server sync failed (queued).');
        await queueReportOffline(payload);
      }
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert('Saved Locally', 'Saved report locally. Connection to server failed (queued).');
      await queueReportOffline(payload);
    }
  };

  const queueReportOffline = async (payload: any) => {
    try {
      const queueStored = await AsyncStorage.getItem('byahero_pending_reports') || '[]';
      const queue = JSON.parse(queueStored);
      payload.timestamp = Date.now();
      queue.push(payload);
      await AsyncStorage.setItem('byahero_pending_reports', JSON.stringify(queue));
      
      setSuccessMsg('Your report has been saved locally (offline) and will sync when you are back online.');
      setSubmitted(true);
      setTimeout(() => {
        router.replace('/passenger');
      }, 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Report a Problem" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-5 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View 
            ref={reportCardRef}
            onLayout={() => handleTourLayout('report-card', reportCardRef)}
            style={tw`bg-white rounded-3xl p-6 shadow-sm border border-slate-100`}
          >
            {!submitted ? (
              <View>
                <View style={tw`flex-row items-center mb-5`}>
                  <View style={tw`w-10 h-10 rounded-full bg-slate-900/10 justify-center items-center mr-3`}>
                    <MaterialIcons name="report-problem" size={20} color="#1e3a8a" />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-base font-black text-slate-800`}>Report a Problem</Text>
                    <Text style={tw`text-[11px] text-slate-400 font-semibold leading-relaxed`}>
                      Submit details if you encountered any issues during your trip.
                    </Text>
                  </View>
                </View>

                {/* Bus Selector */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-xs font-bold text-slate-400 mb-2`}>Bus Number</Text>
                  {bus_number ? (
                    <TextInput
                      style={tw`w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400`}
                      value={selectedBus}
                      editable={false}
                    />
                  ) : (
                    <View style={tw`flex-row flex-wrap gap-2`}>
                      {buses.map((bus, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setSelectedBus(bus.code)}
                          style={[
                            tw`px-3.5 py-2 rounded-xl border`,
                            selectedBus === bus.code 
                              ? tw`bg-blue-50 border-[#1e3a8a]` 
                              : tw`bg-slate-50 border-slate-200`
                          ]}
                        >
                          <Text style={[
                            tw`text-xs font-bold`,
                            selectedBus === bus.code ? tw`text-[#1e3a8a]` : tw`text-slate-500`
                          ]}>
                            {bus.code}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Reasons Selection */}
                <Text style={tw`text-xs font-bold text-slate-400 mb-2.5`}>Select Reason</Text>
                <View style={tw`gap-2.5 mb-5`}>
                  {reasons.map((r, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setReportReason(r)}
                      style={tw`flex-row items-center justify-between bg-slate-50 border border-slate-200/60 rounded-xl p-3.5`}
                    >
                      <Text style={tw`text-xs font-bold text-slate-700 flex-1 mr-3 leading-relaxed`}>
                        {r}
                      </Text>
                      <View style={tw`w-5 h-5 rounded-full border border-slate-300 justify-center items-center`}>
                        {reportReason === r && (
                          <View style={tw`w-3 h-3 rounded-full bg-[#1e3a8a]`} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Contact Number */}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-xs font-bold text-slate-400 mb-2`}>Contact Number (Optional)</Text>
                  <TextInput
                    style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700`}
                    placeholder="e.g. 09123456789"
                    keyboardType="phone-pad"
                    maxLength={11}
                    value={contactNumber}
                    onChangeText={(text) => setContactNumber(text.replace(/[^0-9]/g, ''))}
                  />
                </View>

                {/* Others Specification */}
                <View style={tw`mb-6`}>
                  <Text style={tw`text-xs font-bold text-slate-400 mb-2`}>Others (please specify)</Text>
                  <TextInput
                    style={[
                      tw`w-full bg-slate-550 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700`,
                      { height: 100, textAlignVertical: 'top' }
                    ]}
                    placeholder="Describe your issue in details..."
                    multiline={true}
                    numberOfLines={4}
                    value={othersDetails}
                    onChangeText={setOthersDetails}
                  />
                </View>

                {/* Submit Action */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={tw`bg-[#1e3a8a] py-3.5 rounded-2xl items-center shadow-md`}
                >
                  <Text style={tw`text-sm font-bold text-white`}>
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={tw`items-center py-10`}>
                <MaterialIcons name="check-circle" size={64} color="#10b981" />
                <Text style={tw`text-lg font-black text-[#1e3a8a] mt-4 mb-2`}>Report Submitted</Text>
                <Text style={tw`text-xs text-slate-400 font-semibold text-center leading-relaxed px-5`}>
                  {successMsg}
                </Text>
                <Text style={tw`text-xs text-slate-300 font-semibold mt-8`}>Redirecting you home...</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />

      {activeStep !== null && (
        <TourOverlay 
          currentStep={activeStep} 
          onStepChange={setActiveStep} 
          onClose={() => setActiveStep(null)} 
        />
      )}
    </SafeAreaView>
  );
}
