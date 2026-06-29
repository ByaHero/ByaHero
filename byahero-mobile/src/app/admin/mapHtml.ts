export const getMapHtml = (baseUrl: string, existingStops: any[]) => `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet">
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #f8fafc; }
        #stopMap { width: 100%; height: 100%; }
        .leaflet-control-container { display: none; }
    </style>
</head>
<body>
    <div id="stopMap"></div>
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js"></script>
    <script>
        const BASE_URL = "${baseUrl}";
        const existingStops = ${JSON.stringify(existingStops)};
        
        const map = L.map('stopMap').setView([14.0905, 121.0550], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        const MARKER_SIZE = 42;
        const anchorX = Math.round(MARKER_SIZE / 2);
        const anchorY = MARKER_SIZE;
        const iconConfig = {
            iconSize: [MARKER_SIZE, MARKER_SIZE],
            iconAnchor: [anchorX, anchorY],
            popupAnchor: [0, -Math.round(MARKER_SIZE * 0.9)]
        };

        const pickupIcon = L.icon({ iconUrl: BASE_URL + '/assets/images/icons/busStopMarkerFinal1.svg', ...iconConfig });
        const stopIcon = L.icon({ iconUrl: BASE_URL + '/assets/images/icons/busStopMarkerFinal1.svg', ...iconConfig });

        function iconForType(type) {
            const t = String(type || '').toLowerCase();
            return (t === 'pickup_point') ? pickupIcon : stopIcon;
        }

        existingStops.forEach(s => {
            if (!s.lat || !s.lng) return;
            L.marker([parseFloat(s.lat), parseFloat(s.lng)], { icon: iconForType(s.type) })
              .addTo(map)
              .bindPopup('<b>' + s.name + '</b><br><small>' + s.type + '</small>');
        });

        let routeGeoJSON = null;
        fetch(BASE_URL + '/public/routes/laurel-talisay-tanauan.geojson')
            .then(res => res.json())
            .then(data => { routeGeoJSON = data; })
            .catch(err => console.error(err));

        let pickMarker = null;
        map.on('click', (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            if (pickMarker) map.removeLayer(pickMarker);
            pickMarker = L.marker([lat, lng], { icon: stopIcon }).addTo(map).bindPopup('Selected location').openPopup();

            let location_name = '';
            if (routeGeoJSON && typeof turf !== 'undefined') {
                const pt = turf.point([lng, lat]);
                for (const feature of routeGeoJSON.features) {
                    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                        if (turf.booleanPointInPolygon(pt, feature)) {
                            location_name = feature.properties['Current Location'] || '';
                            break;
                        }
                    }
                }
            }

            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'map_click', lat: lat.toFixed(7), lng: lng.toFixed(7), location_name
                }));
            }
        });
    </script>
</body>
</html>
`;
