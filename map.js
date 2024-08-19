var map = L.map('map', {
    center: [51.104, -114.236], // Center the map on Valley Ridge, Calgary
    zoom: 17,
    maxZoom: 22
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 22,
    attribution: '© OpenStreetMap'
}).addTo(map);

function addSatelliteLayer() {
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 22
    }).addTo(map);
}
addSatelliteLayer();

// Variable to hold the current geocode polygon
var currentGeocodePolygon = null;

// Adding the geocoder to the map
var geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Search for an address", // Placeholder text in the search box
    errorMessage: "Nothing found." // Error message when no results are found
}).on('markgeocode', function(e) {
    if (currentGeocodePolygon) {
        map.removeLayer(currentGeocodePolygon); // Remove the previous polygon
    }

    var bbox = e.geocode.bbox;
    currentGeocodePolygon = L.polygon([
        bbox.getSouthEast(),
        bbox.getNorthEast(),
        bbox.getNorthWest(),
        bbox.getSouthWest()
    ]).addTo(map);
    map.fitBounds(currentGeocodePolygon.getBounds());
}).addTo(map);

// Remove the polygon when the map is zoomed or moved
map.on('zoomend moveend', function() {
    if (currentGeocodePolygon) {
        map.removeLayer(currentGeocodePolygon);
        currentGeocodePolygon = null;
    }
});

var polygonPoints = [];
var polygon;
var seedCoverage = 100; // Default seed coverage
var markers = [];

map.on('click', function(e) {
    polygonPoints.push([e.latlng.lat, e.latlng.lng]);
    var marker = L.circleMarker([e.latlng.lat, e.latlng.lng], {radius: 2, color: 'red'}).addTo(map);
    markers.push(marker);
});

function drawPolygon() {
    if (polygon) {
        map.removeLayer(polygon);
    }
    polygon = L.polygon(polygonPoints, {color: 'blue'}).addTo(map);
}

function erasePolygon() {
    if (polygon) {
        map.removeLayer(polygon);
        polygon = null;
    }
    for (var i = 0; i < markers.length; i++) {
        map.removeLayer(markers[i]);
    }
    markers = [];
    polygonPoints = [];
    document.getElementById('calculationOutput').innerHTML = "";
}

function updateSeedCoverage() {
    var coverageInput = document.getElementById('seedCoverage').value;
    seedCoverage = parseInt(coverageInput) || 100; // Default to 100 if input is invalid
    alert('Seed coverage updated to ' + seedCoverage + ' sqm per bag.');
}

// Called when "Calculate Needs" button is clicked
function calculateMetrics() {
    if (polygon) {
        var latlngs = polygon.getLatLngs()[0];
        var area = geodesicArea(latlngs);
        var perimeter = geodesicPerimeter(latlngs);
        var bagsNeeded = Math.ceil(area / seedCoverage);
        document.getElementById('calculationOutput').innerHTML = `Area: ${area.toFixed(2)} sqm <br> Perimeter: ${perimeter.toFixed(2)} meters <br> Bags of seed needed: ${bagsNeeded}`;
    }
}

// Add calculation button functionality
function calculateNeeds() {
    calculateMetrics();
}

function geodesicArea(latlngs) {
    var R = 6371000; // Radius of Earth in meters (average radius)
    var area = 0;
    var len = latlngs.length;

    if (len > 2) {
        for (var i = 0; i < len; i++) {
            var p1 = latlngs[i];
            var p2 = latlngs[(i + 1) % len];
            area += radians(p2.lng - p1.lng) * (2 + Math.sin(radians(p1.lat)) + Math.sin(radians(p2.lat)));
        }
        area = Math.abs(area * R * R / 2.0);
    }

    return area; // Return area in square meters
}

// Compute the geodesic perimeter of the polygon
function geodesicPerimeter(latlngs) {
    var R = 6371000; // meters
    var total = 0;
    for (var i = 0, l = latlngs.length; i < l; i++) {
        var thisPoint = latlngs[i],
            nextPoint = latlngs[(i + 1) % l];
        total += distanceOnEarth(thisPoint.lat, thisPoint.lng, nextPoint.lat, nextPoint.lng);
    }
    return total; // Perimeter in meters
}

// Calculate distance between two points on Earth's surface
function distanceOnEarth(lat1, lng1, lat2, lng2) {
    var dLat = radians(lat2 - lat1);
    var dLng = radians(lat2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(radians(lat1)) * Math.cos(radians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c; // Earth's radius in meters
}

// Helper function to convert degrees to radians
function radians(degrees) {
    return degrees * Math.PI / 180;
}
