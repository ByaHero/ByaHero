<div id="view-groups" class="d-none mt-2">
    <div class="p-3 bg-light rounded-4 mb-2">
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <h6 class="mb-1 fw-bold text-dark">Your Invite Code</h6>
                <small class="text-muted">Share this code to add friends</small>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="generateInviteCode()">Refresh</button>
        </div>
        <div class="mt-2">
            <span id="invite-code" class="fw-bold fs-5 text-primary">------</span>
        </div>
    </div>

    <div class="p-3 bg-light rounded-4 mb-3">
        <h6 class="mb-2 fw-bold text-dark">Join a Circle</h6>
        <div class="d-flex gap-2">
            <input id="join-code-input" class="form-control" placeholder="Enter invite code" />
            <button class="btn btn-primary" onclick="joinByCode()">Join</button>
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

    function showGroupVisuals() {
        if (!window.userLocation || !window.map) return;

        hideGroupVisuals();

        groupCircleLayer = L.circle([userLocation.lat, userLocation.lng], {
            color: '#1e3a8a',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            radius: 800
        }).addTo(map);

        map.fitBounds(groupCircleLayer.getBounds());
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

    const LOCATION_STALE_MINUTES = 5;

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

    async function loadGroupMembers() {
        if (!groupListEl) return;

        try {
            const res = await fetch('../../backend/groupView.php');
            const data = await res.json();

            if (!data.success) {
                groupListEl.innerHTML = `<small class="text-danger">Failed to load group data</small>`;
                return;
            }

            if (!data.friends || data.friends.length === 0) {
                groupListEl.innerHTML = `<small class="text-muted">No circle members yet.</small>`;
                return;
            }

            groupListEl.innerHTML = '';
            data.friends.forEach(friend => {
                const lat = friend.latitude !== null ? parseFloat(friend.latitude) : null;
                const lng = friend.longitude !== null ? parseFloat(friend.longitude) : null;
                const isFresh = isLocationFresh(friend.updated_at);
                const hasLocation = Number.isFinite(lat) && Number.isFinite(lng) && isFresh;

                const statusText = hasLocation
                    ? 'Location available'
                    : (friend.updated_at ? getLastSeenLabel(friend.updated_at) : 'Location unavailable');

                const card = document.createElement('div');
                card.className = 'd-flex align-items-center p-3 bg-light rounded-4 mb-2 cursor-pointer';

                card.innerHTML = `
                    <div class="bg-secondary-subtle rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
                        <span class="material-symbols-rounded fs-3 text-primary">person</span>
                    </div>
                    <div>
                        <h6 class="mb-0 fw-bold text-dark">${friend.name || friend.email}</h6>
                        <small class="text-muted d-block" style="font-size: 0.75rem;">
                            ${statusText}
                        </small>
                    </div>
                `;

                card.addEventListener('click', () => {
                    if (!hasLocation) {
                        alert('Location is not available for this user.');
                        return;
                    }

                    if (activeFriendMarker) {
                        map.removeLayer(activeFriendMarker);
                    }

                    activeFriendMarker = createPersonMarker(lat, lng, friend.name || friend.email)
                        .addTo(map);

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
            const res = await fetch('../../backend/getInviteCode.php');
            const data = await res.json();
            inviteCodeEl.textContent = data.success ? data.invite_code : '------';
        } catch (err) {
            inviteCodeEl.textContent = '------';
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

            if (data.success) {
                loadGroupMembers();
            }
        } catch (err) {
            joinMessageEl.textContent = 'Join failed.';
        }
    }

    async function sendCurrentLocation() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const payload = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
            };

            try {
                const res = await fetch('../../backend/updateUserLocation.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.success) {
                    loadGroupMembers();
                }
            } catch (err) {
                console.error(err);
            }
        }, (err) => {
            console.warn('Location error:', err);
        }, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 8000
        });
    }

    function startLocationUpdates() {
        sendCurrentLocation();
        if (locationTimer) clearInterval(locationTimer);
        locationTimer = setInterval(sendCurrentLocation, 10000);
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