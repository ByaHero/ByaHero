<div id="view-pins" class="d-none mt-2">
    <div id="active-pin-container" class="d-none mb-3">
        <div class="card border-0 shadow-sm rounded-4" style="background-color: #fff9e6;">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; background-color: #ffc107;">
                            <span class="material-symbols-rounded fs-4 text-white">star</span>
                        </div>
                        <div>
                            <h6 class="fw-bold mb-0 text-dark" id="active-pin-title">Dropped Pin</h6>
                            <small class="text-muted" id="active-pin-address">Fetching location...</small>
                        </div>
                    </div>
                    <button type="button" class="btn-close" onclick="clearActivePin()" aria-label="Close"></button>
                </div>
                <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-primary flex-grow-1 rounded-pill fw-bold d-flex align-items-center justify-content-center" onclick="saveActivePin()">
                        <span class="material-symbols-rounded me-1" style="font-size: 18px;">bookmark_add</span> Save
                    </button>
                    <button class="btn btn-sm btn-outline-primary flex-grow-1 rounded-pill fw-bold d-flex align-items-center justify-content-center">
                        <span class="material-symbols-rounded me-1" style="font-size: 18px;">directions</span> Go
                    </button>
                </div>
            </div>
        </div>
        <hr class="text-muted opacity-25 my-3">
    </div>

    <div class="text-muted small fw-bold mb-2 px-1">SAVED LOCATIONS</div>
    <div id="saved-pins-list">
        <div class="text-center text-muted small mt-3">Loading saved places...</div>
    </div>
</div>

<script>
    // --- ISOLATED PINS LOGIC ---
    let _pinsMap = null; // Local reference to the map
    let savedPinMarkers = [];
    let activePinMarker = null;
    let currentDroppedPinData = null;

    // Called from index.php after map is ready
    function initPinsFeature(mapInstance) {
        _pinsMap = mapInstance;
        
        // Single listener for map clicks
        _pinsMap.on('click', function(e) {
            handleMapClick(e.latlng.lat, e.latlng.lng);
        });

        // Load initial data
        loadSavedPins();
    }

    function handleMapClick(lat, lng) {
        // Switch tab if needed
        if (typeof switchSheetTab === 'function') switchSheetTab('pins');

        // Remove old active pin
        if (activePinMarker) _pinsMap.removeLayer(activePinMarker);

        const pinIcon = L.divIcon({
            html: `<div style="background:#ffc107; color:white; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3)">
                     <span class="material-symbols-rounded" style="font-size:24px">star</span>
                   </div>`,
            className: 'star-marker', iconSize: [36, 36], iconAnchor: [18, 18]
        });

        activePinMarker = L.marker([lat, lng], { icon: pinIcon, zIndexOffset: 1000 }).addTo(_pinsMap);
        _pinsMap.flyTo([lat, lng], 16);

        // Update UI
        const container = document.getElementById('active-pin-container');
        if (container) {
            container.classList.remove('d-none');
            document.getElementById('active-pin-address').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
        
        currentDroppedPinData = { lat: lat, lng: lng, title: "Dropped Pin", address: "Custom Location" };
    }

    function clearActivePin() {
        if (activePinMarker && _pinsMap) {
            _pinsMap.removeLayer(activePinMarker);
            activePinMarker = null;
        }
        document.getElementById('active-pin-container').classList.add('d-none');
        currentDroppedPinData = null;
    }

    // --- VISIBILITY HELPERS (Called by index.php) ---
    function setPinsVisibility(isVisible) {
        if (isVisible) {
            showSavedPins();
            loadSavedPins();
        } else {
            hideSavedPins();
            clearActivePin(); // Also hide the active drop card
        }
    }

    function showSavedPins() {
        savedPinMarkers.forEach(m => m.addTo(_pinsMap));
    }

    function hideSavedPins() {
        if(_pinsMap) {
            savedPinMarkers.forEach(m => _pinsMap.removeLayer(m));
        }
    }

    function focusPin(lat, lng) {
        if(_pinsMap) _pinsMap.flyTo([lat, lng], 16);
    }

    // --- API FUNCTIONS ---
    async function saveActivePin() {
        if(!currentDroppedPinData) return;
        const name = prompt("Name this location:", "My Place");
        if(!name) return;

        const fd = new FormData();
        fd.append('title', name);
        fd.append('address', currentDroppedPinData.address);
        fd.append('lat', currentDroppedPinData.lat);
        fd.append('lng', currentDroppedPinData.lng);

        try {
            const res = await fetch('../api_pins.php?action=save', { method: 'POST', body: fd });
            const data = await res.json();
            if(data.success) {
                clearActivePin();
                loadSavedPins();
            } else if (data.message === 'Unauthorized') {
                alert("Please log in.");
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
            } else {
                alert("Error: " + data.message);
            }
        } catch(e) { console.error(e); }
    }

    async function loadSavedPins() {
        const listContainer = document.getElementById('saved-pins-list');
        if(!listContainer) return;

        try {
            const res = await fetch('../api_pins.php?action=list');
            const data = await res.json();
            
            // Clear existing markers
            hideSavedPins();
            savedPinMarkers = [];
            listContainer.innerHTML = ''; 

            if(data.success && data.pins && data.pins.length > 0) {
                data.pins.forEach(pin => {
                    // List Item
                    const item = document.createElement('div');
                    item.className = 'd-flex justify-content-between align-items-center p-3 bg-light rounded-4 mb-2 shadow-sm border';
                    
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'd-flex align-items-center flex-grow-1 cursor-pointer';
                    infoDiv.onclick = () => focusPin(pin.lat, pin.lng);
                    infoDiv.innerHTML = `
                        <div class="me-3"><span class="material-symbols-rounded fs-1 text-dark">push_pin</span></div>
                        <div>
                            <h6 class="mb-0 fw-bold text-dark text-uppercase">${pin.title}</h6>
                            <small class="text-muted d-block">${pin.address || 'Saved Location'}</small>
                        </div>`;
                    
                    const delBtn = document.createElement('button');
                    delBtn.className = 'btn btn-light text-danger rounded-circle p-2 ms-2';
                    delBtn.innerHTML = '<span class="material-symbols-rounded fs-5">delete</span>';
                    delBtn.onclick = (e) => { e.stopPropagation(); deletePin(pin.id); };

                    item.appendChild(infoDiv);
                    item.appendChild(delBtn);
                    listContainer.appendChild(item);

                    // Marker
                    const m = L.marker([pin.lat, pin.lng], {
                        icon: L.divIcon({
                            html: `<span class="material-symbols-rounded text-dark" style="font-size:32px; text-shadow: 2px 2px 0px white;">push_pin</span>`,
                            className: 'saved-pin-icon', iconSize: [32, 32], iconAnchor: [16, 32]
                        })
                    });
                    m.bindPopup(`<b>${pin.title}</b>`);
                    savedPinMarkers.push(m);
                });
                
                // If we are currently on the pins tab, show them
                const pinsView = document.getElementById('view-pins');
                if(pinsView && !pinsView.classList.contains('d-none')) {
                    showSavedPins();
                }
            } else {
                listContainer.innerHTML = '<div class="text-center text-muted mt-3 small">Tap map to pin a location.<br>Log in to see saved places.</div>';
            }
        } catch(e) { console.error(e); }
    }

    async function deletePin(id) {
        if(!confirm('Delete this location?')) return;
        const fd = new FormData();
        fd.append('id', id);
        try {
            const res = await fetch('../api_pins.php?action=delete', { method: 'POST', body: fd });
            const data = await res.json();
            if(data.success) loadSavedPins();
            else alert("Failed: " + data.message);
        } catch(e) { console.error(e); }
    }
</script>