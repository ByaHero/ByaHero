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

        function getBusIcon(status) {
          var s = String(status || '').toLowerCase();
          var color = statusColors[s] || '#999';
          return L.divIcon({
            html: '<div style="background:' + color + ';width:18px;height:18px;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
            className: 'bus-marker-dot',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
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
                    var popupText = '<div class="bus-marker-popup"><b>' + bus.code + '</b><br/>' + bus.locName + '</div>';
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
              var icon = getBusIcon(data.status || 'available');
              
              if (!currentMarker) {
                currentMarker = L.marker(latlng, { icon: icon }).addTo(map);
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

        // Notify React Native or Web parent that map is ready
        var postMessageFn = null;
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          postMessageFn = function(msg) { window.ReactNativeWebView.postMessage(msg); };
        } else if (window.parent && window.parent !== window) {
          postMessageFn = function(msg) { window.parent.postMessage(msg, '*'); };
        }
        
        if (postMessageFn) {
          postMessageFn(JSON.stringify({ type: 'MAP_READY' }));
        }
      </script>
    </body>
    </html>
  `;
}
