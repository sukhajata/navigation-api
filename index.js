var express = require('express')
var cors = require('cors')
var app = express()
var bodyParser = require('body-parser')

const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_MAPS_API_KEY,
    Promise: Promise
  });

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.set('view engine', 'ejs')
 
app.get('/', function(req, res) {
    res.render('test')
})

app.post('/directions', async (req, res) => {
    const results = await getDirections(res, req.body.origin, req.body.destination);
    res.render('directions', results);
})

app.post('/waypoint', async (req, res) => {
    const resultsNoWaypoint = await getDirections(res, req.body.origin, req.body.destination);
    const resultsWithWaypoint = await getDirections(res, req.body.origin, req.body.destination, [req.body.waypoint]);
    resultsWithWaypoint.distanceAdded = (parseInt(resultsWithWaypoint.totalDistance) - parseInt(resultsNoWaypoint.totalDistance)) / 1000;
    //console.log(resultsWithWaypoint);
    res.render('directions', resultsWithWaypoint);
   
})

app.post('/proximity', async (req, res) => {
    const results = await getDirections(res, req.body.origin, req.body.destination);
    res.render('proximity', results);
})

async function getDirections(res, origin, destination, waypoints=[]) {
    try {
        
        const response = await googleMapsClient.directions({ 
            origin, 
            destination, 
            waypoints,
            departure_time: new Date(),
            traffic_model: 'best_guess',
            mode: 'driving'
        })
        .asPromise();

        console.log(response);
        var totalDistance = 0;
        var totalDuration = 0;
        if (response.json.routes.length > 0) {
            var legs = response.json.routes[0].legs; 
            for(var i=0; i<legs.length; ++i) {
                totalDistance += legs[i].distance.value;
                totalDuration += legs[i].duration.value;
            }
            return { origin, destination, waypoints, legs, totalDistance, totalDuration };
        } else {
            return { origin, destination, waypoints, "message": "No route found" };
        }
    } catch (err) {
        console.log(err);
        return { 'error': err };
    }
}
app.listen(process.env.PORT || 3000, function(){
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
