import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import AlertModal from '../../../components/AlertModal';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';
import TourOverlay, { tourSteps } from '../../../components/TourOverlay';
import { handleTourLayout } from '../../../components/TourRegistry';
import { useTourSync } from '../../../hooks/passenger/useTourSync';
import { SuccessScreen } from '../../../components/ui/SuccessScreen';

export default function ReportProblemScreen() {
  const { activeStep, setActiveStep } = useTourSync('/passenger/report');
  const reportCardRef = useRef<any>(null);
  
  const [reportReason, setReportReason] = useState('');
  const [othersDetails, setOthersDetails] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // AlertModal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean; title: string; message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void; onCancel?: () => void;
  }>({ visible: false, title: '', message: '', type: 'error', onConfirm: () => {} });

  const showAlert = (
    title: string, message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void, onCancel?: () => void
  ) => {
    setAlertConfig({
      visible: true, title, message, type,
      onConfirm: () => { setAlertConfig(p => ({ ...p, visible: false })); if (onConfirm) onConfirm(); },
      onCancel: onCancel ? () => { setAlertConfig(p => ({ ...p, visible: false })); onCancel(); } : undefined,
    });
  };

  const reasons = [
    'Inaccurate Bus Tracking / Wrong GPS Location',
    'Incorrect ETA or Schedule Information',
    'App Crashes, Freezes, or Screen Errors',
    'Slow Performance / Heavy Loading Times',
    'Account Login, Profile, or Sign Up Issues',
    'UI / Navigation Problems (Overlap, Alignment, etc.)',
    'Other App Concerns / Suggestions',
  ];

  const handleSubmit = async () => {
    if (!reportReason && !othersDetails.trim()) {
      showAlert('Validation Error', 'Please select a reason or specify details in the others field.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      report_reason: reportReason || 'Others',
      others_details: othersDetails.trim(),
    };

    try {
      const serverUrl = await getServerUrl();
      const email = await AsyncStorage.getItem('byahero_cached_email') || '';
      
      const res = await fetch(`${serverUrl}/api/passenger/report/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          email: email
        }),
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
        showAlert('Saved Locally', 'Saved report locally. Server sync failed (queued).', 'info');
        await queueReportOffline(payload);
      }
    } catch (err) {
      setIsSubmitting(false);
      showAlert('Saved Locally', 'Saved report locally. Connection to server failed (queued).', 'info');
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
                      Submit details if you encountered any app-related issues or inaccuracies during your trip.
                    </Text>
                  </View>
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
              <SuccessScreen 
                title="Report Submitted" 
                message={successMsg} 
              />
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
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </SafeAreaView>
  );
}
