<div id="view-groups" class="d-none mt-2">
    <div class="d-flex align-items-center justify-content-between mb-3">
        <div class="fw-bold text-black" style="font-size: 0.95rem; letter-spacing: 0.03em;">
            CIRCLES
        </div>
    </div>
    <div class="p-3 bg-light rounded-4 mb-2">
        <div class="d-flex align-items-center justify-content-between mb-2">
            <div>
                <h6 class="mb-0 fw-bold text-dark">Your Invite Code</h6>
                <small class="text-muted">Invite friends to your circle</small>
            </div>
            <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="generateInviteCode(true)" title="Reset Code">
                <span class="material-symbols-rounded" style="font-size: 16px;">refresh</span>
            </button>
        </div>
        
        <div class="d-flex align-items-center gap-2 mb-3">
            <div id="invite-code" class="fw-bold fs-4 text-primary bg-white border rounded-3 px-3 py-2 flex-grow-1 text-center" style="letter-spacing: 2px;">------</div>
            <button class="btn btn-primary rounded-3 px-3 py-2" onclick="copyInviteCode()" style="height: 48px;">
                <span class="material-symbols-rounded">content_copy</span>
            </button>
        </div>

        <div class="row g-2">
            <div class="col-6">
                <button class="btn btn-primary w-100 rounded-pill d-flex align-items-center justify-content-center gap-2" onclick="showInviteQR()">
                    <span class="material-symbols-rounded">qr_code_2</span>
                    QR Code
                </button>
            </div>
            <div class="col-6">
                <button class="btn btn-outline-primary w-100 rounded-pill d-flex align-items-center justify-content-center gap-2" onclick="shareInviteLink()">
                    <span class="material-symbols-rounded">share</span>
                    Share Link
                </button>
            </div>
        </div>
    </div>

    <!-- QR Modal / Container -->
    <div id="qr-display-container" class="d-none p-3 bg-white border rounded-4 mb-3 text-center shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="fw-bold small text-muted">SCAN TO JOIN</span>
            <button type="button" class="btn-close" onclick="document.getElementById('qr-display-container').classList.add('d-none')"></button>
        </div>
        <div id="qr-code-img-container" class="mb-2"></div>
        <small class="text-muted d-block">Let your friend scan this code to instantly join your circle.</small>
    </div>

    <div class="p-3 bg-light rounded-4 mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0 fw-bold text-dark">Join a Circle</h6>
            <button class="btn btn-sm btn-primary rounded-pill d-flex align-items-center gap-1" onclick="toggleScanner()">
                <span class="material-symbols-rounded" style="font-size: 18px;">qr_code_scanner</span>
                Scan
            </button>
        </div>
        
        <div id="qr-scanner-container" class="d-none mb-3 overflow-hidden rounded-3 border" style="width: 100%; max-width: 400px; margin: 0 auto;">
            <div id="qr-reader" style="width: 100%;"></div>
        </div>

        <div class="d-flex gap-2">
            <input id="join-code-input" class="form-control rounded-pill" placeholder="Enter 6-digit code" />
            <button class="btn btn-primary rounded-pill px-4" onclick="joinByCode()">Join</button>
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

    let html5QrScanner = null;

    async function generateInviteCode(isReset = false) {
        if (!inviteCodeEl) return;
        inviteCodeEl.textContent = '...';

        try {
            const url = isReset ? '../../backend/getInviteCode.php?reset=1' : '../../backend/getInviteCode.php';
            const res = await fetch(url, { cache: 'no-store' });
            const data = await res.json();
            if (data.success) {
                inviteCodeEl.textContent = data.invite_code;
                // If QR is visible, update it
                if (!document.getElementById('qr-display-container').classList.contains('d-none')) {
                    showInviteQR();
                }
            } else {
                inviteCodeEl.textContent = '------';
            }
        } catch (err) {
            inviteCodeEl.textContent = '------';
        }
    }

    // NEW: Show QR Code using Google Charts API
    function showInviteQR() {
        const code = (inviteCodeEl.textContent || '').trim();
        if (!code || code === '------' || code === '...') {
            alert('Wait for invite code to load...');
            return;
        }

        const qrContainer = document.getElementById('qr-display-container');
        const imgContainer = document.getElementById('qr-code-img-container');
        
        // Using QRServer API (Google Charts is deprecated)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;
        
        imgContainer.innerHTML = `<img src="${qrUrl}" alt="Invite QR Code" class="img-fluid border rounded-3 p-2" style="max-width: 200px;">`;
        qrContainer.classList.remove('d-none');
    }

    // NEW: Share via Native Web Share API
    async function shareInviteLink() {
        const code = (inviteCodeEl.textContent || '').trim();
        if (!code || code === '------' || code === '...') {
            alert('Wait for invite code to load...');
            return;
        }

        const shareUrl = `${window.location.origin}${window.APP_BASE_URL || ''}/public/passenger/index.php?join_circle=${code}`;
        const shareData = {
            title: 'Join my ByaHero Circle',
            text: `Join my safety circle on ByaHero! Use this link to add me instantly:`,
            url: shareUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: Copy to clipboard
                copyInviteCode(true); // pass true to indicate it's from sharing
            }
        } catch (err) {
            console.error('Share failed:', err);
        }
    }

    // NEW: QR Scanner Toggle
    function toggleScanner() {
        const container = document.getElementById('qr-scanner-container');
        if (container.classList.contains('d-none')) {
            container.classList.remove('d-none');
            startScanner();
        } else {
            stopScanner();
            container.classList.add('d-none');
        }
    }

    function startScanner() {
        if (!html5QrScanner) {
            html5QrScanner = new Html5Qrcode("qr-reader");
        }
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        html5QrScanner.start(
            { facingMode: "environment" }, 
            config,
            (decodedText) => {
                // Success: decodedText is expected to be the 6-digit code
                document.getElementById('join-code-input').value = decodedText;
                stopScanner();
                document.getElementById('qr-scanner-container').classList.add('d-none');
                joinByCode(); // Auto-join after scan
            },
            (errorMessage) => {
                // Silent error (normal during scanning)
            }
        ).catch(err => {
            console.error('Camera access failed:', err);
            alert('Unable to access camera. Please check permissions.');
            document.getElementById('qr-scanner-container').classList.add('d-none');
        });
    }

    function stopScanner() {
        if (html5QrScanner && html5QrScanner.isScanning) {
            html5QrScanner.stop().catch(err => console.error('Stop error:', err));
        }
    }

    async function copyInviteCode(fromShare = false) {
        if (!inviteCodeEl) return;

        const code = (inviteCodeEl.textContent || '').trim();
        if (!code || code === '------' || code === '...') {
            alert('No invite code to copy yet.');
            return;
        }

        const shareUrl = fromShare 
            ? `${window.location.origin}${window.APP_BASE_URL || ''}/public/passenger/index.php?join_circle=${code}`
            : code;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                const ta = document.createElement('textarea');
                ta.value = shareUrl;
                ta.setAttribute('readonly', '');
                ta.style.position = 'absolute';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            alert(fromShare ? 'Invite link copied to clipboard!' : 'Invite code copied!');
        } catch (e) {
            console.error('Copy failed:', e);
            alert('Copy failed. Please copy manually.');
        }
    }

    async function joinByCode() {
        if (!joinMessageEl) return;

        const codeInput = document.getElementById('join-code-input');
        const code = codeInput.value.trim();
        joinMessageEl.textContent = 'Joining...';

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
            
            if (data.success) {
                joinMessageEl.innerHTML = `<span class="text-success fw-bold">${data.message || 'Joined successfully!'}</span>`;
                codeInput.value = '';
                loadGroupMembers();
                // If it was scanned, provide tactile feedback
                if (navigator.vibrate) navigator.vibrate(50);
            } else {
                joinMessageEl.innerHTML = `<span class="text-danger">${data.message || 'Failed to join'}</span>`;
            }
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