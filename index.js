var express = require('express')
var cors = require('cors')
var app = express()
var bodyParser = require('body-parser')
var keys = require('./config/keys')

const googleMapsClient = require('@google/maps').createClient({
    key: keys.googleMapsApiKey,
    Promise: Promise
  });

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.set('view engine', 'ejs')
 
app.get('/', function(req, res) {
    res.render('test')
})

app.post('/directions', async (req, res, next) => {
    const { origin, destination } = req.body;
    const results = await getDirections(next, origin, destination);
    if (results) {
        res.render('directions', results);
    }
});
   

app.post('/waypoint', async (req, res, next) => {

    const resultsNoWaypoint = await getDirections(next, req.body.origin, req.body.destination);
    const resultsWithWaypoint = await getDirections(next, req.body.origin, req.body.destination, ["via:" + req.body.waypoint]);
    if (resultsWithWaypoint && resultsNoWaypoint) {
        resultsWithWaypoint.distanceAdded = (parseInt(resultsWithWaypoint.totalDistance) - parseInt(resultsNoWaypoint.totalDistance)) / 1000;
        res.render('directions', resultsWithWaypoint);
    }
   
})

app.post('/proximity', async (req, res, next) => {
    const { origin, destination } = req.body;
    const results = await getDistance(next, origin, destination);
    if (results) {
        res.render('proximity', results);
    }
})


//distance between points
//response.json is like /examples/directionMatrix.json
async function getDistance(next, origin, destination) {
    try {
        const response = await googleMapsClient.distanceMatrix({
            origins: [origin],
            destinations: [destination],
            departure_time: new Date(),
            traffic_model: 'best_guess',
            mode: 'driving'
        })
        .asPromise();

        //console.log(response);
        if (response.json.status === 'OK') {
            const { origin_addresses, destination_addresses, rows } = response.json;
            return {
                origins: origin_addresses,
                destinations: destination_addresses,
                distance: rows[0].elements[0].distance.text,
                durationInTraffic: rows[0].elements[0].duration_in_traffic.text,
            }
        } else {
            //request failed 
            const message = response.json.error_message ? response.json.error_message : response.json.status;
            
            return next(new Error(message));
        }

    } catch(err) {
        console.log(err);
        return next(err);
    }
}

async function getDirections(next, origin, destination, waypoint = []){
    try {
        let params = {
            origin,
            destination, 
            departure_time: new Date(),
            traffic_model: 'best_guess',
            mode: 'driving'
        };
        if (waypoint.length > 0) {
            params.waypoints = [waypoint];
        }
        
        const response = await googleMapsClient.directions(params).asPromise();
        console.log(response);
        if (response.json.status !== 'OK') {
            //request failed
            const message = response.json.error_message ? response.json.error_message : response.json.status;
            return next(new Error(message));
        } else if (response.json.routes.length === 0) {
            return next(new Error("No route found"));
        } else {
            console.log(response);
            const results = parseJSONDirections(response);
            return results;
        }
    } catch (err) {
        console.log(err);
        const message = getErrorMessage(err);
        return next(new Error(message));
    }
}

function parseJSONDirections(response) {
    const { origin, destination, waypoints } = response.query;
    const { routes } = response.json;
    const legs = routes[0].legs; 
    let totalDistance = 0;
    let totalDuration = 0;
    for(var i = 0; i < legs.length; i++) {
        totalDistance += legs[i].distance.value;
        totalDuration += legs[i].duration_in_traffic.value;
    }
    const results = { 
        origin, 
        destination, 
        waypoints, 
        legs, 
        totalDistance, 
        totalDuration 
    };
    return results;
}

function getErrorMessage(err) {
    let message = '';
    if (err.json.error_message) {
        message = err.json.error_message;
    } else if (err.json.status) {
        message = err.json.status;
    } else {
        message = "Request failed";
    }
    return message;
}

app.listen(process.env.PORT || 3000, function(){
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
