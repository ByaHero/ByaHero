import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import tw from 'twrnc';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function StaticPagesScreen() {
  const { page } = useLocalSearchParams<{ page: 'privacy' | 'terms' | 'about' }>();

  const getPageContent = () => {
    switch (page) {
      case 'privacy':
        return {
          title: 'Privacy Policy',
          icon: 'policy',
          body: (
            <View style={tw`gap-4`}>
              <Text style={tw`text-sm font-semibold text-slate-700 leading-relaxed`}>
                At ByaHero, your privacy is our top priority. We collect and use your data solely to provide real-time bus tracking and emergency notification services.
              </Text>
              <Text style={tw`text-sm font-bold text-[#1e3a8a] mt-2`}>1. Data Collection</Text>
              <Text style={tw`text-sm text-slate-500 font-semibold leading-relaxed`}>
                We collect your name, email address, phone number, and real-time GPS location coordinates when tracking is active. This data is transmitted securely to our servers.
              </Text>
              <Text style={tw`text-sm font-bold text-[#1e3a8a] mt-2`}>2. Location Services</Text>
              <Text style={tw`text-sm text-slate-500 font-semibold leading-relaxed`}>
                Your location coordinates are processed only when tracking is turned on to show your proximity to buses and allow circle members to track you during commutes.
              </Text>
              <Text style={tw`text-sm font-bold text-[#1e3a8a] mt-2`}>3. Security</Text>
              <Text style={tw`text-sm text-slate-500 font-semibold leading-relaxed`}>
                All user and location transmission channels are secured using standard SSL encryption. Your session details are hashed and cached securely on your local device.
              </Text>
            </View>
          ),
        };
      case 'terms':
        return {
          title: 'Terms of Service',
          icon: 'gavel',
          body: (
            <View style={tw`gap-4`}>
              <Text style={tw`text-sm font-semibold text-slate-700 leading-relaxed`}>
                By using ByaHero, you agree to comply with our usage conditions. Please review our terms before proceeding.
              </Text>
              <Text style={tw`text-sm font-bold text-[#1e3a8a] mt-2`}>1. User Obligations</Text>
              <Text style={tw`text-sm text-slate-500 font-semibold leading-relaxed`}>
                You agree to provide accurate registration details (name, email, phone) and must not misuse the tracking portal or trigger fraudulent SOS panic alerts.
              </Text>
              <Text style={tw`text-sm font-bold text-[#1e3a8a] mt-2`}>2. Service Availability</Text>
              <Text style={tw`text-sm text-slate-500 font-semibold leading-relaxed`}>
                ByaHero provides real-time public transit tracking as-is. We strive for maximum uptime but do not guarantee 100% accuracy of bus coordinates due to network variances.
              </Text>
              <Text style={tw`text-sm font-bold text-[#1e3a8a] mt-2`}>3. Emergency Feature Limitation</Text>
              <Text style={tw`text-sm text-slate-500 font-semibold leading-relaxed`}>
                The SOS panic button is a tool to alert your circle and operators. It is not a replacement for national emergency services (911/police).
              </Text>
            </View>
          ),
        };
      case 'about':
      default:
        return {
          title: 'About ByaHero',
          icon: 'info',
          body: (
            <View style={tw`items-center`}>
              <Image 
                source={require('../../../../assets/images/logo-glow.png')} 
                style={tw`w-36 h-36 mb-6`} 
                contentFit="contain" 
              />
              <Text style={tw`text-lg font-black text-[#1e3a8a] mb-3`}>Welcome to ByaHero</Text>
              <Text style={tw`text-sm text-center text-slate-600 font-semibold leading-relaxed mb-6`}>
                ByaHero is dedicated to revolutionizing the way passengers experience bus transport. Our goal is to provide seamless tracking of bus schedules, timely notifications, and intelligent insights to enhance your travel experience.
                {'\n\n'}
                By leveraging modern technology, we aim to connect passengers and operators with the tools they need for reliable and efficient transportation. Whether you're planning your daily commute or a long journey, ByaHero is here to make it stress-free and convenient.
              </Text>
              
              <View style={tw`border-t border-slate-100 w-full pt-5 items-center`}>
                <Text style={tw`text-sm font-bold text-slate-800 mb-1`}>Contact Us</Text>
                <Text style={tw`text-xs text-slate-500 font-semibold leading-relaxed`}>Email: support@byahero.app</Text>
                <Text style={tw`text-xs text-slate-500 font-semibold leading-relaxed`}>Phone: +63 43 778 1234</Text>
              </View>
            </View>
          ),
        };
    }
  };

  const content = getPageContent();

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle={content.title} showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-5 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-slate-100`}>
            {content.body}
            
            <TouchableOpacity 
              onPress={() => router.back()}
              style={tw`mt-6 bg-[#1e3a8a] py-3 rounded-2xl items-center shadow-md`}
            >
              <Text style={tw`text-sm font-bold text-white`}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
