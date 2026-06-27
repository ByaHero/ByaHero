import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function LostAndFoundFormScreen() {
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [description, setDescription] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    if (selectedPhotos.length >= 2) {
      Alert.alert('Limit Reached', 'You can only upload a maximum of 2 photos.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant library permissions to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedPhotos([...selectedPhotos, result.assets[0].uri]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleClearPhotos = () => {
    setSelectedPhotos([]);
  };

  const handleSubmitReport = async () => {
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Description is required.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const serverUrl = await getServerUrl();
      const formData = new FormData();
      formData.append('itemType', itemType);
      formData.append('description', description.trim());
      formData.append('bus_number', busNumber.trim());

      selectedPhotos.forEach((photoUri, index) => {
        const fileName = photoUri.split('/').pop() || `photo_${index}.jpg`;
        formData.append('images[]', {
          uri: photoUri,
          name: fileName,
          type: 'image/jpeg',
        } as any);
      });

      const res = await fetch(`${serverUrl}/api/lost-and-found/create`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      setIsSubmitting(false);

      if (res.ok) {
        Alert.alert('Success', 'Report successfully submitted to the server!');
        setDescription('');
        setBusNumber('');
        setSelectedPhotos([]);
      } else {
        throw new Error('Server responded with error');
      }
    } catch (err) {
      setIsSubmitting(false);
      
      try {
        const stored = await AsyncStorage.getItem('byahero_pending_lost_found') || '[]';
        const pending = JSON.parse(stored);
        pending.push({
          type: itemType,
          description: description.trim(),
          bus_number: busNumber.trim(),
          timestamp: Date.now(),
        });
        await AsyncStorage.setItem('byahero_pending_lost_found', JSON.stringify(pending));
        
        Alert.alert(
          'Saved Locally',
          'Network connection issue. Report saved locally and queued for synchronization.'
        );
        setDescription('');
        setBusNumber('');
        setSelectedPhotos([]);
      } catch (e) {
        Alert.alert('Error', 'Failed to save report.');
      }
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Lost and Found" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-4 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          
          <View style={tw`flex-row justify-end mb-4`}>
            <TouchableOpacity 
              onPress={() => router.push('/passenger/lostAndFound/myReports')}
              style={tw`flex-row items-center bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full`}
            >
              <MaterialIcons name="receipt-long" size={14} color="#1e3a8a" style={tw`mr-1`} />
              <Text style={tw`text-[11px] font-bold text-[#1e3a8a]`}>Check Status</Text>
            </TouchableOpacity>
          </View>

          {/* Toggle Selector */}
          <View style={tw`flex-row justify-between mb-5 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm`}>
            <TouchableOpacity 
              onPress={() => setItemType('lost')}
              style={[
                tw`flex-1 py-2.5 rounded-xl items-center`,
                itemType === 'lost' ? tw`bg-[#1e3a8a]` : tw`bg-transparent`
              ]}
            >
              <Text style={[tw`text-sm font-bold`, itemType === 'lost' ? tw`text-white` : tw`text-slate-400`]}>
                Lost
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setItemType('found')}
              style={[
                tw`flex-1 py-2.5 rounded-xl items-center`,
                itemType === 'found' ? tw`bg-[#1e3a8a]` : tw`bg-transparent`
              ]}
            >
              <Text style={[tw`text-sm font-bold`, itemType === 'found' ? tw`text-white` : tw`text-slate-400`]}>
                Found
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields Card */}
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm gap-4 mb-4`}>
            {/* Description */}
            <View>
              <Text style={tw`text-xs font-bold text-slate-400 mb-2`}>
                {itemType === 'lost' ? 'Describe the item you lost?' : 'Describe the item you found?'}
              </Text>
              <TextInput
                style={[
                  tw`w-full bg-slate-550 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700`,
                  { height: 120, textAlignVertical: 'top' }
                ]}
                multiline={true}
                numberOfLines={5}
                placeholder="Provide key identifying marks, color, name tag details, or where/when you suspect it happened..."
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Photo Upload Area */}
            <View>
              <Text style={tw`text-xs font-bold text-slate-400 mb-2`}>Upload Item Photo</Text>
              
              {selectedPhotos.length === 0 ? (
                <TouchableOpacity 
                  onPress={handlePickImage}
                  style={tw`w-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-8 items-center justify-center`}
                >
                  <MaterialIcons name="add-a-photo" size={32} color="#1e3a8a" style={tw`mb-2`} />
                  <Text style={tw`text-xs text-slate-400 font-bold`}>Up to 2 photos</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <View style={tw`flex-row gap-3`}>
                    {selectedPhotos.map((photoUri, index) => (
                      <View key={index} style={tw`relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200`}>
                        <Image source={{ uri: photoUri }} style={tw`w-full h-full`} />
                      </View>
                    ))}
                    {selectedPhotos.length < 2 && (
                      <TouchableOpacity 
                        onPress={handlePickImage}
                        style={tw`w-20 h-20 bg-slate-50 border border-dashed border-slate-200 rounded-xl items-center justify-center`}
                      >
                        <MaterialIcons name="add-a-photo" size={20} color="#1e3a8a" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity 
                    onPress={handleClearPhotos}
                    style={tw`mt-3 bg-red-50 border border-red-100 py-2 rounded-xl items-center`}
                  >
                    <Text style={tw`text-xs font-bold text-[#ef4444]`}>Clear Photos</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bus Number */}
            <View>
              <Text style={tw`text-xs font-bold text-slate-400 mb-2`}>
                {itemType === 'lost' ? 'Last Bus lost (optional)' : 'Last Bus found (optional)'}
              </Text>
              <TextInput
                style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700`}
                placeholder="e.g. Bus 12, Route 3"
                value={busNumber}
                onChangeText={setBusNumber}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity 
              onPress={handleSubmitReport}
              disabled={isSubmitting}
              style={tw`bg-[#1e3a8a] py-3.5 rounded-2xl items-center shadow-md mt-2`}
            >
              <Text style={tw`text-sm font-bold text-white`}>
                {isSubmitting ? 'Saving Report...' : 'Save Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
