// scripts.js
let map;
let trafficLayer;
let markers = [];
let routePolyline;
let directionsPanel;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 38.2466, lng: 21.7346 },
        zoom: 14,
    });

    trafficLayer = new google.maps.TrafficLayer();

    document.getElementById("traffic-b").addEventListener("click", () => {
        trafficLayer.setMap(trafficLayer.getMap() ? null : map);
    });

    map.addListener("click", function (event) {
        if (markers.length >= 2) {
            markers.forEach((m) => m.setMap(null));
            markers = [];
        }

        const marker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            animation: google.maps.Animation.DROP,
            icon: {
                url: "https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png",
                scaledSize: new google.maps.Size(27, 43),
            },
        });

        markers.push(marker);
    });

    directionsPanel = document.getElementById("directions-panel");
}


function calculateRoute() {
    if (markers.length < 2) {
        alert("❌ Επιλέξτε δύο σημεία στον χάρτη!");
        return;
    }

    const origin = markers[0].getPosition();
    const destination = markers[1].getPosition();
    const travelMode = document.getElementById("travel-mode").value;

    const requestBody = {
        origin: {
            location: {
                latLng: {
                    latitude: origin.lat(),
                    longitude: origin.lng(),
                },
            },
        },
        destination: {
            location: {
                latLng: {
                    latitude: destination.lat(),
                    longitude: destination.lng(),
                },
            },
        },
        travelMode: travelMode,
        routingPreference:
            travelMode === "DRIVE"
                ? "TRAFFIC_AWARE_OPTIMAL"
                : "ROUTING_PREFERENCE_UNSPECIFIED",
        computeAlternativeRoutes: false,
    };

    fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=AIzaSyAUJt1EB3nSL3D9FUXk5S0eeSTdSZPrMvY`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-FieldMask":
                    "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps",
            },
            body: JSON.stringify(requestBody),
        }
    )
        .then((response) => response.json())
        .then((data) => {
            if (!data.routes || data.routes.length === 0) {
                alert("❌ Δεν βρέθηκε διαδρομή!");
                return;
            }

            const route = data.routes[0];
            const decodedPath = google.maps.geometry.encoding.decodePath(
                route.polyline.encodedPolyline
            );

            if (routePolyline) {
                routePolyline.setMap(null);
            }

            routePolyline = new google.maps.Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: "#1e90ff",
                strokeOpacity: 0.9,
                strokeWeight: 5,
            });

            routePolyline.setMap(map);

            const durationMin = Math.ceil(route.duration.split("s")[0] / 60);
            const distanceKm = (route.distanceMeters / 1000).toFixed(2);

            displayDirections(route.legs[0].steps, durationMin, distanceKm);

            displayWeather(destination.lat(), destination.lng());
        })
        .catch((error) => {
            console.error("❌ Σφάλμα:", error);
            alert(`❌ Σφάλμα: ${error.message}`);
        });
}

// Toggle Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// Display Directions (με modal popup)
function displayDirections(steps, durationMin, distanceKm) {
    const directionsPanel = document.getElementById("directions-panel");
    directionsPanel.innerHTML = '';

    const content = document.createElement("div");
    content.innerHTML = `<h3>📍 Οδηγίες Διαδρομής</h3>
        <p><strong>Απόσταση:</strong> ${distanceKm} km</p>
        <p><strong>Χρόνος:</strong> ~${durationMin} λεπτά</p><hr>`;

    steps.forEach((step, index) => {
        const div = document.createElement("div");
        div.className = "direction-step";

        div.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <div class="instruction"><i class="fa-solid fa-turn-down"></i> ${step.navigationInstruction.instructions}</div>
        `;

        content.appendChild(div);
    });

    if (steps.length > 0) {
        const modalOverlay = document.createElement("div");
        modalOverlay.id = "modal-overlay";
        modalOverlay.innerHTML = `
            <div id="modal-content">
                <span id="close-modal">&times;</span>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        document.getElementById("modal-content").appendChild(content);

        document.getElementById("close-modal").onclick = function() {
            document.body.removeChild(modalOverlay);
        };
    } else {
        directionsPanel.appendChild(content);
    }
}

function displayWeather(lat, lon) {
    const apiKey = "5d5f7548e8cdd14df5be5cac4d613e0d";
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=el&appid=${apiKey}`)
        .then(res => res.json())
        .then(data => {
            const weatherPanel = document.getElementById("weather-panel");
            weatherPanel.innerHTML = `
                <h3>🌤 Καιρός στον προορισμό σας</h3>
                <p>📍 <strong>${data.name}</strong></p>
                <p>🌡️ Θερμοκρασία: <strong>${data.main.temp}°C</strong></p>
                <p>☁️ Συνθήκες: <strong>${data.weather[0].description}</strong></p>
                <p>💧 Υγρασία: <strong>${data.main.humidity}%</strong></p>
            `;
        });
}
