<div id="view-groups" class="d-none mt-2">
    <div class="d-flex align-items-center p-3 bg-light rounded-4 mb-2">
        <div class="bg-secondary-subtle rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
            <span class="material-symbols-rounded fs-3 text-primary">person</span>
        </div>
        <div>
            <h6 class="mb-0 fw-bold text-dark">PERSON 1</h6>
            <small class="text-muted d-block" style="font-size: 0.75rem;">At Bus 0002</small>
            <small class="text-muted" style="font-size: 0.7rem;">Since 00:00</small>
        </div>
    </div>

    <div class="d-flex align-items-center p-3 bg-light rounded-4 mb-2">
        <div class="bg-secondary-subtle rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
            <span class="material-symbols-rounded fs-3 text-primary">person</span>
        </div>
        <div>
            <h6 class="mb-0 fw-bold text-dark">PERSON 2</h6>
            <small class="text-muted d-block" style="font-size: 0.75rem;">At Bus 0002</small>
            <small class="text-muted" style="font-size: 0.7rem;">Since 00:00</small>
        </div>
    </div>

    <div class="d-flex align-items-center p-3 bg-primary-subtle rounded-4 mb-2 cursor-pointer" onclick="alert('Invite Feature Coming Soon')">
        <div class="bg-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
            <span class="material-symbols-rounded fs-3 text-primary">group_add</span>
        </div>
        <div>
            <h6 class="mb-0 fw-bold text-primary">Add a person</h6>
        </div>
    </div>
</div>

<script>
    // --- GROUP CIRCLE LOGIC ---
    let groupCircleLayer = null;
    let groupMarkers = [];

    function showGroupVisuals() {
        if (!userLocation) return;
        hideGroupVisuals();

        // 1. Blue Circle
        groupCircleLayer = L.circle([userLocation.lat, userLocation.lng], {
            color: '#1e3a8a',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            radius: 800
        }).addTo(map);

        // 2. Mock People Markers
        const createPersonMarker = (lat, lng) => {
            return L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `<div style="background:#1e3a8a; color:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3)"><span class="material-symbols-rounded" style="font-size:20px">person</span></div>`,
                    className: 'person-marker',
                    iconSize: [32, 32]
                })
            }).addTo(map);
        };

        const p1 = createPersonMarker(userLocation.lat + 0.002, userLocation.lng + 0.002);
        const p2 = createPersonMarker(userLocation.lat - 0.002, userLocation.lng - 0.001);
        groupMarkers.push(p1, p2);
        
        map.fitBounds(groupCircleLayer.getBounds());
    }

    function hideGroupVisuals() {
        if (groupCircleLayer) { map.removeLayer(groupCircleLayer); groupCircleLayer = null; }
        groupMarkers.forEach(m => map.removeLayer(m));
        groupMarkers = [];
    }
</script>