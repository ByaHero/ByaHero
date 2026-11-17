/**
 * Generates the Leaflet HTML source code for the conductor dashboard and live tracking maps.
 */
export function getConductorLeafletHTML(baseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100vw; background: #eef2f6; }
        
        .bus-marker-dot {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bus-marker-popup {
          font-family: sans-serif;
          font-size: 12px;
          color: #334155;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([14.0905, 121.0550], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
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

        var busMarkers = {};
        var currentMarker = null;

        var statusColors = {
          available: '#10b981',
          on_stop: '#f59e0b',
          full: '#ef4444',
          unavailable: '#6b7280'
        };

        // White SVG bus marker icon for all buses (busStopMarkerFinalWhite.svg)
        var whiteBusSvg = '<svg width="100%" height="100%" viewBox="0 0 3287 4203" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="750.834" y="1205.6" width="229.82" height="500.548" rx="59" fill="white"/><rect x="959.037" y="2172.49" width="350.418" height="367.144" rx="59" fill="white"/><rect x="2304.96" y="1205.6" width="229.82" height="500.548" rx="59" fill="white"/><rect x="1981.85" y="2227.21" width="350.418" height="312.415" rx="59" fill="white"/><path d="M2167.12 754.077C2294.14 754.077 2397.12 857.052 2397.12 984.077V2289.93H888.5V984.077C888.5 857.052 991.475 754.077 1118.5 754.077H2167.12ZM1134.82 1886.29C1062.87 1886.29 1004.55 1944.75 1004.55 2016.85C1004.55 2088.95 1062.87 2147.4 1134.82 2147.4C1206.76 2147.4 1265.09 2088.95 1265.09 2016.85C1265.09 1944.75 1206.76 1886.3 1134.82 1886.29ZM2174.69 1886.29C2102.75 1886.29 2044.42 1944.75 2044.42 2016.85C2044.42 2088.95 2102.75 2147.4 2174.69 2147.4C2246.64 2147.4 2304.96 2088.95 2304.96 2016.85C2304.96 1944.75 2246.64 1886.3 2174.69 1886.29ZM1026.16 1706.14H1552.93V1089.3H1026.16V1706.14ZM1748.62 1706.14H2275.38V1089.3H1748.62V1706.14Z" fill="white"/><path d="M2355.03 0C2869.2 0.000252381 3286.03 416.823 3286.03 931V2362.18C3286.03 2876.36 2869.2 3293.18 2355.03 3293.18H931C416.823 3293.18 0 2876.36 0 2362.18V931.001C0 416.824 416.823 0 931 0H2355.03ZM1277.99 304.562C763.81 304.562 346.987 721.385 346.987 1235.56V1972.12C346.988 2486.29 763.809 2903.12 1277.99 2903.12H2008.89C2523.07 2903.12 2939.89 2486.29 2939.89 1972.12V1235.56C2939.89 721.385 2523.07 304.563 2008.89 304.562H1277.99Z" fill="white"/><path d="M1755.22 4081C1697.77 4136.99 1606.57 4138.29 1547.56 4083.97L522.862 3140.71C412.608 3039.22 501.579 2856.44 649.478 2880.59L1569.22 3030.79C1586.3 3033.57 1603.73 3033.41 1620.75 3030.29L2626.15 2846.24C2772.84 2819.38 2865.52 2998.81 2758.72 3102.9L1755.22 4081Z" fill="white"/></svg>';
        var otherBusSvg = whiteBusSvg;
        var myBusSvg = whiteBusSvg;

        function getBusIcon(status) {
          return L.divIcon({
            html: '<div style="width: 28px; height: 36px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.65)) drop-shadow(0px 0px 2px rgba(0,0,0,0.4));">' + otherBusSvg + '</div>',
            className: 'bus-marker-dot',
            iconSize: [28, 36],
            iconAnchor: [14, 36]
          });
        }

        function getMyIcon() {
          return L.divIcon({
            html: '<div style="width: 32px; height: 41px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.75)) drop-shadow(0px 0px 3px rgba(0,0,0,0.5));">' + myBusSvg + '</div>',
            className: 'bus-marker-dot',
            iconSize: [32, 41],
            iconAnchor: [16, 41]
          });
        }

        // Handle Messages from React Native code
        function handleIncomingMessage(event) {
          try {
            var data = JSON.parse(event.data);
            
            if (data.type === 'SET_CENTER') {
              map.setView([data.lat, data.lng], data.zoom || 13);
            } 
            else if (data.type === 'UPDATE_BUSES') {
              // Remove old markers
              Object.keys(busMarkers).forEach(function(id) {
                map.removeLayer(busMarkers[id]);
              });
              busMarkers = {};

              // Draw new bus markers
              if (data.buses) {
                data.buses.forEach(function(bus) {
                  if (bus.coords) {
                    var icon = getBusIcon(bus.status);
                    var statusBadge = bus.status ? '<div style="margin-top:2px;"><span style="display:inline-block; padding:1px 5px; border-radius:4px; font-size:10px; font-weight:bold; background:' + (statusColors[bus.status] || '#64748b') + '; color:#fff; text-transform:uppercase;">' + bus.status.replace('_', ' ') + '</span></div>' : '';
                    var popupText = '<div class="bus-marker-popup"><b>' + bus.code + '</b><br/>' + bus.locName + statusBadge + '</div>';
                    var m = L.marker(bus.coords, { icon: icon })
                      .bindPopup(popupText)
                      .addTo(map);
                    busMarkers[bus.id] = m;
                  }
                });
              }
            }
            else if (data.type === 'UPDATE_MY_LOCATION') {
              var latlng = [data.lat, data.lng];
              var icon = getMyIcon();
              
              if (!currentMarker) {
                currentMarker = L.marker(latlng, { icon: icon }).addTo(map);
                var label = (data.code || 'My Bus') + ' (Live)';
                currentMarker.bindPopup('<div class="bus-marker-popup"><b>' + label + '</b></div>');
              } else {
                currentMarker.setLatLng(latlng).setIcon(icon);
              }
              
              if (data.pan) {
                map.panTo(latlng);
              }
            }
          } catch (e) {
            console.error('WebView map error:', e);
          }
        }

        window.addEventListener('message', handleIncomingMessage);
        document.addEventListener('message', handleIncomingMessage);

        function sendPostMessage(msg) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(msg);
          } else if (window.parent && window.parent.postMessage) {
            window.parent.postMessage(msg, '*');
          }
        }
        window.postMessageFn = sendPostMessage;
        
        sendPostMessage(JSON.stringify({ type: 'MAP_READY' }));
        var retries = 0;
        var readyInterval = setInterval(function() {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            sendPostMessage(JSON.stringify({ type: 'MAP_READY' }));
            clearInterval(readyInterval);
          }
          retries++;
          if (retries > 10) clearInterval(readyInterval);
        }, 500);
      </script>
    </body>
    </html>
  `;
}
