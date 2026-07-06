import React from 'react';

/**
 * Generates the Leaflet HTML source code for the passenger map WebView.
 * 
 * @param baseUrl The base URL of the server to fetch assets (icons, markers, etc.).
 */
export function getLeafletHTML(baseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100vw; background: #e5e7eb; }
        
        .waiting-badge {
          background: #ffffff;
          border: 2px solid #10b981;
          border-radius: 12px;
          color: #10b981;
          font-family: sans-serif;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          white-space: nowrap;
          position: absolute;
          bottom: 34px;
          left: 50%;
          transform: translateX(-50%);
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        
        .user-avatar-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2.5px solid #ffffff;
          color: #ffffff;
          font-family: sans-serif;
          font-weight: 900;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px #3b82f6, 0 3px 8px rgba(0,0,0,0.3);
        }

        .bus-marker-icon {
          background: #1856b0;
          border: 2px solid #ffffff;
          border-radius: 50%;
          color: white;
          font-family: sans-serif;
          font-weight: bold;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .bus-stop-icon {
          background: #ef4444;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([14.2137, 121.1620], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var routeGeoJSON = ${JSON.stringify(require('../../assets/data/laurel-talisay-tanauan.json'))};
        if (routeGeoJSON) {
          L.geoJSON(routeGeoJSON, {
            style: function (feature) {
              return { color: '#3b82f6', weight: 4, opacity: 0.7 };
            },
            filter: function(feature) {
              return feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString';
            }
          }).addTo(map);
        }

        var userMarker = null;
        var busMarkers = {};
        var stopMarkers = {};
        window.groupMarkers = [];

        // Custom listener for RN postMessage (supporting both Android document and iOS/Web window listeners)
        function handleIncomingMessage(event) {
          try {
            var data = JSON.parse(event.data);
            if (data.type === 'SET_CENTER') {
              map.setView([data.lat, data.lng], data.zoom || 14);
            } 
            else if (data.type === 'FOCUS_STOP') {
              var m = stopMarkers[data.stop_id || data.name];
              if (m) {
                map.setView(m.getLatLng(), 16);
                m.openPopup();
              }
            }
            else if (data.type === 'FOCUS_BUS') {
              var busKey = data.bus_id || data.Bus_ID || data.plate_number;
              var m = busMarkers[busKey];
              if (!m && data.plate_number) {
                m = busMarkers[data.plate_number];
              }
              if (m) {
                map.setView(m.getLatLng(), 16);
                m.openPopup();
              }
            }
            else if (data.type === 'UPDATE_USER_LOCATION') {
              window.userLastData = data;
              var avatarHtml = (data.profilePic && data.profilePic !== '') 
                ? '<img src="' + data.profilePic + '" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display=\\'none\\';" />'
                : data.initial;

              var badgeText = data.isWaiting ? 'Waiting!' : 'Waiting?';
              var badgeBg = data.isWaiting ? 'background: #10b981; border-color: #10b981; color: white;' : 'background: #ffffff; border-color: #10b981; color: #10b981;';
              var avatarBorder = data.isWaiting ? 'border-color: #10b981; box-shadow: 0 0 0 2px #10b981, 0 3px 8px rgba(0,0,0,0.3);' : '';

              var userIcon = L.divIcon({
                className: 'user-marker-container',
                html: '<div style="position: relative; width: 30px; height: 30px;"><div class="waiting-badge" style="' + badgeBg + '">' + badgeText + '</div><div class="user-avatar-circle" style="overflow: hidden; display: flex; align-items: center; justify-content: center; ' + avatarBorder + '">' + avatarHtml + '</div></div>',
                iconSize: [30, 45],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
              });

              if (userMarker) {
                userMarker.setLatLng([data.lat, data.lng]);
                userMarker.setIcon(userIcon);
              } else {
                userMarker = L.marker([data.lat, data.lng], { icon: userIcon }).addTo(map);
                userMarker.on('click', function() {
                  if (postMessageFn) {
                    postMessageFn(JSON.stringify({ type: 'USER_MARKER_CLICKED' }));
                  }
                });
              }
              if (data.center) {
                map.setView([data.lat, data.lng], 14);
              }
            } 
            else if (data.type === 'UPDATE_BUSES') {
              Object.keys(busMarkers).forEach(function(key) {
                map.removeLayer(busMarkers[key]);
              });
              busMarkers = {};
              data.buses.forEach(function(bus) {
                var lat = bus.lat || bus.latitude;
                var lng = bus.lng || bus.longitude;
                if (lat && lng) {
                  var busIcon = L.divIcon({
                    className: 'bus-marker-svg-container',
                    html: '<div style="width:28px;height:28px;">' +
                          '<svg width="28" height="28" viewBox="0 0 3429 3429" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                          '<circle cx="1714.5" cy="1714.5" r="1714.5" fill="white"/>' +
                          '<rect x="931" y="1365" width="202" height="439" rx="59" fill="#021F53"/>' +
                          '<rect x="1114" y="2213" width="308" height="322" rx="59" fill="#021F53"/>' +
                          '<rect x="2297" y="1365" width="202" height="439" rx="59" fill="#021F53"/>' +
                          '<rect x="2013" y="2261" width="308" height="274" rx="59" fill="#021F53"/>' +
                          '<path d="M2148 969C2275.03 969 2378 1071.97 2378 1199V2316H1052V1199C1052 1071.97 1154.97 969 1282 969H2148ZM1268.5 1962C1205.26 1962 1154 2013.26 1154 2076.5C1154 2139.74 1205.26 2191 1268.5 2191C1331.74 2191 1383 2139.74 1383 2076.5C1383 2013.26 1331.74 1962 1268.5 1962ZM2182.5 1962C2119.26 1962 2068 2013.26 2068 2076.5C2068 2139.74 2119.26 2191 2182.5 2191C2245.74 2191 2297 2139.74 2297 2076.5C2297 2013.26 2245.74 1962 2182.5 1962ZM1173 1804H1636V1263H1173V1804ZM1808 1804H2271V1263H1808V1804Z" fill="#021F53"/>' +
                          '<path d="M1714.5 168C2568.61 168 3261 860.392 3261 1714.5C3261 2568.61 2568.61 3261 1714.5 3261C860.392 3261 168 2568.61 168 1714.5C168 860.392 860.392 168 1714.5 168ZM1714.5 598C1097.87 598 598 1097.87 598 1714.5C598 2331.13 1097.87 2831 1714.5 2831C2331.13 2831 2831 2331.13 2831 1714.5C2831 1097.87 2331.13 598 1714.5 598Z" fill="#021F53"/>' +
                          '</svg>' +
                          '</div>',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                    popupAnchor: [0, -14]
                  });
                  var m = L.marker([parseFloat(lat), parseFloat(lng)], { icon: busIcon })
                    .bindPopup('<b>Bus Plate:</b> ' + (bus.plate_number || 'N/A') + '<br/><b>Route:</b> ' + (bus.route || 'N/A'))
                    .addTo(map);
                  var busKey = bus.Bus_ID || bus.bus_id || bus.plate_number;
                  busMarkers[busKey] = m;
                }
              });
            }
            else if (data.type === 'UPDATE_STOPS') {
              Object.keys(stopMarkers).forEach(function(key) {
                map.removeLayer(stopMarkers[key]);
              });
              stopMarkers = {};
              data.stops.forEach(function(stop) {
                var lat = stop.lat || stop.latitude;
                var lng = stop.lng || stop.longitude;
                if (lat && lng) {
                  var stopIcon = L.divIcon({
                    className: 'bus-stop-marker-svg-container',
                    html: '<div style="width:26px;height:33px;">' +
                          '<svg width="26" height="33" viewBox="0 0 3287 4203" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                          '<rect x="750.834" y="1205.59" width="229.82" height="500.548" rx="59" fill="#1856b0"/>' +
                          '<rect x="959.037" y="2172.48" width="350.418" height="367.144" rx="59" fill="#1856b0"/>' +
                          '<rect x="2304.96" y="1205.59" width="229.82" height="500.548" rx="59" fill="#1856b0"/>' +
                          '<rect x="1981.85" y="2227.21" width="350.418" height="312.415" rx="59" fill="#1856b0"/>' +
                          '<path d="M2167.12 754.076C2294.14 754.076 2397.12 857.051 2397.12 984.076V2289.92H888.5V984.076C888.5 857.051 991.475 754.076 1118.5 754.076H2167.12ZM1134.82 1886.29C1062.87 1886.29 1004.55 1944.74 1004.55 2016.85C1004.55 2088.95 1062.87 2147.4 1134.82 2147.4C1206.76 2147.4 1265.09 2088.95 1265.09 2016.85C1265.09 1944.74 1206.76 1886.29 1134.82 1886.29ZM2174.69 1886.29C2102.75 1886.29 2044.42 1944.74 2044.42 2016.85C2044.42 2088.95 2102.75 2147.4 2174.69 2147.4C2246.64 2147.4 2304.96 2088.95 2304.96 2016.85C2304.96 1944.74 2246.64 1886.29 2174.69 1886.29ZM1026.16 1706.14H1552.93V1089.29H1026.16V1706.14ZM1748.62 1706.14H2275.38V1089.29H1748.62V1706.14Z" fill="#1856b0"/>' +
                          '<path d="M2355.03 0C2869.2 0.000252381 3286.03 416.823 3286.03 931V2362.18C3286.03 2876.36 2869.2 3293.18 2355.03 3293.18H931C416.823 3293.18 0 2876.36 0 2362.18V931.001C0 416.824 416.823 0 931 0H2355.03ZM1277.99 304.562C763.81 304.562 346.987 721.385 346.987 1235.56V1972.12C346.987 2486.29 763.809 2903.12 1277.99 2903.12H2008.89C2523.07 2903.12 2939.89 2486.29 2939.89 1972.12V1235.56C2939.89 721.385 2523.07 304.563 2008.89 304.562H1277.99Z" fill="#1856b0"/>' +
                          '<path d="M1755.22 4081C1697.77 4136.99 1606.57 4138.29 1547.56 4083.97L522.862 3140.71C412.608 3039.22 501.579 2856.44 649.478 2880.59L1569.22 3030.79C1586.3 3033.57 1603.73 3033.41 1620.75 3030.29L2626.15 2846.24C2772.84 2819.38 2865.52 2998.81 2758.72 3102.9L1755.22 4081Z" fill="#1856b0"/>' +
                          '</svg>' +
                          '</div>',
                    iconSize: [26, 33],
                    iconAnchor: [13, 33],
                    popupAnchor: [0, -33]
                  });
                  var labelType = (stop.type || 'stop').toUpperCase() === 'TERMINAL' ? 'Bus Stop' : 'Pickup Point';
                  var popupContent = '<div>' +
                    '<strong style="font-size:13px;color:#1e293b;display:block;margin-bottom:2px;">' + (stop.name || '') + '</strong>' +
                    '<span style="font-size:11px;color:#475569;display:block;">' + (stop.location_name || '') + '</span>' +
                    (stop.location_landmark ? '<span style="font-size:11px;color:#475569;display:block;">' + stop.location_landmark + '</span>' : '') +
                    '<span style="font-size:10px;color:#64748b;font-weight:bold;display:block;margin-top:4px;">' + labelType + '</span>' +
                    '</div>';
                  var m = L.marker([parseFloat(lat), parseFloat(lng)], { icon: stopIcon })
                    .bindPopup(popupContent)
                    .addTo(map);
                  stopMarkers[stop.id || stop.name] = m;
                }
              });
            }
            else if (data.type === 'UPDATE_FRIENDS') {
              if (window.groupMarkers) {
                window.groupMarkers.forEach(function(m) {
                  map.removeLayer(m);
                });
              }
              window.groupMarkers = [];

              // Group friends by coordinates (rounded to 5 decimal places, ~1 meter precision for clustering)
              var coordGroups = {};
              if (data.friends && Array.isArray(data.friends)) {
                data.friends.forEach(function(friend) {
                  if (friend.latitude && friend.longitude) {
                    var flat = parseFloat(friend.latitude);
                    var flng = parseFloat(friend.longitude);
                    var key = flat.toFixed(5) + ',' + flng.toFixed(5);
                    if (!coordGroups[key]) {
                      coordGroups[key] = [];
                    }
                    coordGroups[key].push(friend);
                  }
                });
              }

              var anyUserOverlapInGroup = false;

              Object.keys(coordGroups).forEach(function(key) {
                var groupMembers = coordGroups[key].slice(); // copy friends
                var lat = parseFloat(groupMembers[0].latitude);
                var lng = parseFloat(groupMembers[0].longitude);

                // Check if user overlaps with this group
                var userOverlaps = false;
                if (data.user) {
                  var dist = Math.sqrt(
                    Math.pow(data.user.lat - lat, 2) +
                    Math.pow(data.user.lng - lng, 2)
                  );
                  if (dist < 0.00015) { // within ~15 meters
                    userOverlaps = true;
                    anyUserOverlapInGroup = true;
                    // Add virtual user member to the front of this group cluster
                    groupMembers.unshift({
                      name: 'You',
                      latitude: data.user.lat,
                      longitude: data.user.lng,
                      profile_picture: data.user.profilePic,
                      initials: data.user.initial,
                      isUser: true
                    });
                  }
                }

                // If only 1 person in group and no user overlap, render normal single marker
                if (groupMembers.length === 1 && !userOverlaps) {
                  var friend = groupMembers[0];
                  var initials = (friend.name || friend.email || '?').substring(0, 2).toUpperCase();
                  var isWaiting = friend.waiting_status === 'waiting';
                  var isBoarded = friend.ride_status === 'active';
                  
                  var profilePicUrl = '';
                  if (friend.profile_picture) {
                    profilePicUrl = (friend.profile_picture.indexOf('http') === 0 || friend.profile_picture.indexOf('data:') === 0)
                      ? friend.profile_picture 
                      : '${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}/' + friend.profile_picture.replace(/^\\//, '');
                  }

                  var avatarHtml = (profilePicUrl && profilePicUrl !== '')
                    ? '<img src="' + profilePicUrl + '" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display=\\'none\\';" />'
                    : initials;

                  var friendIcon = L.divIcon({
                    className: 'friend-marker-container',
                    html: '<div style="position: relative; width: 30px; height: 30px;">' +
                          '<div class="user-avatar-circle" style="background: #10b981; border-color: white; overflow: hidden; display: flex; align-items: center; justify-content: center;">' + avatarHtml + '</div>' +
                          '</div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    popupAnchor: [0, -15]
                  });

                  var popupHtml = '<div><strong>' + (friend.name || friend.email) + '</strong></div>';
                  if (isWaiting) {
                    popupHtml += '<div style="font-size:11px;color:#d97706;">Waiting at <b>' + (friend.waiting_location || '') + '</b></div>';
                  } else if (isBoarded) {
                    popupHtml += '<div style="font-size:11px;color:#15803d;">Onboard Bus <b>' + (friend.boarded_bus_code || '') + '</b></div>';
                  } else {
                    popupHtml += '<div style="font-size:11px;color:#64748b;">Live location available</div>';
                  }

                  var m = L.marker([lat, lng], { icon: friendIcon })
                    .bindPopup(popupHtml)
                    .addTo(map);
                  window.groupMarkers.push(m);
                } else {
                  // Render a beautiful Life360-style clustered bubble
                  var innerHtml = '<div class="avatar-bubble-cluster" style="display: flex; flex-direction: row; align-items: center; background: white; border-radius: 20px; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 2px solid white; position: relative;">';
                  var popupHtml = '<div style="font-size:12px;"><strong>People at this location:</strong><ul style="margin: 4px 0 0 0; padding-left: 16px;">';

                  groupMembers.forEach(function(member, idx) {
                    var initials = member.isUser 
                      ? (member.initials || 'Y') 
                      : (member.name || member.email || '?').substring(0, 2).toUpperCase();
                    
                    var profilePicUrl = '';
                    if (member.profile_picture) {
                      profilePicUrl = (member.profile_picture.indexOf('http') === 0 || member.profile_picture.indexOf('data:') === 0)
                        ? member.profile_picture 
                        : '${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}/' + member.profile_picture.replace(/^\\//, '');
                    }

                    var avatarHtml = (profilePicUrl && profilePicUrl !== '')
                      ? '<img src="' + profilePicUrl + '" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display=\\'none\\';" />'
                      : initials;

                    var mlStyle = idx > 0 ? 'margin-left: -10px;' : '';
                    var borderCol = member.isUser ? '#2563eb' : '#10b981'; // Blue border for user, green for friends

                    innerHtml += '<div style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid ' + borderCol + '; background: ' + (member.isUser ? '#2563eb' : '#10b981') + '; color: white; display: flex; align-items: center; justify-content: center; overflow: hidden; ' + mlStyle + ' font-size: 10px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">' + avatarHtml + '</div>';

                    popupHtml += '<li>' + (member.isUser ? '<b>You</b>' : (member.name || member.email)) + '</li>';
                  });

                  popupHtml += '</ul></div>';

                  // Downward pointing arrow/tail
                  innerHtml += '<div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid white; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));"></div>';
                  innerHtml += '</div>';

                  var clusterIconWidth = 32 + (groupMembers.length - 1) * 22 + 12;
                  var clusterIcon = L.divIcon({
                    className: 'friend-cluster-marker',
                    html: innerHtml,
                    iconSize: [clusterIconWidth, 44],
                    iconAnchor: [clusterIconWidth / 2, 42],
                    popupAnchor: [0, -42]
                  });

                  var m = L.marker([lat, lng], { icon: clusterIcon })
                    .bindPopup(popupHtml)
                    .addTo(map);

                  if (userOverlaps) {
                    m.on('click', function() {
                      if (postMessageFn) {
                        postMessageFn(JSON.stringify({ type: 'USER_MARKER_CLICKED' }));
                      }
                    });
                  }

                  window.groupMarkers.push(m);
                }
              });

              // Adjust userMarker opacity based on whether they are clustered
              if (userMarker) {
                if (anyUserOverlapInGroup) {
                  userMarker.setOpacity(0); // Hide separate user marker
                } else {
                  userMarker.setOpacity(1); // Show separate user marker
                }
              }
            }
          } catch(e) {
            console.error('[Leaflet WebView Error]', e);
          }
        }
        window.addEventListener('message', handleIncomingMessage);
        document.addEventListener('message', handleIncomingMessage);

        var postMessageFn = (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) 
          ? window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView) 
          : (window.parent && window.parent.postMessage) ? function(msg) { window.parent.postMessage(msg, '*'); } : null;

        if (postMessageFn) {
          postMessageFn(JSON.stringify({ type: 'MAP_READY' }));
        }
      </script>
    </body>
    </html>
  `;
}
