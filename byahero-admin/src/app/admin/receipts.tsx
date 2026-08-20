import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';
import AlertModal from '@/components/AlertModal';
import { Ionicons } from '@expo/vector-icons';

export default function AdminReceiptConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [companyName, setCompanyName] = useState('ByaHero Transit');
  const [tinNumber, setTinNumber] = useState('000-000-000-000');
  const [headerMessage, setHeaderMessage] = useState('Welcome aboard!');
  const [footerMessage, setFooterMessage] = useState('Thank you for riding with us!');

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReceiptConfig();
      if (res.success && res.config) {
        setCompanyName(res.config.company_name || '');
        setTinNumber(res.config.tin_number || '');
        setHeaderMessage(res.config.header_message || '');
        setFooterMessage(res.config.footer_message || '');
      }
    } catch (e) {
      console.error('Failed to fetch receipt config', e);
      showAlert('Error', 'Could not load receipt configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        company_name: companyName,
        tin_number: tinNumber,
        header_message: headerMessage,
        footer_message: footerMessage,
      };
      
      const res = await adminService.saveReceiptConfig(data);
      if (res.success) {
        showAlert('Success', 'Receipt configuration saved.', 'success');
      } else {
        showAlert('Error', res.error || 'Failed to save configuration.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Error', e.message || 'An error occurred while saving.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const ReceiptPreview = () => (
    <View style={tw`bg-gray-100 p-4 rounded-xl items-center`}>
      <View style={tw`w-[300px] bg-white border border-gray-300 p-4 rounded-lg shadow-sm`}>
        <Text style={tw`text-center font-bold text-lg mb-1`}>{companyName || 'COMPANY NAME'}</Text>
        <Text style={tw`text-center text-xs text-gray-600 mb-4`}>TIN: {tinNumber || '000-000-000-000'}</Text>
        
        <Text style={tw`text-center text-sm mb-4 border-b border-dashed border-gray-300 pb-2`}>
          {headerMessage || 'Header text here'}
        </Text>
        
        <View style={tw`flex-row justify-between mb-1`}>
          <Text style={tw`text-xs`}>DATE: 08/20/2026</Text>
          <Text style={tw`text-xs`}>TIME: 14:30</Text>
        </View>
        <View style={tw`flex-row justify-between mb-1`}>
          <Text style={tw`text-xs`}>BUS: BUS-001</Text>
          <Text style={tw`text-xs`}>PAX: 1</Text>
        </View>
        <View style={tw`flex-row justify-between mb-4 border-b border-dashed border-gray-300 pb-2`}>
          <Text style={tw`text-xs font-bold`}>TOTAL:</Text>
          <Text style={tw`text-xs font-bold`}>PHP 25.00</Text>
        </View>
        
        <Text style={tw`text-center text-xs italic text-gray-500 mt-2`}>
          {footerMessage || 'Footer text here'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="RECEIPT CONFIG" showBack />
      
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#4C85C5" />
        </View>
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw`flex-1`}
        >
          <ScrollView contentContainerStyle={tw`p-4 pb-20`}>
            
            <View style={tw`mb-6`}>
              <Text style={tw`text-2xl font-black text-slate-900 tracking-tight`}>Receipt Format</Text>
              <Text style={tw`text-slate-500 text-sm mt-1`}>
                Configure the text printed on physical tickets by the conductor's PT-210 portable printer.
              </Text>
            </View>

            <View style={tw`flex-row flex-wrap justify-between`}>
              
              {/* Form Section */}
              <View style={tw`w-full lg:w-[48%] mb-6 lg:mb-0`}>
                <View style={tw`bg-white p-5 rounded-2xl shadow-sm border border-gray-200`}>
                  
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>COMPANY NAME</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50`}
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="e.g. ByaHero Transit"
                    />
                  </View>

                  <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>TIN NUMBER / TAX ID</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50`}
                      value={tinNumber}
                      onChangeText={setTinNumber}
                      placeholder="e.g. 123-456-789-000"
                    />
                  </View>

                  <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>HEADER MESSAGE</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 h-20 text-left`}
                      value={headerMessage}
                      onChangeText={setHeaderMessage}
                      placeholder="Text below the title"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={tw`mb-6`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>FOOTER MESSAGE</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 h-20 text-left`}
                      value={footerMessage}
                      onChangeText={setFooterMessage}
                      placeholder="Terms or thank you message"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={tw`bg-[#1d72f8] rounded-full py-4 items-center shadow-md flex-row justify-center`}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={20} color="white" style={tw`mr-2`} />
                        <Text style={tw`text-white font-bold text-[15px]`}>SAVE CONFIGURATION</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                </View>
              </View>

              {/* Preview Section */}
              <View style={tw`w-full lg:w-[48%]`}>
                <View style={tw`bg-white p-5 rounded-2xl shadow-sm border border-gray-200`}>
                  <View style={tw`flex-row items-center mb-4`}>
                    <Ionicons name="print-outline" size={20} color="#64748b" style={tw`mr-2`} />
                    <Text style={tw`text-sm font-bold text-slate-700`}>PT-210 RECEIPT PREVIEW</Text>
                  </View>
                  
                  <ReceiptPreview />
                  
                  <Text style={tw`text-xs text-gray-400 mt-4 text-center px-4`}>
                    Note: This is a simulation. Actual print layout may slightly vary depending on the Bluetooth printer's paper width.
                  </Text>
                </View>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
