/**
 * passengerRideTracker.js
 * ──────────────────────────────────────────────────────────────────────────
 * Auto-boarding journey and proximity ride tracking logic.
 * Checks distance between user and active buses, manages join/leave API syncing.
 * ──────────────────────────────────────────────────────────────────────────
 */

window.PassengerRideTracker = {
  activeRide: null,
  proximityThreshold: 60, // meters (increased for better GPS reliability in real-world testing)
  departureThreshold: 150, // meters
  checkInterval: 10000, // 10 seconds base (dynamic)
  busUpdateTracker: {},
  proximityTicks: {},
  _tickRunning: false,

  init: async function() {
    console.log('Initializing PassengerRideTracker...');
    await this.checkActiveRide();
    this.updateInterval();

    // Dynamic visibility listener to adjust polling interval
    document.addEventListener('visibilitychange', () => {
      this.updateInterval();
      if (!document.hidden && !this._tickRunning) {
        clearTimeout(window._rideTrackerIntervalId);
        this._tickRecursive();
      }
    });

    this._tickRecursive();
  },

  updateInterval: function() {
    if (document.hidden) {
      this.checkInterval = 40000; // 40s when backgrounded
    } else if (this.activeRide) {
      this.checkInterval = 30000; // 30s when on ride (battery save)
    } else {
      this.checkInterval = 10000; // 10s base when waiting
    }
  },

  _tickRecursive: function() {
    if (this._tickRunning) return;
    this._tickRunning = true;
    this.tick().then(() => {
      this._tickRunning = false;
      window._rideTrackerIntervalId = setTimeout(() => this._tickRecursive(), this.checkInterval);
    }).catch(() => {
      this._tickRunning = false;
      window._rideTrackerIntervalId = setTimeout(() => this._tickRecursive(), this.checkInterval);
    });
  },

  tick: async function() {
    this.updateInterval();
    if (this.activeRide) {
      await this.checkActiveRide();
      await this.checkDistanceForDeparture();
    } else {
      await this.checkProximityToBuses();
    }
  },

  checkActiveRide: async function() {
    try {
      const data = await window.safePost('../api.php?action=check_active_ride');
      if (data.success) {
        if (data.on_ride) {
          this.activeRide = data.ride;
          this.updateUI();
          window.updateUserMarkerWaitingStyle();
        } else if (this.activeRide) {
          this.activeRide = null;
          this.updateUI();
          this.showDepartureNotice();
          window.updateUserMarkerWaitingStyle();
        }
      }
    } catch (e) { console.warn('checkActiveRide error:', e); }
  },

  checkProximityToBuses: async function() {
    if (!window.userLocation || !window.allBuses || window.allBuses.length === 0) {
      console.log('Proximity Check Skipped: Location or buses not loaded.');
      return;
    }
    
    console.log(`Checking proximity to ${window.allBuses.length} buses (Threshold: ${this.proximityThreshold}m)...`);
    const nearbyBusIds = new Set();
    
    for (const bus of window.allBuses) {
      if (!bus.coords) {
        console.log(`Bus ${bus.code} skipped: No coordinates.`);
        continue;
      }
      if (!bus.operation_id) {
        console.log(`Bus ${bus.code} skipped: Conductor is not actively tracking this bus (no active operation_id).`);
        continue;
      }
      
      const dist = window.distanceMeters(window.userLocation.lat, window.userLocation.lng, bus.coords[0], bus.coords[1]);
      console.log(`Bus ${bus.code} is ${dist.toFixed(1)} meters away. (Ticks: ${this.proximityTicks[bus.id] || 0}/2)`);
      
      if (dist <= this.proximityThreshold) {
        nearbyBusIds.add(bus.id);
        this.proximityTicks[bus.id] = (this.proximityTicks[bus.id] || 0) + 1;
        console.log(`Bus ${bus.code} is within boarding range! Tick incremented to ${this.proximityTicks[bus.id]}.`);
        
        // Instant Boarding: triggers immediately on the very first proximity detection tick
        if (this.proximityTicks[bus.id] >= 1) {
          console.log(`Confirming boarding for Bus ${bus.code}! Dispatching joinRide...`);
          this.proximityTicks = {}; // Reset ticks
          this.joinRide(bus);
          break; 
        }
      } else {
        delete this.proximityTicks[bus.id];
      }
    }
    
    // Clean up no longer nearby/active buses
    for (const busId in this.proximityTicks) {
      if (!nearbyBusIds.has(Number(busId))) {
        delete this.proximityTicks[busId];
      }
    }
  },

  joinRide: async function(bus) {
    try {
      const data = await window.safePost('../api.php?action=join_ride', { operation_id: bus.operation_id });
      if (data.success) {
        await this.checkActiveRide();
        this.showBoardingNotice(bus);
      }
    } catch (e) { console.warn('joinRide error:', e); }
  },

  updateUI: function() {
    const statusEl = document.getElementById('rideStatusPill');
    if (this.activeRide) {
      if (!statusEl) {
        const pill = document.createElement('div');
        pill.id = 'rideStatusPill';
        pill.className = 'position-fixed top-0 start-50 translate-middle-x z-3';
        pill.style.marginTop = '75px';
        pill.style.zIndex = '1050'; 
        pill.innerHTML = `
          <div id="rideStatusPillContainer" class="bg-success text-white px-3 py-2 rounded-pill shadow fw-bold d-flex align-items-center gap-2 border border-white border-2" style="font-size: 0.85rem; backdrop-filter: blur(4px); background-color: rgba(25, 135, 84, 0.9) !important;">
            <span id="rideStatusPillText" class="d-flex align-items-center gap-2">
              <span class="material-symbols-rounded" style="font-size: 20px;">directions_bus</span>
              On Ride: ${this.activeRide.bus_code}
            </span>
            <button class="btn btn-sm btn-danger rounded-pill px-2 py-0 border-0 ms-2 text-white fw-bold" style="font-size: 0.7rem; line-height: 1.5; background-color: #dc3545; transition: transform 0.2s;" onclick="window.PassengerRideTracker.leaveRideManual()">Leave</button>
          </div>
        `;
        document.body.appendChild(pill);
      } else {
        const textEl = document.getElementById('rideStatusPillText');
        if (textEl) {
          textEl.innerHTML = `
            <span class="material-symbols-rounded" style="font-size: 20px;">directions_bus</span>
            On Ride: ${this.activeRide.bus_code}
          `;
        }
        const containerEl = document.getElementById('rideStatusPillContainer');
        if (containerEl) {
          containerEl.classList.replace('bg-warning', 'bg-success');
          containerEl.classList.replace('text-dark', 'text-white');
        }
      }
    } else if (statusEl) {
      statusEl.remove();
    }
  },

  showBoardingNotice: function(bus) {
    const notice = document.createElement('div');
    notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-primary text-white rounded shadow-lg d-flex align-items-center gap-2';
    notice.style.zIndex = '9999';
    notice.style.marginBottom = '80px';
    notice.innerHTML = `
      <span class="material-symbols-rounded">check_circle</span>
      <span class="small">Automatically boarded <b>Bus ${bus.code}</b></span>
      <button class="btn border-0 bg-transparent p-0 ms-2" style="box-shadow: none;" onclick="this.parentElement.remove()"><img src="../../assets/images/EKS.svg" alt="Close" style="width: 14px; height: 14px; display: block; filter: brightness(0) invert(1);" /></button>
    `;
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 5000);
  },

  showDepartureNotice: function(msg) {
    msg = msg || "Ride completed. Automatically departed.";
    const notice = document.createElement('div');
    notice.className = 'location-notice position-fixed bottom-0 start-50 translate-middle-x mb-5 p-3 bg-info text-white rounded shadow-lg d-flex align-items-center gap-2';
    notice.style.zIndex = '9999';
    notice.style.marginBottom = '80px';
    notice.innerHTML = `
      <span class="material-symbols-rounded">info</span>
      <span class="small">${msg}</span>
      <button class="btn border-0 bg-transparent p-0 ms-2" style="box-shadow: none;" onclick="this.parentElement.remove()"><img src="../../assets/images/EKS.svg" alt="Close" style="width: 14px; height: 14px; display: block; filter: brightness(0) invert(1);" /></button>
    `;
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 5000);
  },

  checkDistanceForDeparture: async function() {
    if (!this.activeRide || !window.userLocation || !window.allBuses || window.allBuses.length === 0) return;
    
    const busId = this.activeRide.bus_id;
    const bus = window.allBuses.find(b => String(b.id) === String(busId));
    
    if (!bus || !bus.coords) return;
    
    const now = Date.now();
    if (!this.busUpdateTracker[busId]) {
        this.busUpdateTracker[busId] = { updatedStr: bus.updated || null, lastSeenChange: now };
    } else if (bus.updated && this.busUpdateTracker[busId].updatedStr !== bus.updated) {
        this.busUpdateTracker[busId].updatedStr = bus.updated;
        this.busUpdateTracker[busId].lastSeenChange = now;
    }
    
    const secondsSinceChange = (now - this.busUpdateTracker[busId].lastSeenChange) / 1000;
    const isStale = secondsSinceChange > 60;
    
    const statusEl = document.getElementById('rideStatusPillText');
    const containerEl = document.getElementById('rideStatusPillContainer');
    if (statusEl && containerEl) {
        if (isStale) {
            statusEl.innerHTML = `<span class="material-symbols-rounded" style="font-size: 20px;">warning</span> On Ride: ${this.activeRide.bus_code} <small>(Bus Signal Lost)</small>`;
            containerEl.classList.replace('bg-success', 'bg-warning');
            containerEl.classList.replace('text-white', 'text-dark');
        } else {
            statusEl.innerHTML = `<span class="material-symbols-rounded" style="font-size: 20px;">directions_bus</span> On Ride: ${this.activeRide.bus_code}`;
            containerEl.classList.replace('bg-warning', 'bg-success');
            containerEl.classList.replace('text-dark', 'text-white');
        }
    }
    
    const dist = window.distanceMeters(window.userLocation.lat, window.userLocation.lng, bus.coords[0], bus.coords[1]);
    
    if (isStale) {
        // If the bus signal is lost but the passenger has moved far away, trigger auto-departure
        if (dist > this.departureThreshold) {
            this.leaveRide("Bus signal lost and you moved away. Automatically departed.");
        }
        return;
    }
    
    if (dist > this.departureThreshold) {
        this.leaveRide();
    }
  },
  
  leaveRide: async function(msg) {
    try {
        const data = await window.safePost('../api.php?action=leave_ride');
        if (data.success) {
            this.activeRide = null;
            this.updateUI();
            this.showDepartureNotice(msg || "You moved away from the bus. Automatically departed.");
            window.updateUserMarkerWaitingStyle();
        }
    } catch (e) { console.warn('leaveRide error:', e); }
  },
  
  leaveRideManual: async function() {
    if (confirm("Are you sure you want to end your ride tracking?")) {
        await this.leaveRide("Ride tracking ended manually.");
    }
  }
};
