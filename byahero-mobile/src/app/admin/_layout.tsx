import { Stack } from 'expo-router';
import { AdminHeader } from '../../components/admin-navbar';
import { View } from 'react-native';
import tw from 'twrnc';

export default function AdminLayout() {
  return (
    <View style={tw`flex-1 bg-white`}>
      <Stack
        screenOptions={{
          header: (props) => <AdminHeader {...props} />,
          headerTransparent: true,
          contentStyle: { backgroundColor: '#f8f9fa' }
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Admin' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="analytics" options={{ title: 'Analytics Dashboard' }} />
        <Stack.Screen name="bus-fare" options={{ title: 'Bus Fares' }} />
        <Stack.Screen name="active-buses" options={{ title: 'Active Buses' }} />
        <Stack.Screen name="buses" options={{ title: 'Total Buses' }} />
        <Stack.Screen name="conductors" options={{ title: 'Drivers & Conductors' }} />
        <Stack.Screen name="feedbacks" options={{ title: 'Passenger Feedbacks' }} />
        <Stack.Screen name="lost-and-found" options={{ title: 'Lost & Found' }} />
        <Stack.Screen name="reports" options={{ title: 'Passenger Reports' }} />
        <Stack.Screen name="stops" options={{ title: 'Bus Pick up Points' }} />
        <Stack.Screen name="waiting-passengers" options={{ title: 'Waiting Passengers' }} />
        <Stack.Screen name="operation-schedule" options={{ title: 'Bus Operation Schedule' }} />
      </Stack>
      {/* Bottom Blue Strip */}
      <View style={[tw`absolute bottom-0 left-0 right-0 bg-[#0f3878]`, { height: 35 }]} pointerEvents="none" />
    </View>
  );
}
