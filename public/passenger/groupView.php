<style>

    /* --- PREMIUM LIVE STATUS STYLES --- */
    .friend-avatar-circle {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .friend-marker-container.is-waiting .friend-avatar-circle {
      box-shadow: 0 0 0 3px #10b981, 0 0 0 8px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(0,0,0,0.3) !important;
      animation: friendWaitingPulse 2.5s infinite;
    }

    .friend-marker-container.is-boarded .friend-avatar-circle {
      box-shadow: 0 0 0 3px #3b82f6, 0 0 0 8px rgba(59, 130, 246, 0.4), 0 2px 6px rgba(0,0,0,0.3) !important;
      animation: friendBoardedPulse 2.5s infinite;
    }

    @keyframes friendWaitingPulse {
      0% {
        box-shadow: 0 0 0 3px #10b981, 0 0 0 0px rgba(16, 185, 129, 0.5), 0 2px 6px rgba(0,0,0,0.3) !important;
      }
      70% {
        box-shadow: 0 0 0 3px #10b981, 0 0 0 10px rgba(16, 185, 129, 0), 0 2px 6px rgba(0,0,0,0.3) !important;
      }
      100% {
        box-shadow: 0 0 0 3px #10b981, 0 0 0 0px rgba(16, 185, 129, 0), 0 2px 6px rgba(0,0,0,0.3) !important;
      }
    }

    @keyframes friendBoardedPulse {
      0% {
        box-shadow: 0 0 0 3px #3b82f6, 0 0 0 0px rgba(59, 130, 246, 0.5), 0 2px 6px rgba(0,0,0,0.3) !important;
      }
      70% {
        box-shadow: 0 0 0 3px #3b82f6, 0 0 0 10px rgba(59, 130, 246, 0), 0 2px 6px rgba(0,0,0,0.3) !important;
      }
      100% {
        box-shadow: 0 0 0 3px #3b82f6, 0 0 0 0px rgba(59, 130, 246, 0), 0 2px 6px rgba(0,0,0,0.3) !important;
      }
    }

    /* List Card Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 20px;
      font-size: 0.65rem;
      font-weight: 700;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .status-badge.online {
      background-color: #dcfce7;
      color: #15803d;
    }
    
    .status-badge.offline {
      background-color: #f3f4f6;
      color: #4b5563;
    }

    .status-badge.waiting {
      background-color: #fef3c7;
      color: #b45309;
    }

    .status-badge.boarded {
      background-color: #dbeafe;
      color: #1d4ed8;
    }

    /* Friend list avatar wrapper with status dot */
    .friend-avatar-wrapper {
      position: relative;
      display: inline-block;
      flex-shrink: 0;
    }

    .friend-online-dot {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      z-index: 5;
    }
    
    .friend-online-dot.online {
      background-color: #10b981;
    }

    .friend-online-dot.offline {
      background-color: #9ca3af;
    }

    /* Overlay Badge on avatar */
    .friend-avatar-badge {
      position: absolute;
      top: -4px;
      left: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 6;
      padding: 2px;
    }

    .friend-avatar-badge img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
</style>

<div id="view-groups" class="mt-3 d-none">
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
            <img src="<?php echo isset($depth) ? $depth : '../../'; ?>assets/images/REFRESH.svg" onclick="generateInviteCode(true)" title="Reset Code" alt="Refresh Code" style="width: 28px; height: 28px; cursor: pointer; transition: transform 0.3s;" onmouseover="this.style.transform='rotate(90deg)'" onmouseout="this.style.transform='rotate(0deg)'">
        </div>
        
        <div class="d-flex align-items-center gap-2 mb-3">
            <div id="invite-code" class="fw-bold fs-4 text-primary bg-white border rounded-3 px-3 py-2 flex-grow-1 text-center" style="letter-spacing: 2px;">------</div>
            <img src="<?php echo isset($depth) ? $depth : '../../'; ?>assets/images/COPY.svg" onclick="copyInviteCode()" title="Copy Code" alt="Copy Code" style="height: 48px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
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

    <!-- QR Code Modal -->
    <div class="modal fade" id="qrCodeModal" tabindex="-1" aria-labelledby="qrCodeModalLabel" aria-hidden="true" style="z-index: 2000;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content rounded-4 border-0 shadow">
                <div class="modal-header border-0 pb-0">
                    <span class="fw-bold small text-muted" id="qrCodeModalLabel">SCAN TO JOIN</span>
                    <button type="button" class="btn border-0 bg-transparent p-0" style="box-shadow: none;" data-bs-dismiss="modal" aria-label="Close">
                        <img src="../../assets/images/EKS.svg" alt="Close" style="width: 20px; height: 20px; display: block;" />
                    </button>
                </div>
                <div class="modal-body text-center pt-2 pb-4">
                    <div id="qr-code-img-container" class="mb-3 d-flex justify-content-center"></div>
                    <small class="text-muted d-block px-2">Let your friend scan this code to instantly join your circle.</small>
                </div>
            </div>
        </div>
    </div>

    <div class="p-3 bg-light rounded-4 mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0 fw-bold text-dark">Join a Circle</h6>
            <button class="btn btn-sm btn-primary rounded-pill d-flex align-items-center gap-1" onclick="toggleScanner()">
                <span class="material-symbols-rounded" style="font-size: 18px;">qr_code_scanner</span>
                Scan
            </button>
        </div>
        
    <!-- QR Scanner Modal -->
    <div class="modal fade" id="qrScannerModal" tabindex="-1" aria-labelledby="qrScannerModalLabel" aria-hidden="true" style="z-index: 2000;">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content rounded-4 border-0 shadow">
                <div class="modal-header border-0 pb-0">
                    <span class="fw-bold small text-muted" id="qrScannerModalLabel">SCAN QR CODE</span>
                    <button type="button" class="btn border-0 bg-transparent p-0" style="box-shadow: none;" data-bs-dismiss="modal" aria-label="Close" onclick="stopScanner()">
                        <img src="../../assets/images/EKS.svg" alt="Close" style="width: 20px; height: 20px; display: block;" />
                    </button>
                </div>
                <div class="modal-body text-center pt-2 pb-4">
                    <div id="qr-reader" style="width: 100%; min-height: 250px; border-radius: 8px; overflow: hidden;" class="mx-auto border"></div>
                    <small class="text-muted d-block mt-3 px-2">Position the QR code within the frame to scan.</small>
                </div>
            </div>
        </div>
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
    const LOCATION_UPDATE_INTERVAL_MS = 15000; // 15s (balanced for InfinityFree)
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

            const isWaiting = friend.waiting_status === 'waiting';
            const isBoarded = friend.ride_status === 'active';
            const busCode = friend.boarded_bus_code || '';

            const marker = createPersonMarker(lat, lng, friendName, initials, bgColor, friend.profile_picture, isWaiting, isBoarded, busCode);
            
            const isFresh = isLocationFresh(friend.updated_at);
            
            let popupHtml = `<div><strong style="font-size: 0.95rem;">${friendName}</strong>`;
            
            if (isFresh) {
                popupHtml += ` <span class="badge bg-success" style="font-size: 0.65rem; padding: 2px 6px; margin-left: 4px; vertical-align: middle;">Online</span>`;
            } else {
                popupHtml += ` <span class="badge bg-secondary" style="font-size: 0.65rem; padding: 2px 6px; margin-left: 4px; vertical-align: middle;">Offline</span>`;
            }
            
            popupHtml += `</div>`;

            if (isWaiting) {
                popupHtml += `<div class="mt-1 small text-success d-flex align-items-center gap-1">`;
                popupHtml += `<span class="material-symbols-rounded" style="font-size: 14px;">hourglass_empty</span>`;
                popupHtml += `<span>Waiting at <b>${friend.waiting_location}</b></span>`;
                popupHtml += `</div>`;
            } else if (isBoarded) {
                popupHtml += `<div class="mt-1 small text-primary d-flex align-items-center gap-1">`;
                popupHtml += `<span class="material-symbols-rounded" style="font-size: 14px;">directions_bus</span>`;
                popupHtml += `<span>Onboard Bus <b>${busCode}</b></span>`;
                popupHtml += `</div>`;
            }
            
            if (friend.updated_at) {
                popupHtml += `<div class="text-muted mt-1" style="font-size: 0.7rem;">${getLastSeenLabel(friend.updated_at)}</div>`;
            }

            marker.bindPopup(popupHtml);

            if (!isFresh) {
                marker.setOpacity(0.6);
            }
            
            marker.addTo(window.map);
            groupMarkers.push(marker);
        });
    }

    function createPersonMarker(lat, lng, label = '', initials = '?', bgColor = '#1e3a8a', profilePicture = null, isWaiting = false, isBoarded = false, busCode = '') {
        let innerHtml = initials;
        const basePath = window.APP_BASE_URL ? (window.APP_BASE_URL.endsWith('/') ? window.APP_BASE_URL : window.APP_BASE_URL + '/') : "<?php echo isset($depth) ? $depth : '../../'; ?>";
        if (profilePicture) {
            const isAbsolute = /^https?:\/\/|^data:/i.test(profilePicture);
            const safePath = isAbsolute ? profilePicture : basePath + (profilePicture.startsWith('/') ? profilePicture.substring(1) : profilePicture);
            innerHtml = `<img src="${safePath}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }

        let bubbleHtml = '';
        if (isWaiting) {
            const bubbleUrl = basePath + 'assets/images/waitingMEG.svg';
            bubbleHtml = `
                <div class="friend-waiting-bubble" style="position: absolute; bottom: 38px; left: calc(50% + 20px); width: 46px; height: 20px; z-index: 1001; pointer-events: none;">
                    <img src="${bubbleUrl}" style="width: 100%; height: 100%; display: block;" />
                </div>
            `;
        }

        let busBadgeHtml = '';
        if (isBoarded) {
            const busIconUrl = basePath + 'assets/images/busonallbuses.svg';
            busBadgeHtml = `
                <div class="friend-boarded-badge" style="position: absolute; bottom: -4px; right: -4px; width: 18px; height: 18px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1.5px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2); z-index: 1002;">
                    <img src="${busIconUrl}" style="width: 11px; height: 11px; filter: brightness(0) invert(1);" />
                </div>
            `;
        }

        const waitingClass = isWaiting ? ' is-waiting' : '';
        const boardedClass = isBoarded ? ' is-boarded' : '';

        return L.marker([lat, lng], {
            icon: L.divIcon({
                html: `
          <div class="friend-marker-container${waitingClass}${boardedClass}" style="position: relative; width: 36px; height: 36px;">
              <div class="friend-avatar-circle" style="background:${bgColor}; color:white; border-radius:50%; width:36px; height:36px;
                  display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3); font-weight:bold; font-size:14px; letter-spacing:0.5px; overflow: hidden;">
                  ${innerHtml}
              </div>
              ${bubbleHtml}
              ${busBadgeHtml}
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
                const basePath = window.APP_BASE_URL ? (window.APP_BASE_URL.endsWith('/') ? window.APP_BASE_URL : window.APP_BASE_URL + '/') : "<?php echo isset($depth) ? $depth : '../../'; ?>";
                const id = friend && friend.id != null ? String(friend.id) : null;
                if (id && seenIds.has(id)) return;
                if (id) seenIds.add(id);

                const lat = friend.latitude !== null ? parseFloat(friend.latitude) : null;
                const lng = friend.longitude !== null ? parseFloat(friend.longitude) : null;

                const fresh = isLocationFresh(friend.updated_at);
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                const hasLocationNow = hasCoords && fresh;

                const isWaiting = friend.waiting_status === 'waiting';
                const isBoarded = friend.ride_status === 'active';

                let statusText = 'Location unavailable';
                if (isWaiting) {
                    statusText = `at ${friend.waiting_location}`;
                } else if (isBoarded) {
                    statusText = `Bus ${friend.boarded_bus_code}`;
                } else if (hasLocationNow) {
                    statusText = 'Live location available';
                } else if (friend.updated_at) {
                    statusText = getLastSeenLabel(friend.updated_at);
                }

                const friendName = friend.name || friend.email || "?";
                const initials = initialsFromFriend(friend);
                const bgColor = colorFromString(friend.email || friend.name || initials);

                const card = document.createElement('div');
                card.className = 'd-flex align-items-center p-3 bg-light rounded-4 mb-2 cursor-pointer';

                let avatarHtml = initials;
                if (friend.profile_picture) {
                    const isAbsolute = /^https?:\/\/|^data:/i.test(friend.profile_picture);
                    const safePath = isAbsolute ? friend.profile_picture : basePath + (friend.profile_picture.startsWith('/') ? friend.profile_picture.substring(1) : friend.profile_picture);
                    avatarHtml = `<img src="${safePath}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                }

                let avatarBadgeHtml = '';
                if (isWaiting) {
                    const markUrl = basePath + 'assets/images/waitingMark.svg';
                    avatarBadgeHtml = `<div class="friend-avatar-badge" title="Waiting at ${friend.waiting_location}"><img src="${markUrl}" alt="Waiting"></div>`;
                } else if (isBoarded) {
                    const busUrl = basePath + 'assets/images/busonallbuses.svg';
                    avatarBadgeHtml = `<div class="friend-avatar-badge" style="background: #3b82f6; border-color: #3b82f6;" title="Onboard Bus ${friend.boarded_bus_code}"><img src="${busUrl}" alt="Boarded" style="filter: brightness(0) invert(1);"></div>`;
                }

                let statusBadgeHtml = '';
                if (isWaiting) {
                    statusBadgeHtml = `<span class="status-badge waiting me-1">Waiting</span>`;
                } else if (isBoarded) {
                    statusBadgeHtml = `<span class="status-badge boarded me-1">Boarded</span>`;
                } else if (fresh) {
                    statusBadgeHtml = `<span class="status-badge online me-1">Online</span>`;
                } else {
                    statusBadgeHtml = `<span class="status-badge offline me-1">Offline</span>`;
                }

                card.innerHTML = `
          <div class="d-flex align-items-center flex-grow-1 card-fly-content" style="min-width:0;">
              <div class="friend-avatar-wrapper me-3">
                  <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0" style="width: 48px; height: 48px; background-color: ${bgColor}; border: 2px solid white; font-size: 18px; letter-spacing: 0.5px; overflow: hidden;">
                      ${avatarHtml}
                  </div>
                  ${avatarBadgeHtml}
                  <div class="friend-online-dot ${fresh ? 'online' : 'offline'}"></div>
              </div>
              <div class="text-truncate">
                  <h6 class="mb-1 fw-bold text-dark text-truncate" style="font-size: 0.95rem;">${friendName}</h6>
                  <div class="d-flex align-items-center text-truncate">
                      ${statusBadgeHtml}
                      <small class="text-muted text-truncate" style="font-size: 0.75rem;">${statusText}</small>
                  </div>
              </div>
          </div>
          <img src="${basePath}assets/images/unfriend.svg" class="ms-2 remove-friend-btn" title="Remove from Circle" alt="Unfriend" style="width: 32px; height: 32px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        `;

                card.querySelector('.card-fly-content').addEventListener('click', () => {
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

                card.querySelector('.remove-friend-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFriend(friend.id, friendName);
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

    async function removeFriend(id, name) {
        if (!confirm(`Are you sure you want to remove ${name} from your circle?`)) return;

        try {
            const res = await fetch('../../backend/removeFriend.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friend_id: id })
            });

            const data = await res.json();
            if (data.success) {
                loadGroupMembers(); // Refresh list to remove the friend visually
                if (navigator.vibrate) navigator.vibrate(50);
            } else {
                alert(data.message || 'Failed to remove friend');
            }
        } catch (err) {
            console.error('Remove friend error:', err);
            alert('An error occurred while removing the friend.');
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
                // If QR modal is visible, update it
                const qrModalEl = document.getElementById('qrCodeModal');
                if (qrModalEl && qrModalEl.classList.contains('show')) {
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

        const imgContainer = document.getElementById('qr-code-img-container');
        
        // Using QRServer API (Google Charts is deprecated)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;
        
        imgContainer.innerHTML = `<img src="${qrUrl}" alt="Invite QR Code" class="img-fluid border rounded-3 p-2 shadow-sm" style="max-width: 200px;">`;
        
        const qrModalEl = document.getElementById('qrCodeModal');
        
        // Move modal to body to prevent stacking context issues with the bottom sheet backdrop
        if (qrModalEl.parentNode !== document.body) {
            document.body.appendChild(qrModalEl);
        }

        const modal = bootstrap.Modal.getInstance(qrModalEl) || new bootstrap.Modal(qrModalEl);
        modal.show();
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
        const scannerModalEl = document.getElementById('qrScannerModal');
        
        // Move modal to body to prevent stacking context issues
        if (scannerModalEl.parentNode !== document.body) {
            document.body.appendChild(scannerModalEl);
        }

        const modal = bootstrap.Modal.getInstance(scannerModalEl) || new bootstrap.Modal(scannerModalEl);
        modal.show();

        // Let the modal open first
        setTimeout(() => {
            startScanner();
        }, 300);

        scannerModalEl.addEventListener('hidden.bs.modal', function () {
            stopScanner();
        }, { once: true });
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
                
                const scannerModalEl = document.getElementById('qrScannerModal');
                const modal = bootstrap.Modal.getInstance(scannerModalEl);
                if (modal) modal.hide();
                
                joinByCode(); // Auto-join after scan
            },
            (errorMessage) => {
                // Silent error (normal during scanning)
            }
        ).catch(err => {
            console.error('Camera access failed:', err);
            alert('Unable to access camera. Please check permissions.');
            
            const scannerModalEl = document.getElementById('qrScannerModal');
            const modal = bootstrap.Modal.getInstance(scannerModalEl);
            if (modal) modal.hide();
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
        if (locationTimer) clearTimeout(locationTimer);
        function scheduleNextLocationUpdate() {
            locationTimer = setTimeout(async () => {
                await sendCurrentLocation();
                scheduleNextLocationUpdate();
            }, LOCATION_UPDATE_INTERVAL_MS);
        }
        scheduleNextLocationUpdate();
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

    function _cleanup() {
        if (locationTimer) { clearTimeout(locationTimer); locationTimer = null; }
        isSendingLocation = false;
    }
    window.addEventListener('beforeunload', _cleanup);
    window.addEventListener('pagehide', _cleanup);
</script>