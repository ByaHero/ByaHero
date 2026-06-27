import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function SettingsScreen() {
  const settingsSections = [
    {
      title: 'Alerts & Sharing',
      items: [
        {
          title: 'Smart Notifications',
          desc: 'Configure push alerts and schedules',
          icon: 'notifications-active',
          color: '#3b82f6',
          route: '/passenger/settings/smartNotification',
        },
        {
          title: 'Privacy & Security',
          desc: 'Manage profile and visibility settings',
          icon: 'security',
          color: '#10b981',
          route: '/passenger/settings/privacySecurity',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          title: 'Accessibility Settings',
          desc: 'High contrast and voice guidance',
          icon: 'accessibility',
          color: '#8b5cf6',
          route: '/passenger/settings/accessibilitySettings',
        },
        {
          title: 'Submit Feedback',
          desc: 'Report suggestions or issues',
          icon: 'rate-review',
          color: '#f59e0b',
          route: '/passenger/settings/feedback',
        },
      ],
    },
    {
      title: 'Legal & Info',
      items: [
        {
          title: 'Privacy Policy',
          desc: 'Read our data policy guidelines',
          icon: 'policy',
          color: '#64748b',
          route: '/passenger/settings/staticPages?page=privacy',
        },
        {
          title: 'Terms of Service',
          desc: 'Read terms of use details',
          icon: 'description',
          color: '#64748b',
          route: '/passenger/settings/staticPages?page=terms',
        },
        {
          title: 'About Us',
          desc: 'About the ByaHero application',
          icon: 'info',
          color: '#64748b',
          route: '/passenger/settings/staticPages?page=about',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Settings" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-4 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <Text style={tw`text-lg font-black text-slate-800 mb-1 px-1`}>Settings Portal</Text>
          <Text style={tw`text-xs text-slate-400 font-medium mb-5 px-1`}>Manage preferences, app visibility, and notification profiles</Text>

          {settingsSections.map((section, secIdx) => (
            <View key={secIdx} style={tw`mb-5`}>
              <Text style={tw`text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1`}>
                {section.title}
              </Text>
              
              <View style={tw`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden`}>
                {section.items.map((item, itemIdx) => (
                  <TouchableOpacity
                    key={itemIdx}
                    onPress={() => router.push(item.route as any)}
                    style={[
                      tw`flex-row items-center justify-between p-4`,
                      itemIdx < section.items.length - 1 && tw`border-b border-slate-100`
                    ]}
                  >
                    <View style={tw`flex-row items-center flex-1 mr-3`}>
                      <View style={[tw`w-10 h-10 rounded-2xl justify-center items-center mr-3.5`, { backgroundColor: item.color + '15' }]}>
                        <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-sm font-semibold text-slate-700`}>{item.title}</Text>
                        <Text style={tw`text-xs text-slate-400 mt-0.5`} numberOfLines={1}>{item.desc}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
