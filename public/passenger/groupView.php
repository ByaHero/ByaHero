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

    function hideGroupVisuals() {
        if (groupCircleLayer) { map.removeLayer(groupCircleLayer); groupCircleLayer = null; }
        groupMarkers.forEach(m => map.removeLayer(m));
        groupMarkers = [];
        if (activeFriendMarker) {
            map.removeLayer(activeFriendMarker);
            activeFriendMarker = null;
        }
    }

    function createPersonMarker(lat, lng, label = '') {
        return L.marker([lat, lng], {
            icon: L.divIcon({
                html: `
          <div style="background:#1e3a8a; color:white; border-radius:50%; width:32px; height:32px;
              display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3)">
              <span class="material-symbols-rounded" style="font-size:20px">person</span>
          </div>`,
                className: 'person-marker',
                iconSize: [32, 32]
            })
        }).bindPopup(label);
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
                return;
            }

            // Dedupe: if backend returns duplicates, we only show one card per user id
            const seenIds = new Set();

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

                const card = document.createElement('div');
                card.className = 'd-flex align-items-center p-3 bg-light rounded-4 mb-2 cursor-pointer';

                card.innerHTML = `
          <div class="bg-secondary-subtle rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
              <span class="material-symbols-rounded fs-3 text-primary">person</span>
          </div>
          <div>
              <h6 class="mb-0 fw-bold text-dark">${friend.name || friend.email}</h6>
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

                    if (activeFriendMarker) map.removeLayer(activeFriendMarker);
                    activeFriendMarker = createPersonMarker(lat, lng, friend.name || friend.email).addTo(map);
                    map.setView([lat, lng], 16);
                });

                groupListEl.appendChild(card);
            });
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
        showGroupVisuals();
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