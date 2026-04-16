<div id="view-groups" class="d-none mt-2">
    <div class="d-flex align-items-center justify-content-between mb-3">
        <div class="fw-bold text-black" style="font-size: 0.95rem; letter-spacing: 0.03em;">
            CIRCLES
        </div>
    </div>
    <div class="p-3 bg-light rounded-4 mb-2">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <h6 class="mb-1 fw-bold text-dark">Your Invite Code</h6>
                <small class="text-muted">Share this code to add friends</small>
            </div>
            <!-- CHANGED: Refresh -> Copy -->
            <button class="btn btn-sm btn-primary rounded-pill" onclick="copyInviteCode()">Copy</button>
        </div>
        <div class="mt-2">
            <span id="invite-code" class="fw-bold fs-5 text-primary">------</span>
        </div>
    </div>

    <div class="p-3 bg-light rounded-4 mb-3">
        <h6 class="mb-2 fw-bold text-dark">Join a Circle</h6>
        <div class="d-flex gap-2">
            <input id="join-code-input" class="form-control" placeholder="Enter invite code" />
            <button class="btn btn-primary rounded-pill" onclick="joinByCode()">Join</button>
        </div>
        <small id="join-message" class="d-block mt-2 text-muted"></small>
    </div>

    <div id="group-list"></div>
</div>

<script>
    let groupCircleLayer = null;
    let groupMarkers = [];
    let activeFriendMarker = null;
    let locationTimer = null;
    let currentFriendsData = [];
    let isGroupTabActive = false;

    let groupListEl;
    let inviteCodeEl;
    let joinMessageEl;

    const LOCATION_STALE_MINUTES = 5;

    // --- Location update controls ---
    const LOCATION_UPDATE_INTERVAL_MS = 5000; // 5s (was 1s)
    let isSendingLocation = false;

    // Cache share_location so we don't fetch it too frequently
    let shareLocationCache = { value: null, ts: 0 };
    const SHARE_LOCATION_CACHE_MS = 15000; // 15s

    function getLastSeenLabel(updatedAt) {
        if (!updatedAt) return '';
        const last = new Date(updatedAt).getTime();
        if (Number.isNaN(last)) return '';
        const diffMinutes = Math.floor((Date.now() - last) / 60000);

        if (diffMinutes <= 0) return 'Just now';
        if (diffMinutes < 60) return `Last seen ${diffMinutes} min ago`;

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `Last seen ${diffHours} hr ago`;

        const diffDays = Math.floor(diffHours / 24);
        return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    function isLocationFresh(updatedAt) {
        if (!updatedAt) return false;
        const last = new Date(updatedAt).getTime();
        if (Number.isNaN(last)) return false;
        const diffMinutes = (Date.now() - last) / 60000;
        return diffMinutes <= LOCATION_STALE_MINUTES;
    }

    function showGroupVisuals() {
        if (!window.map) return;
        isGroupTabActive = true;
        renderGroupMarkersOnMap();
    }

    function hideGroupVisuals() {
        isGroupTabActive = false;
        if (groupCircleLayer) { window.map.removeLayer(groupCircleLayer); groupCircleLayer = null; }
        groupMarkers.forEach(m => window.map.removeLayer(m));
        groupMarkers = [];
        if (activeFriendMarker) {
            window.map.removeLayer(activeFriendMarker);
            activeFriendMarker = null;
        }
    }

    function initialsFromFriend(f) {
        const base = (f.name || f.email || "??").trim();
        const parts = base.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return base.slice(0, 2).toUpperCase();
    }

    function colorFromString(str) {
        const colors = ["#ec4899", "#3b82f6", "#22c55e", "#f43f5e", "#a855f7", "#06b6d4", "#f97316"];
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
        return colors[h % colors.length];
    }

    function renderGroupMarkersOnMap() {
        groupMarkers.forEach(m => window.map.removeLayer(m));
        groupMarkers = [];
        if (activeFriendMarker) {
            window.map.removeLayer(activeFriendMarker);
            activeFriendMarker = null;
        }
        
        if (!isGroupTabActive || !window.map) return;

        const seenIds = new Set();
        
        currentFriendsData.forEach(friend => {
            const id = friend && friend.id != null ? String(friend.id) : null;
            if (id && seenIds.has(id)) return;
            if (id) seenIds.add(id);

            const lat = friend.latitude !== null ? parseFloat(friend.latitude) : null;
            const lng = friend.longitude !== null ? parseFloat(friend.longitude) : null;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            const friendName = friend.name || friend.email || "?";
            const initials = initialsFromFriend(friend);
            const bgColor = colorFromString(friend.email || friend.name || initials);

            const marker = createPersonMarker(lat, lng, friendName, initials, bgColor, friend.profile_picture);
            
            if (!isLocationFresh(friend.updated_at)) {
                marker.setOpacity(0.6);
                marker.bindPopup(`<b>${friendName}</b><br><small class="text-muted">${getLastSeenLabel(friend.updated_at)}</small>`);
            }
            
            marker.addTo(window.map);
            groupMarkers.push(marker);
        });
    }

    function createPersonMarker(lat, lng, label = '', initials = '?', bgColor = '#1e3a8a', profilePicture = null) {
        let innerHtml = initials;
        if (profilePicture) {
            const basePath = window.APP_BASE_URL || "<?php echo isset($depth) ? $depth : '../../'; ?>";
            // Strip leading slashes to prevent double slashes if basePath has one
            const cleanPath = profilePicture.startsWith('/') ? profilePicture.substring(1) : profilePicture;
            innerHtml = `<img src="${basePath}${cleanPath}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
        return L.marker([lat, lng], {
            icon: L.divIcon({
                html: `
          <div style="background:${bgColor}; color:white; border-radius:50%; width:36px; height:36px;
              display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3); font-weight:bold; font-size:14px; letter-spacing:0.5px; overflow: hidden;">
              ${innerHtml}
          </div>`,
                className: 'person-marker',
                iconSize: [36, 36],
                iconAnchor: [18, 18],
                popupAnchor: [0, -18]
            })
        }).bindPopup(`<b>${label}</b>`);
    }

    async function loadGroupMembers() {
        if (!groupListEl) return;

        try {
            const res = await fetch('../../backend/groupView.php', { cache: 'no-store' });
            const data = await res.json();

            if (!data.success) {
                groupListEl.innerHTML = `<small class="text-danger">Failed to load group data</small>`;
                return;
            }

            if (!data.friends || data.friends.length === 0) {
                groupListEl.innerHTML = `<small class="text-muted">No circle members yet.</small>`;
                currentFriendsData = [];
                renderGroupMarkersOnMap();
                return;
            }

            // Dedupe: if backend returns duplicates, we only show one card per user id
            const seenIds = new Set();
            currentFriendsData = data.friends || [];

            groupListEl.innerHTML = '';
            data.friends.forEach(friend => {
                const id = friend && friend.id != null ? String(friend.id) : null;
                if (id && seenIds.has(id)) return;
                if (id) seenIds.add(id);

                const lat = friend.latitude !== null ? parseFloat(friend.latitude) : null;
                const lng = friend.longitude !== null ? parseFloat(friend.longitude) : null;

                const fresh = isLocationFresh(friend.updated_at);
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                const hasLocationNow = hasCoords && fresh;

                let statusText = 'Location unavailable';
                if (hasLocationNow) statusText = 'Live location available';
                else if (friend.updated_at) statusText = getLastSeenLabel(friend.updated_at);

                const friendName = friend.name || friend.email || "?";
                const initials = initialsFromFriend(friend);
                const bgColor = colorFromString(friend.email || friend.name || initials);

                const card = document.createElement('div');
                card.className = 'd-flex align-items-center p-3 bg-light rounded-4 mb-2 cursor-pointer';

                let avatarHtml = initials;
                if (friend.profile_picture) {
                    const basePath = window.APP_BASE_URL || "<?php echo isset($depth) ? $depth : '../../'; ?>";
                    const cleanPath = friend.profile_picture.startsWith('/') ? friend.profile_picture.substring(1) : friend.profile_picture;
                    avatarHtml = `<img src="${basePath}${cleanPath}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                }

                card.innerHTML = `
          <div class="rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold text-white shadow-sm" style="width: 48px; height: 48px; background-color: ${bgColor}; border: 2px solid white; font-size: 18px; letter-spacing: 0.5px; overflow: hidden;">
              ${avatarHtml}
          </div>
          <div>
              <h6 class="mb-0 fw-bold text-dark">${friendName}</h6>
              <small class="text-muted d-block" style="font-size: 0.75rem;">${statusText}</small>
          </div>
        `;

                card.addEventListener('click', () => {
                    if (!hasCoords) {
                        alert('Location is not available for this user. They may need to enable Share Location.');
                        return;
                    }

                    if (!fresh) {
                        alert('This user’s location is not live right now. They may have Share Location off or the app is closed.');
                        return;
                    }

                    window.map.setView([lat, lng], 16);
                    
                    const targetMarker = groupMarkers.find(m => {
                        const mll = m.getLatLng();
                        return Math.abs(mll.lat - lat) < 0.000001 && Math.abs(mll.lng - lng) < 0.000001;
                    });
                    if (targetMarker) targetMarker.openPopup();
                });

                groupListEl.appendChild(card);
            });

            if (isGroupTabActive) {
                renderGroupMarkersOnMap();
            }
        } catch (err) {
            console.error(err);
            groupListEl.innerHTML = `<small class="text-danger">Error loading group data.</small>`;
        }
    }

    async function generateInviteCode() {
        if (!inviteCodeEl) return;
        inviteCodeEl.textContent = '...';

        try {
            const res = await fetch('../../backend/getInviteCode.php', { cache: 'no-store' });
            const data = await res.json();
            inviteCodeEl.textContent = data.success ? data.invite_code : '------';
        } catch (err) {
            inviteCodeEl.textContent = '------';
        }
    }

    // ADDED: copy to clipboard
    async function copyInviteCode() {
        if (!inviteCodeEl) return;

        const code = (inviteCodeEl.textContent || '').trim();
        if (!code || code === '------' || code === '...') {
            alert('No invite code to copy yet.');
            return;
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(code);
            } else {
                // fallback for non-HTTPS / older browsers
                const ta = document.createElement('textarea');
                ta.value = code;
                ta.setAttribute('readonly', '');
                ta.style.position = 'absolute';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }

            alert('Invite code copied!');
        } catch (e) {
            console.error('Copy failed:', e);
            alert('Copy failed. Please copy manually.');
        }
    }

    async function joinByCode() {
        if (!joinMessageEl) return;

        const code = document.getElementById('join-code-input').value.trim();
        joinMessageEl.textContent = '';

        if (!code) {
            joinMessageEl.textContent = 'Please enter a code.';
            return;
        }

        try {
            const res = await fetch('../../backend/joinCircleByCode.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invite_code: code })
            });

            const data = await res.json();
            joinMessageEl.textContent = data.message || (data.success ? 'Joined!' : 'Failed');

            if (data.success) loadGroupMembers();
        } catch (err) {
            joinMessageEl.textContent = 'Join failed.';
        }
    }

    // IMPORTANT: only attempt upload if share_location is enabled
    async function isShareLocationEnabled() {
        const now = Date.now();
        if (shareLocationCache.value !== null && (now - shareLocationCache.ts) < SHARE_LOCATION_CACHE_MS) {
            return shareLocationCache.value;
        }

        try {
            const res = await fetch('../../backend/getShareLocationSetting.php', { cache: 'no-store' });
            const data = await res.json();
            const enabled = !!(data && data.success && parseInt(data.share_location) === 1);

            shareLocationCache = { value: enabled, ts: now };
            return enabled;
        } catch (e) {
            shareLocationCache = { value: false, ts: now };
            return false;
        }
    }

    async function sendCurrentLocation() {
        if (isSendingLocation) return;
        if (!navigator.geolocation) return;

        isSendingLocation = true;

        try {
            const shareOn = await isShareLocationEnabled();
            if (!shareOn) {
                loadGroupMembers();
                isSendingLocation = false;
                return;
            }

            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    const lat = pos?.coords?.latitude;
                    const lng = pos?.coords?.longitude;
                    const accuracy = pos?.coords?.accuracy ?? null;

                    // Guard against undefined/null coords -> prevents "Latitude/longitude required"
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                        console.warn('Bad coords from geolocation:', { lat, lng, pos });
                        loadGroupMembers();
                        return;
                    }

                    const payload = { latitude: lat, longitude: lng, accuracy };

                    const res = await fetch('../../backend/updateUserLocation.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await res.json();
                    if (!data.success && data.message) {
                        console.warn('updateUserLocation:', data.message);
                    }

                    loadGroupMembers();
                } catch (err) {
                    console.error(err);
                } finally {
                    isSendingLocation = false;
                }
            }, (err) => {
                console.warn('Location error:', err);
                isSendingLocation = false;
            }, {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 8000
            });

        } catch (e) {
            console.error(e);
            isSendingLocation = false;
        }
    }

    function startLocationUpdates() {
        sendCurrentLocation();
        if (locationTimer) clearInterval(locationTimer);
        locationTimer = setInterval(sendCurrentLocation, LOCATION_UPDATE_INTERVAL_MS);
    }

    function openGroupView() {
        // Do NOT call showGroupVisuals() immediately on load because the default tab is usually Location.
        // It will be triggered natively by switchSheetTab('groups') when the user actually switches tabs.
        generateInviteCode();
        loadGroupMembers();
        startLocationUpdates();
    }

    document.addEventListener('DOMContentLoaded', () => {
        groupListEl = document.getElementById('group-list');
        inviteCodeEl = document.getElementById('invite-code');
        joinMessageEl = document.getElementById('join-message');
        openGroupView();
    });
</script>