import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Linking,
  NativeModules,
  RefreshControl
} from 'react-native';

const { LocationServiceModule } = NativeModules;
import AlertModal from '../components/AlertModal';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConductorLeafletHTML } from '../components/conductorMapHtml';
import { getServerUrl, logout } from '../services/authService';
import ConductorNavbar from '../components/ConductorNavbar';
import { 
  getBusesConductor, 
  getActiveBuses, 
  startOperation,
  getLocalCachedBuses,
  saveBusesToCache,
  saveLastSelectedBus,
  getLastSelectedBus
} from '../services/conductorService';
import TourOverlay from '../components/TourOverlay';
import { handleTourLayout } from '../components/TourRegistry';
import { useTourSync } from '../hooks/useTourSync';
import { usePrinter } from '../hooks/usePrinter';
import PrinterModal from '../components/PrinterModal';

export default function DashboardScreen() {
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [paxCount, setPaxCount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticketingMode, setTicketingMode] = useState<'Manual' | 'Automatic'>('Manual');

  // Fleet Caching & Network Status
  const [fleetSource, setFleetSource] = useState<'live' | 'cache' | 'fleet_bundle'>('fleet_bundle');
  const [isOfflineFleet, setIsOfflineFleet] = useState(false);
  const [isRefreshingFleet, setIsRefreshingFleet] = useState(false);
  const [busSearchQuery, setBusSearchQuery] = useState('');
  const [busFilterTab, setBusFilterTab] = useState<'ALL' | 'TANAUAN' | 'LAUREL'>('ALL');
  const [currentConductorId, setCurrentConductorId] = useState<number | null>(null);

  // Modals state
  const [isPreDepartureVisible, setIsPreDepartureVisible] = useState(false);
  const [isBusDropdownOpen, setIsBusDropdownOpen] = useState(false);
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isLocationInstructionModalVisible, setIsLocationInstructionModalVisible] = useState(false);
  const [isPrinterModalVisible, setIsPrinterModalVisible] = useState(false);
  const printer = usePrinter();

  // Map filter
  const [currentFilter, setCurrentFilter] = useState('ALL ROUTES');
  const [rawBusesList, setRawBusesList] = useState<any[]>([]);

  const webViewRef = useRef<WebView>(null);
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');

  const { activeStep, setActiveStep } = useTourSync('/dashboard');

  useEffect(() => {
    getServerUrl().then(url => setBaseUrl(url));
    AsyncStorage.getItem('byahero_cached_user_id').then(val => {
      if (val) setCurrentConductorId(Number(val));
    }).catch(() => {});
    checkAutoResume();
    loadSetupData();

    // Web-specific listener for iframe communication
    if (Platform.OS === 'web') {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'MAP_READY') {
            fetchLiveBusesForMap();
          }
        } catch (e) { }
      };
      window.addEventListener('message', handleWebMessage);
      return () => {
        window.removeEventListener('message', handleWebMessage);
      };
    }

    // Map refresh loop
    const interval = setInterval(fetchLiveBusesForMap, 15000);
    return () => clearInterval(interval);
  }, [currentFilter]);

  const startTrackingRef = useRef<any>(null);
  const selectBusRef = useRef<any>(null);
  const selectRouteRef = useRef<any>(null);
  const ticketingModeRef = useRef<any>(null);

  const checkAutoResume = async () => {
    const payloadStr = await AsyncStorage.getItem('byahero_conductor_payload');
    if (payloadStr) {
      router.replace('/liveTracking');
    }
  };

  const loadSetupData = async (forceUserFeedback = false) => {
    // 1. Instantly load local cache or bundled fleet so conductor NEVER sees an empty screen
    try {
      const local = await getLocalCachedBuses();
      if (local && Array.isArray(local.buses) && local.buses.length > 0) {
        setBuses(local.buses);
        setFleetSource(local.source as 'cache' | 'fleet_bundle' | 'live');
        setIsOfflineFleet(local.source !== 'cache');
      }

      // Restore last selected bus if available
      const lastBus = await getLastSelectedBus();
      if (lastBus && !selectedBus) {
        const found = local.buses.find((b: any) => (b.id || b.Bus_ID) === (lastBus.id || lastBus.Bus_ID));
        if (found && !found.is_in_use) {
          setSelectedBus(found);
        } else if (!lastBus.is_in_use) {
          setSelectedBus(lastBus);
        }
      }
    } catch (e) {
      console.warn('Error hydrating local fleet:', e);
    }

    // 2. Fetch fresh live buses in the background
    setIsRefreshingFleet(true);
    try {
      const res = await getBusesConductor();
      if (res && res.success && Array.isArray(res.buses) && res.buses.length > 0) {
        setBuses(res.buses);
        await saveBusesToCache(res.buses);
        setFleetSource('live');
        setIsOfflineFleet(false);

        // Keep or sync selected bus with live properties
        if (selectedBus) {
          const match = res.buses.find((b: any) => (b.id || b.Bus_ID) === (selectedBus.id || selectedBus.Bus_ID));
          if (match) {
            if (match.is_in_use) {
              setSelectedBus(null);
              AsyncStorage.removeItem('byahero_conductor_last_selected_bus').catch(() => {});
            } else {
              setSelectedBus(match);
            }
          }
        }

        if (forceUserFeedback) {
          showAlert('Fleet Synchronized', 'Updated active bus units.', 'success');
        }
      } else {
        // Backend unreachable or returned empty; keep local cached fleet
        setIsOfflineFleet(true);
        if (forceUserFeedback) {
          showAlert('Fleet Refreshed', 'Active bus units are ready.', 'info');
        }
      }
      await fetchLiveBusesForMap();
    } catch (e: any) {
      console.warn('Live bus fetch error; preserving cached fleet:', e);
      setIsOfflineFleet(true);
      if (forceUserFeedback) {
        showAlert('Fleet Refreshed', 'Active bus units are ready.', 'info');
      }
    } finally {
      setIsRefreshingFleet(false);
      setIsLoading(false);
    }
  };

  const handleManualFleetRefresh = () => {
    loadSetupData(true);
  };

  const fetchLiveBusesForMap = async () => {
    try {
      const res = await getActiveBuses();
      if (res.success && res.buses) {
        setRawBusesList(res.buses);
        sendBusesToMap(res.buses, currentFilter);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const postToMap = (message: any) => {
    const payload = JSON.stringify(message);
    if (Platform.OS === 'web') {
      (webViewRef.current as any)?.contentWindow?.postMessage(payload, '*');
    } else {
      webViewRef.current?.postMessage(payload);
    }
  };

  const sendBusesToMap = (busesList: any[], filter: string) => {
    const normalized = busesList.map((bus: any) => {
      let coords = null;
      if (bus.current_location) {
        try {
          const geo = JSON.parse(bus.current_location);
          if (geo.geometry) coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
        } catch (e) { }
      }
      if (!coords && bus.lat && bus.lng) coords = [parseFloat(bus.lat), parseFloat(bus.lng)];

      return {
        id: bus.Bus_ID || bus.id,
        code: bus.code || 'BUS',
        route: bus.route || '',
        status: bus.status || 'unavailable',
        coords: coords,
        locName: bus.current_location_name || 'Updating...'
      };
    });

    const filtered = normalized.filter(b =>
      (filter === 'ALL ROUTES' || (b.route && b.route.replace(/\s+/g, '').toUpperCase() === filter.replace(/\s+/g, '').toUpperCase())) &&
      b.status !== 'unavailable' &&
      b.coords !== null &&
      !isNaN(b.coords[0]) && 
      !isNaN(b.coords[1])
    );

    postToMap({
      type: 'UPDATE_BUSES',
      buses: filtered
    });
  };

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
    sendBusesToMap(rawBusesList, filter);
  };

  // Alert Modal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: onCancel ? () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        onCancel();
      } : undefined,
    });
  };

  const handleGrantBgPermission = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      setIsLocationInstructionModalVisible(false);
      if (status === 'granted') {
        setIsPreDepartureVisible(true);
      } else {
        showAlert(
          'Settings Required',
          'Android requires selecting "Allow all the time" in app settings to keep location active in the background.',
          'confirm',
          () => {
            Linking.openSettings();
          },
          () => {
            setIsPreDepartureVisible(true);
          },
          'Open Settings',
          'Continue Anyway'
        );
      }
    } catch (e) {
      setIsLocationInstructionModalVisible(false);
      setIsPreDepartureVisible(true);
    }
  };

  const handleStartTracking = async () => {
    if (!selectedBus) {
      showAlert('Selection Required', 'Please select an active bus unit.', 'warning');
      return;
    }
    if (selectedBus.is_in_use) {
      showAlert('Bus In Use', 'The selected bus unit is currently being operated by another conductor. Please select an available bus.', 'warning');
      return;
    }
    if (!selectedRoute) {
      showAlert('Selection Required', 'Please select a transit route.', 'warning');
      return;
    }
    if (ticketingMode === 'Automatic' && !printer.connectedPrinter) {
      showAlert('Printer Required', 'Please connect a Bluetooth printer before starting tracking in Auto Ticketing mode.', 'warning');
      setIsPrinterModalVisible(true);
      return;
    }

    // Step 1: Request foreground location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'Foreground location permission is required for bus tracking.', 'error');
      return;
    }

    // Step 2: Check background location permission ("Allow all the time")
    const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      setIsLocationInstructionModalVisible(true);
      return;
    }

    setPaxCount('');
    setIsPreDepartureVisible(true);
  };

  const handleConfirmStart = async () => {
    const boardingCount = parseInt(paxCount) || 0;
    const seatsTotal = selectedBus.total_seats || 25;

    setIsLoading(true);
    setIsPreDepartureVisible(false);

    try {
      const startLocName = 'Terminal';
      const res = await startOperation({
        bus_id: selectedBus.id || selectedBus.Bus_ID,
        route: selectedRoute,
        pre_departure_count: boardingCount,
        start_location: startLocName
      });

      let operationId = res?.operation_id;
      let isOfflineSession = false;

      // Handle offline or unreachable network gracefully
      if (!res?.success || !operationId) {
        if (res?.error === 'bus_taken') {
          showAlert('Bus In Use', 'This bus is currently being operated by another conductor. Please select an available bus.', 'error');
          loadSetupData(true);
          setIsLoading(false);
          return;
        }
        const isNetworkIssue = res?.isTimeout || !res?.success;
        if (isNetworkIssue) {
          operationId = `offline_op_${Date.now()}`;
          isOfflineSession = true;
          try {
            const pendingStarts = JSON.parse(await AsyncStorage.getItem('byahero_offline_pending_starts') || '[]');
            pendingStarts.push({
              bus_id: selectedBus.id || selectedBus.Bus_ID,
              route: selectedRoute,
              pre_departure_count: boardingCount,
              start_location: startLocName,
              offline_id: operationId,
              started_at: new Date().toISOString()
            });
            await AsyncStorage.setItem('byahero_offline_pending_starts', JSON.stringify(pendingStarts));
          } catch (_) {}
        } else {
          showAlert('Dispatch Notice', res?.error || 'Could not verify bus assignment with server.', 'warning');
          setIsLoading(false);
          return;
        }
      }

      const initialAvailable = Math.max(0, seatsTotal - boardingCount);
      const payload = {
        bus_id: String(selectedBus.id || selectedBus.Bus_ID),
        code: selectedBus.code || `BUS-${selectedBus.id}`,
        seats_total: seatsTotal,
        route: selectedRoute,
        initial_available_seats: initialAvailable,
        current_seats: initialAvailable,
        current_boarded: boardingCount,
        pending_pre_departure: ticketingMode === 'Automatic' ? boardingCount : 0,
        pre_departure_count: boardingCount,
        operation_id: operationId,
        is_offline_session: isOfflineSession,
        ticketing_mode: ticketingMode,
        is_new_session: true
      };

      if (Platform.OS === 'android' && LocationServiceModule) {
        try {
          LocationServiceModule.updateSessionData({
            bus_id: String(selectedBus.id || selectedBus.Bus_ID),
            code: selectedBus.code || `BUS-${selectedBus.id}`,
            route: selectedRoute,
            seats_total: seatsTotal,
            seats_available: initialAvailable,
            force_seats: true
          });
        } catch (_) {}
      }

      await AsyncStorage.setItem('byahero_conductor_payload', JSON.stringify(payload));
      setPaxCount('');
      router.replace('/liveTracking');
    } catch (e: any) {
      // Offline fallback even on unexpected client exception
      const offlineOpId = `offline_op_${Date.now()}`;
      const payload = {
        bus_id: String(selectedBus.id || selectedBus.Bus_ID),
        code: selectedBus.code || `BUS-${selectedBus.id}`,
        seats_total: seatsTotal,
        route: selectedRoute,
        initial_available_seats: Math.max(0, seatsTotal - boardingCount),
        current_seats: Math.max(0, seatsTotal - boardingCount),
        current_boarded: boardingCount,
        pending_pre_departure: ticketingMode === 'Automatic' ? boardingCount : 0,
        pre_departure_count: boardingCount,
        operation_id: offlineOpId,
        is_offline_session: true,
        ticketing_mode: ticketingMode,
        is_new_session: true
      };
      await AsyncStorage.setItem('byahero_conductor_payload', JSON.stringify(payload));
      setPaxCount('');
      router.replace('/liveTracking');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered bus list for the modal with tab and search support
  const filteredBuses = useMemo(() => {
    return buses.filter(bus => {
      const rawCode = (bus.code || `BUS-${bus.id || bus.Bus_ID || ''}`).toUpperCase();
      const displayLabel = rawCode.startsWith('BUS ')
        ? rawCode
        : rawCode.startsWith('BUS-')
        ? rawCode.replace('BUS-', 'BUS ')
        : `BUS ${rawCode}`;
      
      // Tab filter
      if (busFilterTab === 'TANAUAN' && !rawCode.includes('T-')) return false;
      if (busFilterTab === 'LAUREL' && !rawCode.includes('L-')) return false;

      // Search filter
      if (busSearchQuery.trim()) {
        const query = busSearchQuery.trim().toUpperCase();
        const cleanQuery = query.replace(/^BUS\s*/, '').trim();
        const seats = String(bus.total_seats || 25);
        return (
          rawCode.includes(query) ||
          displayLabel.includes(query) ||
          (cleanQuery ? rawCode.includes(cleanQuery) : false) ||
          seats.includes(query)
        );
      }
      return true;
    });
  }, [buses, busFilterTab, busSearchQuery]);

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ConductorNavbar title="Dashboard" />

      <ScrollView 
        contentContainerStyle={tw`p-5`} 
        style={tw`flex-1`}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshingFleet} 
            onRefresh={() => loadSetupData(true)} 
            colors={['#1D5CAE']} 
          />
        }
      >
        {/* Top Actions: Filter Button */}
        <View style={tw`flex-row justify-center mb-3`}>
          <TouchableOpacity
            onPress={() => setIsFilterDropdownOpen(true)}
            style={tw`bg-white px-5 py-2.5 rounded-3xl flex-row items-center justify-center gap-2 shadow-sm border border-slate-200`}
          >
            <Text style={tw`text-[13px] font-bold text-slate-700`}>FILTER ROUTES</Text>
            <Ionicons name="swap-vertical" size={16} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Dispatch Map Container */}
        <View style={tw`mb-5 bg-white rounded-3xl p-1.5 border border-slate-200 shadow-sm overflow-hidden`}>
          <View style={{ height: 260, borderRadius: 20, overflow: 'hidden' }}>
            {Platform.OS === 'web' ? (
              <iframe
                ref={webViewRef as any}
                srcDoc={getConductorLeafletHTML(baseUrl)}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: getConductorLeafletHTML(baseUrl) }}
                style={StyleSheet.absoluteFillObject}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'MAP_READY') {
                      fetchLiveBusesForMap();
                    }
                  } catch(e) {}
                }}
              />
            )}
          </View>
        </View>

        {/* Selector Panel */}
        <View style={tw`bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6`}>
          {/* Card Header & Mode Switch */}
          <View style={tw`items-center mb-7`}>
            <Text style={tw`text-lg font-bold text-slate-900 mb-4`}>Route Dispatch Setup</Text>
            
            {/* Ticketing Mode Switch */}
            <View 
              ref={ticketingModeRef}
              onLayout={() => handleTourLayout('ticketing-mode', ticketingModeRef)}
              style={tw`flex-row bg-slate-100 rounded-full p-1 w-full max-w-[280px]`}
            >
              <TouchableOpacity
                onPress={() => setTicketingMode('Manual')}
                style={tw`flex-1 py-2.5 rounded-full ${ticketingMode === 'Manual' ? 'bg-blue-600 shadow-sm' : ''}`}
              >
                <Text style={tw`text-center font-bold text-[13px] ${ticketingMode === 'Manual' ? 'text-white' : 'text-slate-500'}`}>
                  Manual Counting
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTicketingMode('Automatic')}
                style={tw`flex-1 py-2.5 rounded-full ${ticketingMode === 'Automatic' ? 'bg-blue-600 shadow-sm' : ''}`}
              >
                <Text style={tw`text-center font-bold text-[13px] ${ticketingMode === 'Automatic' ? 'text-white' : 'text-slate-500'}`}>
                  Auto Ticketing
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Bus Select */}
          <View ref={selectBusRef} onLayout={() => handleTourLayout('select-bus', selectBusRef)} style={tw`mb-5`}>
            <View style={tw`mb-2`}>
              <Text style={tw`text-[10px] font-bold text-slate-500 uppercase tracking-wider`}>ACTIVE BUS UNIT</Text>
            </View>
            <View>
              <TouchableOpacity
                onPress={() => setIsBusDropdownOpen(true)}
                style={tw`flex-row justify-between items-center bg-white border border-slate-100 shadow-sm rounded-xl px-4 py-3.5`}
              >
                <Text style={tw`text-sm font-bold flex-1 ${selectedBus ? 'text-slate-900' : 'text-slate-500'}`}>
                  {selectedBus ? `${selectedBus.code} (${selectedBus.total_seats} seats)` : 'Select Bus Unit'}
                </Text>
                <Ionicons name="caret-down" size={16} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scheduled Route Select */}
          <View ref={selectRouteRef} onLayout={() => handleTourLayout('select-route', selectRouteRef)} style={tw`mb-8`}>
            <Text style={tw`text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider`}>SCHEDULED TRANSIT ROUTE</Text>
            <View>
              <TouchableOpacity
                onPress={() => setIsRouteDropdownOpen(true)}
                style={tw`flex-row justify-between items-center bg-white border border-slate-100 shadow-sm rounded-xl px-4 py-3.5`}
              >
                <Text style={tw`text-sm font-bold ${selectedRoute ? 'text-slate-900' : 'text-slate-500'}`}>
                  {selectedRoute || 'Select Route'}
                </Text>
                <Ionicons name="caret-down" size={16} color="#1e293b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bluetooth Printer Setup - Only shown for Auto Ticketing */}
          {ticketingMode === 'Automatic' && (
            <View style={tw`mb-8`}>
              <Text style={tw`text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider`}>BLUETOOTH PRINTER</Text>
              <TouchableOpacity
                onPress={() => setIsPrinterModalVisible(true)}
                style={tw`flex-row justify-between items-center bg-white border border-slate-100 shadow-sm rounded-xl px-4 py-3.5`}
              >
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="print-outline" size={18} color={printer.connectedPrinter ? '#3b82f6' : '#64748b'} style={tw`mr-2`} />
                  <Text style={tw`text-sm font-bold ${printer.connectedPrinter ? 'text-blue-600' : 'text-slate-900'}`}>
                    {printer.connectedPrinter ? printer.connectedPrinter.name || 'Printer Connected' : 'Connect Printer'}
                  </Text>
                </View>
                <Ionicons name={printer.connectedPrinter ? "checkmark-circle" : "chevron-forward"} size={20} color={printer.connectedPrinter ? "#3b82f6" : "#cbd5e1"} />
              </TouchableOpacity>
            </View>
          )}

          {/* Start Tracking Button */}
          <View ref={startTrackingRef} onLayout={() => handleTourLayout('start-tracking', startTrackingRef)}>
            <TouchableOpacity
              onPress={handleStartTracking}
              disabled={isLoading}
              style={tw`w-full items-center justify-center mt-2 mb-2`}
            >
            {isLoading ? (
              <View style={tw`bg-[#1D5CAE] rounded-[35px] w-full py-4 items-center justify-center shadow-md`}>
                <ActivityIndicator color="white" />
              </View>
            ) : (
              <Image 
                source={require('../../assets/images/startTrackingButton.svg')}
                style={tw`w-full h-16`} 
                contentFit="contain"
              />
            )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Select Bus Modal with Search, Tabs, and Offline Resilience */}
      <Modal visible={isBusDropdownOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-5`}>
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-200 h-[75%] max-h-[580px]`}>
            {/* Modal Header */}
            <View style={tw`flex-row items-center justify-between pb-3 border-b border-slate-100`}>
              <View>
                <Text style={tw`text-base font-black text-slate-800 tracking-tight`}>Select Active Bus</Text>
                <Text style={tw`text-[11px] text-slate-500 font-medium`}>Choose unassigned bus unit</Text>
              </View>
              <View style={tw`flex-row items-center gap-2`}>
                <TouchableOpacity 
                  onPress={handleManualFleetRefresh} 
                  disabled={isRefreshingFleet}
                  style={tw`p-2 rounded-xl bg-slate-100 active:bg-slate-200`}
                >
                  <Ionicons name="refresh" size={16} color={isRefreshingFleet ? '#94a3b8' : '#1e293b'} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setIsBusDropdownOpen(false)}
                  style={tw`p-2 rounded-xl bg-slate-100 active:bg-slate-200`}
                >
                  <Ionicons name="close" size={16} color="#1e293b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Corridor Tabs */}
            <View style={tw`flex-row gap-1.5 mt-3 mb-2 bg-slate-100 p-1 rounded-xl`}>
              {(['ALL', 'TANAUAN', 'LAUREL'] as const).map(tab => {
                const isActive = busFilterTab === tab;
                const label = tab === 'ALL' ? `All (${buses.length})` : tab === 'TANAUAN' ? 'Tanauan (T-)' : 'Laurel (L-)';
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setBusFilterTab(tab)}
                    style={tw`flex-1 py-1.5 rounded-lg items-center ${isActive ? 'bg-white shadow-sm' : ''}`}
                  >
                    <Text style={tw`text-[11px] font-bold ${isActive ? 'text-[#1D5CAE]' : 'text-slate-500'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search Input */}
            <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-3`}>
              <Ionicons name="search" size={15} color="#94a3b8" style={tw`mr-2`} />
              <TextInput
                value={busSearchQuery}
                onChangeText={setBusSearchQuery}
                placeholder="Search bus (e.g. 05, T-00001)..."
                placeholderTextColor="#94a3b8"
                style={tw`flex-1 text-xs text-slate-800 font-semibold p-0`}
              />
              {busSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setBusSearchQuery('')}>
                  <Ionicons name="close-circle" size={15} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Bus Items List */}
            <ScrollView style={tw`flex-1 my-1`} contentContainerStyle={tw`pb-2`} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
              {filteredBuses.map((bus: any) => {
                const id = bus.id || bus.Bus_ID;
                const rawCode = bus.code || `BUS-${id}`;
                const displayLabel = rawCode.toUpperCase().startsWith('BUS ')
                  ? rawCode.toUpperCase()
                  : rawCode.toUpperCase().startsWith('BUS-')
                  ? rawCode.toUpperCase().replace('BUS-', 'BUS ')
                  : `BUS ${rawCode.toUpperCase()}`;
                const isSelected = selectedBus && (selectedBus.id || selectedBus.Bus_ID) === id;
                const isInUse = Boolean(
                  bus.is_in_use ||
                  (bus.current_conductor_id && currentConductorId && Number(bus.current_conductor_id) !== Number(currentConductorId))
                );

                return (
                  <TouchableOpacity
                    key={id}
                    disabled={isInUse}
                    activeOpacity={isInUse ? 1 : 0.7}
                    onPress={() => {
                      if (isInUse) return;
                      setSelectedBus(bus);
                      saveLastSelectedBus(bus);
                      setIsBusDropdownOpen(false);
                    }}
                    style={tw`py-3 px-4 mb-2.5 rounded-2xl border items-center justify-center ${
                      isInUse
                        ? 'bg-white border-slate-200 shadow-xs'
                        : isSelected 
                        ? 'bg-[#1D5CAE] border-[#1D5CAE] shadow-sm' 
                        : 'bg-white border-slate-200 active:bg-slate-50 shadow-xs'
                    }`}
                  >
                    <Text
                      style={tw`text-sm font-black tracking-wider ${
                        isInUse
                          ? 'text-[#5C82B8]'
                          : isSelected
                          ? 'text-white'
                          : 'text-[#1D5CAE]'
                      }`}
                    >
                      {displayLabel}
                    </Text>
                    {isInUse && (
                      <View style={tw`bg-slate-100 px-3 py-0.5 rounded-full mt-1 items-center justify-center`}>
                        <Text style={tw`text-[9px] font-black tracking-wider text-rose-600`}>
                          IN USE
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {filteredBuses.length === 0 && (
                <View style={tw`py-8 items-center justify-center`}>
                  <Ionicons name="alert-circle-outline" size={32} color="#cbd5e1" />
                  <Text style={tw`text-slate-500 text-xs font-semibold mt-2`}>
                    {busSearchQuery ? `No buses matching "${busSearchQuery}"` : 'No buses found in this tab'}
                  </Text>
                  {busSearchQuery ? (
                    <TouchableOpacity onPress={() => setBusSearchQuery('')} style={tw`mt-2`}>
                      <Text style={tw`text-xs text-blue-600 font-bold`}>Clear search</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleManualFleetRefresh} style={tw`mt-2 px-3 py-1.5 rounded-xl bg-blue-50`}>
                      <Text style={tw`text-xs text-[#1D5CAE] font-bold`}>Refresh Fleet</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity 
              onPress={() => setIsBusDropdownOpen(false)} 
              style={tw`mt-3 bg-slate-100 active:bg-slate-200 rounded-xl py-3 items-center`}
            >
              <Text style={tw`text-slate-700 font-bold text-xs`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Select Route Modal */}
      <Modal visible={isRouteDropdownOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-200`}>
            <Text style={tw`text-slate-800 font-bold mb-4`}>Select Route</Text>
            {['LAUREL - TANAUAN', 'TANAUAN - LAUREL'].map(route => (
              <TouchableOpacity
                key={route}
                onPress={() => {
                  setSelectedRoute(route);
                  setIsRouteDropdownOpen(false);
                }}
                style={tw`py-3 border-b border-slate-100`}
              >
                <Text style={tw`font-semibold text-slate-700`}>{route}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setIsRouteDropdownOpen(false)} style={tw`mt-4 bg-slate-100 rounded-xl py-2.5 items-center`}>
              <Text style={tw`text-slate-700 font-bold`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pre-Departure Modal */}
      <Modal visible={isPreDepartureVisible} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 border border-slate-200 items-center`}>
            <Text style={tw`text-slate-800 text-lg font-bold mb-2`}>Pre-Departure Check</Text>
            <Text style={tw`text-slate-500 text-xs text-center mb-4`}>
              How many passengers have already boarded?
            </Text>

            <TextInput
              value={paxCount}
              onChangeText={setPaxCount}
              placeholder="0"
              keyboardType="number-pad"
              style={tw`w-28 text-center text-4xl font-extrabold border-0 bg-slate-100 rounded-2xl py-4 mb-4 text-slate-800`}
            />

            <Text style={tw`text-slate-400 text-xs mb-6`}>
              Maximum seats: {selectedBus?.total_seats || 25}
            </Text>

            <View style={tw`flex-row gap-3 w-full`}>
              <TouchableOpacity
                onPress={() => setIsPreDepartureVisible(false)}
                style={tw`flex-1 bg-slate-100 rounded-xl py-3 items-center`}
              >
                <Text style={tw`text-slate-600 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmStart}
                style={tw`flex-1 bg-[#0f3878] rounded-xl py-3 items-center`}
              >
                <Text style={tw`text-white font-bold`}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Route Modal */}
      <Modal visible={isFilterDropdownOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-200`}>
            <Text style={tw`text-slate-800 font-bold mb-4`}>Filter Routes</Text>
            {['ALL ROUTES', 'LAUREL - TANAUAN', 'TANAUAN - LAUREL'].map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  handleFilterChange(f);
                  setIsFilterDropdownOpen(false);
                }}
                style={tw`py-3 border-b border-slate-100 flex-row justify-between items-center`}
              >
                <Text style={tw`font-semibold ${currentFilter === f ? 'text-[#2563eb]' : 'text-slate-700'}`}>{f}</Text>
                {currentFilter === f && <Ionicons name="checkmark" size={20} color="#2563eb" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setIsFilterDropdownOpen(false)} style={tw`mt-4 bg-slate-100 rounded-xl py-2.5 items-center`}>
              <Text style={tw`text-slate-700 font-bold`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Background Location Instruction Modal */}
      <Modal
        visible={isLocationInstructionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLocationInstructionModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/60 items-center justify-center p-5`}>
          <View style={tw`bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100`}>
            {/* Header Icon */}
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-16 h-16 rounded-full bg-emerald-50 items-center justify-center border-4 border-emerald-100 mb-3`}>
                <Ionicons name="location" size={32} color="#059669" />
              </View>
              <View style={tw`bg-emerald-100 px-3 py-1 rounded-full flex-row items-center gap-1.5`}>
                <Ionicons name="shield-checkmark" size={14} color="#047857" />
                <Text style={tw`text-[11px] font-bold text-emerald-800 tracking-wider uppercase`}>Location Setup</Text>
              </View>
            </View>

            {/* Title & Body */}
            <Text style={tw`text-xl font-black text-slate-900 text-center mb-2`}>
              Enable "Allow All The Time"
            </Text>
            <Text style={tw`text-xs text-slate-600 text-center leading-5 mb-5`}>
              Before starting tracking, please enable continuous location access so passengers can track your bus even when your screen is locked.
            </Text>

            {/* Steps Card */}
            <View style={tw`bg-slate-50 rounded-2xl p-4 border border-slate-200 gap-3.5 mb-6`}>
              <View style={tw`flex-row items-center gap-3`}>
                <View style={tw`w-6 h-6 rounded-full bg-slate-800 items-center justify-center`}>
                  <Text style={tw`text-xs font-bold text-white`}>1</Text>
                </View>
                <Text style={tw`text-xs font-bold text-slate-700 flex-1`}>
                  Tap <Text style={tw`text-emerald-700 font-extrabold`}>"Grant Permission"</Text> below
                </Text>
              </View>

              <View style={tw`flex-row items-center gap-3`}>
                <View style={tw`w-6 h-6 rounded-full bg-slate-800 items-center justify-center`}>
                  <Text style={tw`text-xs font-bold text-white`}>2</Text>
                </View>
                <Text style={tw`text-xs font-bold text-slate-700 flex-1`}>
                  Select <Text style={tw`text-emerald-700 font-extrabold`}>"Allow all the time"</Text> in Android settings
                </Text>
              </View>

              <View style={tw`flex-row items-center gap-3`}>
                <View style={tw`w-6 h-6 rounded-full bg-slate-800 items-center justify-center`}>
                  <Text style={tw`text-xs font-bold text-white`}>3</Text>
                </View>
                <Text style={tw`text-xs font-bold text-slate-700 flex-1`}>
                  Ensure <Text style={tw`text-emerald-700 font-extrabold`}>"Use precise location"</Text> is ON
                </Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={handleGrantBgPermission}
              style={tw`bg-emerald-600 rounded-2xl py-3.5 items-center justify-center shadow-md mb-2.5`}
            >
              <Text style={tw`text-white font-bold text-sm uppercase tracking-wider`}>Grant Permission</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsLocationInstructionModalVisible(false);
                setIsPreDepartureVisible(true);
              }}
              style={tw`bg-slate-100 rounded-2xl py-3 items-center justify-center border border-slate-200`}
            >
              <Text style={tw`text-slate-600 font-bold text-xs uppercase tracking-wider`}>Skip & Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PrinterModal 
        visible={isPrinterModalVisible}
        onClose={() => setIsPrinterModalVisible(false)}
        devices={printer.devices}
        pairedDevices={printer.pairedDevices}
        isScanning={printer.isScanning}
        onScan={printer.scanDevices}
        onConnect={(device) => {
          printer.connectPrinter(device);
          setIsPrinterModalVisible(false);
        }}
        connectedPrinter={printer.connectedPrinter}
        onTestPrint={printer.testPrint}
        onDisconnect={printer.disconnectPrinter}
        onReconnect={() => printer.reconnectPrinter()}
        isPrinterOffline={printer.isPrinterOffline}
        paperCount={printer.paperCount}
        maxPaperCapacity={printer.maxPaperCapacity}
        paperWarning={printer.paperWarning}
        onResetPaperRoll={printer.resetPaperRoll}
      />

      {/* Tour Overlay */}
      {activeStep !== null && (
        <TourOverlay 
          currentStep={activeStep} 
          onStepChange={setActiveStep} 
          onClose={() => setActiveStep(null)} 
        />
      )}

      {/* Standard Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </SafeAreaView>
  );
}
