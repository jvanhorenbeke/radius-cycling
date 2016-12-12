'use strict';

const moment = require('moment');
const bearerToken = process.env.STRAVA_KEY;
const database = require('./database');
const axios = require('axios');
axios.defaults.baseURL = 'https://www.strava.com/api/v3';
axios.defaults.headers.common['Authorization'] = bearerToken;

// Strava Specific
const clubId = '197635';
const hawkHillSegmentId = 229781;
const poloFieldSegmentId = 432873;

var retrieveClubMembers = function(callback) {
    console.log('[Strava] retrieving Club Members');
    axios.get("clubs/"+clubId+"/members?per_page=200")
        .then(function (response) {
            callback(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
};

var retrieveSegment = function(segmentId, callback) {
    console.log('[Strava] retrieving Segment: ' + segmentId);
    axios.get("/segments/"+segmentId+"/leaderboard?club_id="+clubId+"&per_page=50")
        .then(function (response) {
            callback(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
};

var cacheLatestActivities = function() {
    console.log('[Strava] Updating activities in database/cache');
    axios.get("/clubs/"+clubId+"/activities?per_page=100")
        .then(function (response) {
            processActivities(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
};

var processActivities = function(json) {
    database.init();
    json.forEach(storeActivity);
    console.log('We processed ' + json.length + ' Strava activities');
    database.close();
};

var storeActivity = function(activity) {
    var startDate = moment.utc(activity.start_date, "YYYY-MM-DDThh:mm:ssZ");
    database.addActivity(startDate.unix(), activity.id, activity.athlete.id, activity.type, JSON.stringify(activity));
};

module.exports = {
  cacheLatestActivities: function(){cacheLatestActivities()},
  retrieveClubMembers: function(cb){retrieveClubMembers(cb)},
  retrieveRadiusLeaderboard: function(cb){retrieveSegment(hawkHillSegmentId, cb)},
  retrieveSprinterLeaderboard: function(cb){retrieveSegment(poloFieldSegmentId, cb)}
};
