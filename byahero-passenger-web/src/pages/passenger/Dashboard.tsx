import React, { useState, useCallback } from 'react';
import PassengerNavbar from '../../components/PassengerNavbar';
import PassengerFooter from '../../components/PassengerFooter';
import PassengerMap from '../../components/PassengerMap';
import PassengerBottomSheet, { SheetTab } from '../../components/PassengerBottomSheet';
import WaitingStatusModal from '../../components/WaitingStatusModal';
import BoardingPromptModal from '../../components/BoardingPromptModal';
import DepartingPromptModal from '../../components/DepartingPromptModal';
import TourOverlay from '../../components/TourOverlay';
import OfflineBanner from '../../components/OfflineBanner';
import { useTracking } from '../../context/TrackingContext';
import { resolveBusLocationName } from '../../utils/locationUtils';
import { Bus, MapPin, Sparkles } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    userLocation,
    busStops,
    isWaiting,
    waitingLocation,
    waitingSecondsLeft,
    setWaitingStatus,
    cancelWaitingStatus,
    isBoarded,
    boardedBus,
    boardedRoute,
    pendingBoardBus,
    pendingDepartBus,
    acceptBoard,
    rejectBoard,
    acceptDepart,
    rejectDepart,
  } = useTracking();

  const [currentTab, setCurrentTab] = useState<SheetTab>('location');
  const [waitingModalOpen, setWaitingModalOpen] = useState(false);
  const [waitingFeedback, setWaitingFeedback] = useState<'waiting' | 'cancelled' | null>(null);
  const [isUpdatingWaiting, setIsUpdatingWaiting] = useState(false);

  const handleOpenWaitingModal = useCallback(() => {
    setWaitingModalOpen(true);
  }, []);

  // Guided tour state
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Helper to resolve nearest stop name
  const resolveNearestStop = () => {
    if (!userLocation) return 'Roadside Pickup Point';

    // 1. Check GeoJSON polygon
    const polygonName = resolveBusLocationName(userLocation.lat, userLocation.lng);
    if (polygonName) return polygonName;

    // 2. Proximity check with database busStops
    let closestStop: any = null;
    let minDistance = Infinity;

    if (busStops && busStops.length > 0) {
      for (const stop of busStops) {
        const sLat = parseFloat((stop.lat || stop.latitude) as string);
        const sLng = parseFloat((stop.lng || stop.longitude) as string);
        if (!isNaN(sLat) && !isNaN(sLng)) {
          const R = 6371; // km
          const dLat = (userLocation.lat - sLat) * Math.PI / 180;
          const dLon = (userLocation.lng - sLng) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(sLat * Math.PI / 180) *
            Math.cos(userLocation.lat * Math.PI / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;

          if (distance < minDistance) {
            minDistance = distance;
            closestStop = stop;
          }
        }
      }

      if (closestStop) {
        const stopName = closestStop.name || closestStop.location_name;
        if (minDistance <= 0.15) return stopName;
        if (minDistance <= 5.0) return `Near ${stopName}`;
      }
    }

    return closestStop ? `Near ${closestStop.name}` : 'Roadside Pickup Point';
  };

  const handleSetWaitingAction = async (stopName: string) => {
    setIsUpdatingWaiting(true);
    const success = await setWaitingStatus(stopName);
    setIsUpdatingWaiting(false);

    if (success) {
      setWaitingFeedback('waiting');
      setTimeout(() => {
        setWaitingFeedback(null);
        setWaitingModalOpen(false);
      }, 2000);
    }
  };

  const handleCancelWaitingAction = async () => {
    setIsUpdatingWaiting(true);
    const success = await cancelWaitingStatus();
    setIsUpdatingWaiting(false);

    if (success) {
      setWaitingFeedback('cancelled');
      setTimeout(() => {
        setWaitingFeedback(null);
        setWaitingModalOpen(false);
      }, 2000);
    }
  };

  return (
    <div className="relative w-screen h-[100dvh] flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <PassengerNavbar onStartTour={() => setTourStep(0)} />

      {/* Offline banner */}
      <OfflineBanner topOffset={64} />

      {/* Boarded Floating Top Banner */}
      {isBoarded && (
        <div className="bg-[#103d7c] text-white py-1.5 px-4 text-center text-xs font-black tracking-widest uppercase shadow-md flex items-center justify-center gap-2 z-[1050]">
          <Bus className="w-4 h-4 animate-pulse text-blue-300" />
          <span>BOARDED: BUS {boardedBus} ({boardedRoute})</span>
        </div>
      )}

      {/* Main Map & Panel Grid */}
      <main className="relative flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 w-full h-full relative">
          <PassengerMap onOpenWaitingModal={handleOpenWaitingModal} />
        </div>

        {/* Bottom Sheet on Mobile / Side Panel on Desktop */}
        <div className="absolute md:relative bottom-0 left-0 right-0 md:w-96 lg:w-[420px] md:h-full z-[1050] pointer-events-none md:pointer-events-auto">
          <div className="relative w-full h-full pointer-events-auto">
            <PassengerBottomSheet
              currentTab={currentTab}
              onTabChange={setCurrentTab}
            />
          </div>
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <PassengerFooter />

      {/* Modals & Dialogs */}
      <WaitingStatusModal
        visible={waitingModalOpen}
        onClose={() => setWaitingModalOpen(false)}
        waitingFeedback={waitingFeedback}
        setWaitingFeedback={setWaitingFeedback}
        isBoarded={isBoarded}
        boardedBus={boardedBus}
        boardedRoute={boardedRoute}
        isWaiting={isWaiting}
        waitingLocation={waitingLocation}
        waitingSecondsLeft={waitingSecondsLeft}
        handleCancelWaiting={handleCancelWaitingAction}
        isUpdatingWaiting={isUpdatingWaiting}
        nearestStopName={resolveNearestStop()}
        handleSetWaiting={handleSetWaitingAction}
      />

      <BoardingPromptModal
        visible={!!pendingBoardBus}
        busIdentifier={pendingBoardBus?.code || pendingBoardBus?.plate_number}
        onAccept={acceptBoard}
        onReject={rejectBoard}
      />

      <DepartingPromptModal
        visible={pendingDepartBus}
        onAccept={acceptDepart}
        onReject={rejectDepart}
      />

      {tourStep !== null && (
        <TourOverlay
          currentStep={tourStep}
          onStepChange={setTourStep}
          onClose={() => setTourStep(null)}
        />
      )}
    </div>
  );
};
export default Dashboard;
