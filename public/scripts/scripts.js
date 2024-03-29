var socket = io.connect('/');
var lat,
    lon,
    map,
    laptop,
    drone,
    home,
    homePath,
    waypointPath,
    dronePath,
    startPosition,
    targetLat,
    targetLon;

var waypointMarkers = [];
var activeWaypoints = [];
var waypoints = [];
var liveDefaultPosition = {};
var follow = false;

var laptopIcon = L.icon({
    iconUrl: '../images/laptop.png'
});

var droneIcon = L.icon({
    iconUrl: '../images/drone.gif'
});

new NodecopterStream(document.getElementById("droneStream"));

navigator.geolocation.getCurrentPosition(initMap, defaultMap, { enableHighAccuracy: true });

function initMap(position) {
    lat = position.coords.latitude;
    lon = position.coords.longitude;

    map = L.map('map').setView([lat, lon], 20);

    var googleLayer = new L.Google('SATELLITE');
    map.addLayer(googleLayer);

    laptop = L.marker([lat, lon], { icon: laptopIcon }).addTo(map)

    map.on('click', function (e) {
        waypointMarkers.push(L.marker(e.latlng).addTo(map))
        waypoints.push([e.latlng.lat, e.latlng.lng])
        if (waypointPath == undefined) {
            waypointPath = L.polyline(waypoints, { color: 'blue' }).addTo(map);
        } else {
            waypointPath.setLatLngs(waypoints)
        }
    });
}

function defaultMap(err) {
    console.log("Initial map failed" + err)
    initMap({ coords: { latitude: liveDefaultPosition.LAT_P, longitude: liveDefaultPosition.LON_P } })
}

function clearWaypoints() {
    waypoints = []
    map.removeLayer(waypointPath)
    waypointPath = undefined
    $.each(waypointMarkers, function (i, m) { map.removeLayer(m) })
}

function setCurrentTarget(lat, lon) {
    targetLat = lat
    targetLon = lon
    socket.emit('go', { lat: targetLat, lon: targetLon })
}

function clearCurrentTarget() {
    targetLat = undefined
    targetLon = undefined
    socket.emit('stop')
}

$(function () {
    $('#takeoff').click(function () {
        follow = false
        socket.emit('takeoff')
        if (drone != null) {
            startPosition = [drone._latlng.lat, drone._latlng.lng]
        }
    })
    $('#land').click(function () {
        follow = false
        socket.emit('land')
        startPosition = []
    })
    $('#reset').click(function () {
        socket.emit('reset')
    })
    $('#stop').click(function () {
        follow = false
        clearCurrentTarget()
    })
    $('#clear').click(function () {
        follow = false
        clearWaypoints()
    })
    $('#home').click(function () {
        follow = false
        activeWaypoints = [startPosition[0], startPosition[1]]
        setCurrentTarget(startPosition[0], startPosition[1])
    })
    $('#go').click(function () {
        follow = false
        if (waypoints.length > 0) {
            activeWaypoints = waypoints.slice(0);
            // Go to next waypoint
            setCurrentTarget(activeWaypoints[0][0], activeWaypoints[0][1])
        }
    })
    $('#follow').click(function () {
        follow = true
    })
    $('#manual').click(function () {
        follow = false
        clearCurrentTarget()
        document.addEventListener('keydown', function (event) {
            socket.emit('manualControl', event.key)
        })
    })
    $('#twitter').click(function () {
        socket.emit('twitter')
    })
    $('#thesis').click(function () {
        socket.emit('thesis')
    })
    $('#parameters').click(function () {
        var params = {
            shouldRotate: document.getElementById("calibrate").checked,
            shouldCalibrate: document.getElementById("rotate").checked,
            altitude: document.getElementById("altitude").value
        };
        socket.emit('missionParams', params)
    })
})

socket.on('connect', function () {
    socket.on('waypointReached', function (data) {
        activeWaypoints.shift()
        if (activeWaypoints.length > 0) {
            // Go to next waypoint
            setCurrentTarget(activeWaypoints[0][0], activeWaypoints[0][1])
        } else {
            activeWaypoints = [startPosition[0], startPosition[1]]
            setCurrentTarget(startPosition[0], startPosition[1])
        }
    })
    socket.on('drone', function (data) {
        if (data.lat != undefined) {
            liveDefaultPosition.LAT_P = data.lat;
            liveDefaultPosition.LON_P = data.lon;
            if (drone == null) {
                drone = L.marker([data.lat, data.lon], { icon: droneIcon }).addTo(map)
            } else {
                drone.setLatLng([data.lat, data.lon])
            }
            $('#drone-position .battery').text(data.battery)
            $('#drone-position .lat').text(data.lat)
            $('#drone-position .lon').text(data.lon)
            $('#drone-position .distance').text(data.distance)
        }
    })

    socket.on('home', function (data) {
        if (data.lat != undefined) {
            if (laptop == null) {
                initMap(data.lat, data.lon)
            }
            if (follow) {
                setCurrentTarget(data.lat, data.lon)
            }
            $('#home-position .lat').text(data.lat)
            $('#home-position .lon').text(data.lon)
            $('#home-position .accuracy').text(data.accuracy)
        }
    })
})