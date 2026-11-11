import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { IPrinterDevice, PaperWarningStatus } from '../hooks/usePrinter';

export interface ISessionReceipt {
  id: string;
  busNumber: string;
  date: string;
  boarding: string;
  alighting: string;
  fare: number;
  discount: string;
  quantity: number;
  ticketNumber: string;
  breakdown?: Record<string, number>;
  baseRegularFare?: number;
  baseDiscountedFare?: number;
  printStatus: 'printed' | 'failed' | 'pending';
  reprintCount?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  busCode?: string;
  route?: string;
  connectedPrinter: IPrinterDevice | null;
  isPrinterOffline: boolean;
  isScanning: boolean;
  paperWarning: PaperWarningStatus;
  onReconnect: () => Promise<boolean> | void;
  onOpenPrinterModal: () => void;
  onPressInterimSummary: () => void;
  receipts: ISessionReceipt[];
  reprintingReceiptId: string | null;
  onReprintReceipt: (receipt: ISessionReceipt) => Promise<void> | void;
}

/**
 * Offcanvas session drawer for Auto Ticketing live tracking mode.
 * Houses the Printer Status card, Print Interim Summary action, and Receipts reprint list.
 */
export default function AutoTicketingDrawer({
  visible,
  onClose,
  busCode,
  route,
  connectedPrinter,
  isPrinterOffline,
  isScanning,
  paperWarning,
  onReconnect,
  onOpenPrinterModal,
  onPressInterimSummary,
  receipts,
  reprintingReceiptId,
  onReprintReceipt,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [modalMounted, setModalMounted] = useState(visible);
  const [activeView, setActiveView] = useState<'menu' | 'receipts'>('menu');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'needs_reprint'>('all');

  const slideAnim = useRef(new Animated.Value(width)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const visibleRef = useRef(visible);
  const isMountedRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (visible) {
      setActiveView('menu');
      setReceiptFilter('all');
      isMountedRef.current = true;
      setModalMounted(true);
      slideAnim.setValue(width);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0.5, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    } else if (isMountedRef.current) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: width, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        if (!visibleRef.current) {
          isMountedRef.current = false;
          setModalMounted(false);
        }
      });
    }
  }, [visible, width, backdropOpacity, slideAnim]);

  const handleClose = () => {
    onClose();
  };

  const failedCount = receipts.filter(r => r.printStatus === 'failed').length;
  const needReprintCount = receipts.filter(r => r.printStatus !== 'printed').length;
  const filteredReceipts =
    receiptFilter === 'needs_reprint'
      ? receipts.filter(r => r.printStatus !== 'printed')
      : receipts;

  const getPrinterVisual = () => {
    if (!connectedPrinter) {
      return {
        dotColor: 'bg-rose-500',
        badgeBg: 'bg-rose-50 border-rose-200',
        iconBg: 'bg-rose-100',
        iconName: 'print-outline' as const,
        iconColor: '#e11d48',
        titleColor: 'text-rose-700',
        label: 'Not Connected',
        detail: 'No Bluetooth printer connected yet.',
      };
    }
    if (isPrinterOffline) {
      return {
        dotColor: 'bg-rose-500',
        badgeBg: 'bg-rose-50 border-rose-200',
        iconBg: 'bg-rose-100',
        iconName: 'alert-circle' as const,
        iconColor: '#e11d48',
        titleColor: 'text-rose-700',
        label: 'Offline / Disconnected',
        detail: `${connectedPrinter.name || 'Printer'} lost Bluetooth link.`,
      };
    }
    if (paperWarning === 'out_of_paper') {
      return {
        dotColor: 'bg-rose-500',
        badgeBg: 'bg-rose-50 border-rose-200',
        iconBg: 'bg-rose-100',
        iconName: 'newspaper-outline' as const,
        iconColor: '#e11d48',
        titleColor: 'text-rose-700',
        label: 'Out of Paper',
        detail: `${connectedPrinter.name || 'Printer'} • Load a new 58mm roll.`,
      };
    }
    if (paperWarning === 'out_or_jammed') {
      return {
        dotColor: 'bg-rose-500',
        badgeBg: 'bg-rose-50 border-rose-200',
        iconBg: 'bg-rose-100',
        iconName: 'newspaper-outline' as const,
        iconColor: '#e11d48',
        titleColor: 'text-rose-700',
        label: 'Check Paper / Cover Open',
        detail: `${connectedPrinter.name || 'Printer'} • Check thermal roll.`,
      };
    }
    return {
      dotColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 border-emerald-200',
      iconBg: 'bg-emerald-100',
      iconName: 'print' as const,
      iconColor: '#059669',
      titleColor: 'text-emerald-700',
      label: 'Connected',
      detail: connectedPrinter.name || connectedPrinter.macAddress,
    };
  };

  const pVis = getPrinterVisual();

  return (
    <Modal animationType="none" transparent visible={modalMounted} onRequestClose={handleClose}>
      <View style={tw`flex-1 flex-row justify-end relative`}>
        <Animated.View style={[tw`absolute inset-0 bg-black`, { opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={tw`flex-1`} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View
          style={[
            tw`bg-[#f3f4f6] h-full shadow-lg`,
            { width: width * 0.86, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Navy Header matching Dashboard Drawer */}
          <View
            style={[
              tw`bg-[#0f3878] px-4 pb-4`,
              {
                borderBottomLeftRadius: 18,
                borderBottomRightRadius: 18,
                paddingTop: insets.top + 14,
              },
            ]}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center flex-1 mr-2`}>
                {activeView === 'receipts' && (
                  <TouchableOpacity
                    onPress={() => setActiveView('menu')}
                    style={tw`w-9 h-9 rounded-full bg-white/15 items-center justify-center mr-2.5`}
                  >
                    <Ionicons name="arrow-back" size={20} color="white" />
                  </TouchableOpacity>
                )}
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white font-black text-xl tracking-wide`} numberOfLines={1}>
                    {activeView === 'receipts' ? 'Receipts' : 'Auto Ticketing'}
                  </Text>
                  <Text style={tw`text-white/75 text-xs font-medium mt-0.5`} numberOfLines={1}>
                    {activeView === 'receipts'
                      ? `${receipts.length} recorded this trip`
                      : [busCode || 'Bus Live', route].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={handleClose} style={tw`p-2`}>
                <Text style={tw`text-white text-xl font-bold`}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={tw`h-[3px] bg-white/80 mt-3.5 rounded-full`} />
          </View>

          {activeView === 'menu' ? (
            <ScrollView
              style={tw`flex-1`}
              contentContainerStyle={[tw`p-4 gap-3.5`, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Printer Status Card */}
              <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-slate-100`}>
                <View style={tw`flex-row items-center justify-between mb-3`}>
                  <Text style={tw`text-[10px] font-black text-slate-400 uppercase tracking-widest`}>
                    Printer Status
                  </Text>
                  <View style={tw`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${pVis.badgeBg}`}>
                    <View style={tw`w-2 h-2 rounded-full ${pVis.dotColor}`} />
                    <Text style={tw`text-[10px] font-extrabold ${pVis.titleColor}`}>
                      {pVis.label}
                    </Text>
                  </View>
                </View>

                <View style={tw`flex-row items-center gap-3 mb-3.5`}>
                  <View style={tw`w-11 h-11 rounded-2xl ${pVis.iconBg} items-center justify-center`}>
                    <Ionicons name={pVis.iconName} size={22} color={pVis.iconColor} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-sm font-extrabold text-slate-800`} numberOfLines={1}>
                      {connectedPrinter ? (connectedPrinter.name || 'Bluetooth Printer') : 'No Printer Paired'}
                    </Text>
                    <Text style={tw`text-xs text-slate-500 mt-0.5`} numberOfLines={2}>
                      {pVis.detail}
                    </Text>
                  </View>
                </View>

                <View style={tw`flex-row gap-2`}>
                  {connectedPrinter && (
                    <TouchableOpacity
                      onPress={() => onReconnect()}
                      disabled={isScanning}
                      style={tw`flex-1 py-2.5 rounded-xl items-center justify-center flex-row ${
                        isPrinterOffline
                          ? 'bg-rose-600'
                          : 'bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {isScanning ? (
                        <ActivityIndicator size="small" color={isPrinterOffline ? '#fff' : '#0f3878'} />
                      ) : (
                        <>
                          <Ionicons
                            name="refresh"
                            size={14}
                            color={isPrinterOffline ? '#ffffff' : '#0f3878'}
                            style={tw`mr-1.5`}
                          />
                          <Text
                            style={tw`text-xs font-bold ${
                              isPrinterOffline ? 'text-white' : 'text-[#0f3878]'
                            }`}
                          >
                            Reconnect
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      handleClose();
                      onOpenPrinterModal();
                    }}
                    style={tw`flex-1 py-2.5 rounded-xl bg-[#0f3878] items-center justify-center flex-row`}
                  >
                    <Ionicons name="settings-outline" size={14} color="white" style={tw`mr-1.5`} />
                    <Text style={tw`text-xs font-bold text-white`}>
                      {connectedPrinter ? 'Printer Setup' : 'Connect Printer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 2. Print Interim Summary Option */}
              <TouchableOpacity
                onPress={() => {
                  handleClose();
                  onPressInterimSummary();
                }}
                activeOpacity={0.8}
                style={tw`bg-white rounded-2xl flex-row items-center p-4 shadow-sm border border-slate-100`}
              >
                <View style={tw`w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center mr-3.5`}>
                  <Ionicons name="print-outline" size={22} color="#0f3878" />
                </View>
                <View style={tw`flex-1 mr-2`}>
                  <Text style={tw`text-[#111827] font-extrabold text-sm`}>
                    Print Interim Summary
                  </Text>
                  <Text style={tw`text-slate-500 text-xs mt-0.5`}>
                    Print current mid-trip revenue & tickets
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* 3. Receipts Option (Reprint recorded/failed receipts) */}
              <TouchableOpacity
                onPress={() => setActiveView('receipts')}
                activeOpacity={0.8}
                style={tw`bg-white rounded-2xl flex-row items-center p-4 shadow-sm border border-slate-100`}
              >
                <View
                  style={tw`w-11 h-11 rounded-2xl ${
                    failedCount > 0 ? 'bg-rose-50' : 'bg-emerald-50'
                  } items-center justify-center mr-3.5`}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={22}
                    color={failedCount > 0 ? '#e11d48' : '#059669'}
                  />
                </View>
                <View style={tw`flex-1 mr-2`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <Text style={tw`text-[#111827] font-extrabold text-sm`}>Receipts</Text>
                    {receipts.length > 0 && (
                      <View style={tw`bg-slate-100 px-2 py-0.5 rounded-full`}>
                        <Text style={tw`text-[10px] font-black text-slate-700`}>
                          {receipts.length}
                        </Text>
                      </View>
                    )}
                    {failedCount > 0 && (
                      <View style={tw`bg-rose-100 px-2 py-0.5 rounded-full`}>
                        <Text style={tw`text-[10px] font-black text-rose-700`}>
                          {failedCount} Failed
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={tw`text-slate-500 text-xs mt-0.5`}>
                    {receipts.length === 0
                      ? 'Recorded receipts appear here for reprint'
                      : 'View or reprint receipts if paper ran out'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={tw`flex-1`}>
              {/* Filter Pills inside Receipts view */}
              {receipts.length > 0 && (
                <View style={tw`flex-row gap-2 px-4 pt-3 pb-1`}>
                  <TouchableOpacity
                    onPress={() => setReceiptFilter('all')}
                    style={tw`px-3 py-1.5 rounded-full border ${
                      receiptFilter === 'all'
                        ? 'bg-[#0f3878] border-[#0f3878]'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      style={tw`text-xs font-bold ${
                        receiptFilter === 'all' ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      All ({receipts.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setReceiptFilter('needs_reprint')}
                    style={tw`px-3 py-1.5 rounded-full border ${
                      receiptFilter === 'needs_reprint'
                        ? 'bg-rose-600 border-rose-600'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      style={tw`text-xs font-bold ${
                        receiptFilter === 'needs_reprint' ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      Failed / Pending ({needReprintCount})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={[tw`p-4 gap-3`, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
              >
                {filteredReceipts.length === 0 ? (
                  <View style={tw`bg-white rounded-2xl p-8 items-center justify-center border border-slate-100 mt-4`}>
                    <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
                    <Text style={tw`text-sm font-bold text-slate-600 mt-3 text-center`}>
                      {receiptFilter === 'needs_reprint'
                        ? 'No failed or unprinted receipts'
                        : 'No receipts recorded yet'}
                    </Text>
                    <Text style={tw`text-xs text-slate-400 mt-1 text-center leading-relaxed`}>
                      {receiptFilter === 'needs_reprint'
                        ? 'All issued tickets printed normally. Switch to "All" if a paper roll ran out mid-slip.'
                        : 'Issued tickets in this Auto Ticketing session will appear here so you can reprint them anytime.'}
                    </Text>
                  </View>
                ) : (
                  filteredReceipts.map(item => {
                    const isBusy = reprintingReceiptId === item.id;
                    const statusBadge =
                      item.printStatus === 'printed'
                        ? { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: item.reprintCount ? `Printed (x${item.reprintCount + 1})` : 'Printed' }
                        : item.printStatus === 'failed'
                        ? { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', label: 'Print Failed' }
                        : { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Not Printed' };

                    return (
                      <View
                        key={item.id}
                        style={tw`bg-white rounded-2xl p-4 shadow-sm border ${
                          item.printStatus === 'failed' ? 'border-rose-200' : 'border-slate-100'
                        }`}
                      >
                        <View style={tw`flex-row items-center justify-between mb-2`}>
                          <Text style={tw`font-mono text-xs font-black text-[#0f3878]`}>
                            TKT-{item.ticketNumber}
                          </Text>
                          <View style={tw`px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
                            <Text style={tw`text-[10px] font-extrabold ${statusBadge.text}`}>
                              {statusBadge.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={tw`text-xs font-bold text-slate-800`} numberOfLines={2}>
                          {item.boarding} → {item.alighting}
                        </Text>
                        <Text style={tw`text-[11px] text-slate-500 mt-1`}>
                          {item.date} • {item.quantity} pax ({item.discount})
                        </Text>

                        <View style={tw`flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100`}>
                          <Text style={tw`text-sm font-black text-slate-800`}>
                            ₱{Number(item.fare).toFixed(2)}
                          </Text>
                          <TouchableOpacity
                            onPress={() => onReprintReceipt(item)}
                            disabled={reprintingReceiptId !== null}
                            style={tw`px-3.5 py-2 rounded-xl flex-row items-center ${
                              item.printStatus === 'failed' ? 'bg-rose-600' : 'bg-[#0f3878]'
                            } ${reprintingReceiptId !== null && !isBusy ? 'opacity-50' : ''}`}
                          >
                            {isBusy ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <>
                                <Ionicons name="print-outline" size={14} color="white" style={tw`mr-1.5`} />
                                <Text style={tw`text-white font-bold text-xs`}>
                                  {item.printStatus === 'pending' ? 'Print' : 'Reprint'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
