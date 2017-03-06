'use strict';

const moment = require('moment');
const series = require('run-series')
const bearerToken = process.env.STRAVA_KEY;
const database = require('./database');
const stravaIds = require('./stravaIds');
const axios = require('axios');
axios.defaults.baseURL = 'https://www.strava.com/api/v3';
axios.defaults.headers.common['Authorization'] = bearerToken;
database.init();

// Strava Specific
const clubId = '197635';

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

var retrieveSegment = function(segmentId, onlyYtd, callback) {
    console.log('[Strava] retrieving Segment: ' + segmentId);
    var timeFilter = '';
    if (onlyYtd) { timeFilter = "&date_range=this_year"; }
    axios.get("/segments/"+segmentId+"/leaderboard?club_id="+clubId+"&per_page=50"+timeFilter)
        .then(function (response) {
            callback(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
};

var retrieveRelatedActivity = function(activityId, callback) {
    console.log('[Strava] retrieving Related activity: ' + activityId);
    axios.get("/activities/"+activityId+"/related")
        .then(function (response) {
            callback(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
}

/*******************************************************************************
 Cache Strava Activities and Members:
*******************************************************************************/
var athletesSet = new Set();
var cacheData = function() {
    var year = moment().utc().year();
    series([
        function(callback) {
            cacheClubMembers(callback);
        },
        function(callback) {
            cacheLatestActivities(callback);
        },
        function(callback) {
            console.log('[Strava] Updating Leaderboards in database/cache');
            cacheLeaderboard(stravaIds.HAWK_HILL_SEGMENT_ID, true, year, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.HAWK_HILL_SEGMENT_ID, false, '', callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.POLO_FIELD_SEGMENT_ID, true, year, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.POLO_FIELD_SEGMENT_ID, false, '', callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.FOUR_CORNERS_SEGMENT_ID, true, year, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.FOUR_CORNERS_SEGMENT_ID, false, '', callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.PANTOLL_SEGMENT_ID, true, year, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.PANTOLL_SEGMENT_ID, false, '', callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.CAMINO_ALTO_SEGMENT_ID, true, year, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.CAMINO_ALTO_SEGMENT_ID, false, '', callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.MT_TAM_SEGMENT_ID, true, year, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.MT_TAM_SEGMENT_ID, false, '', callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.STINSON_PANTOLL_ID, false, year, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.STINSON_PANTOLL_ID, false, '', callback);
        }
    ], function (err, results) {
        if (err !== undefined) {
            console.log('Something went wrong: ' + err);
            return;
        }
        console.log('[Strava] Done updating database/cache');
    });
}

var cacheLatestActivities = function(callback) {
    console.log('[Strava] Updating activities in database/cache');
    axios.get("/clubs/"+clubId+"/activities?per_page=150")
        .then(function (response) {
            processActivities(response.data, callback);
        })
        .catch(function (error) {
            console.log(error);
        });
};

var processActivities = function(json, callback) {
    json.forEach(function storeActivity(activity) {
        var startDate = moment.utc(activity.start_date, "YYYY-MM-DDThh:mm:ssZ");
        var shared = 0;
        if (activity.type == 'Ride' && activity.commute == false && activity.athlete_count > 1) {
            retrieveRelatedActivity(activity.id, function(relatedActivities){
                relatedActivities.forEach(function(relatedActivity) {
                    if (athletesSet.has(relatedActivity.athlete.id)) {
                        shared = 1;
                    }
                });
                database.addActivity(startDate.unix(), activity.id, clubId,
                                     activity.athlete.id, activity.type, shared,
                                     JSON.stringify(activity),
                                     JSON.stringify(relatedActivities));
            })
        } else {
            database.addActivity(startDate.unix(), activity.id, clubId,
                                 activity.athlete.id, activity.type, 0,
                                 JSON.stringify(activity), '');
        }
    });
    console.log('We processed ' + json.length + ' Strava activities');
    callback();
};

var cacheClubMembers = function(callback) {
    console.log('[Strava] Updating members in database/cache');
    retrieveClubMembers(function processMembers(json){
        database.addMembers(moment().utc().year(), JSON.stringify(json));
        json.forEach(function(member) {athletesSet.add(member.id)});
        console.log('We processed ' + json.length + ' Strava members');
        callback();
    });
}

var cacheLeaderboard = function(segmentId, onlyYtd, year, callback) {
    retrieveSegment(segmentId, onlyYtd, function processLeaderboard(json){
        database.addLeaderboard(segmentId, year, JSON.stringify(json));
        callback();
    });
}

/******************************************************************************/
module.exports = {
    cacheData: function(){cacheData()},
    retrieveClubMembers: function(cb){retrieveClubMembers(cb)},
    retrieveSegment: function(id, cb){retrieveSegment(id, true, cb)}
};
