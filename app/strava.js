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

var retrieveClubMembers = function(clubId, callback) {
    console.log('[Strava] retrieving Club Members');
    axios.get("clubs/"+clubId+"/members?per_page=200")
        .then(function (response) {
            callback(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
};

var retrieveSegment = function(segmentId, onlyYtd, clubId, callback) {
    console.log('[Strava] retrieving Segment: ' + segmentId + ' for ClubId=' + clubId);
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

var retrieveActivity = function(activityId, callback) {
    axios.get("/activities/"+activityId)
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
var cacheData = function(clubId) {
    var year = moment().utc().year();
    series([
        function(callback) {
            athletesSet = new Set();
            cacheClubMembers(clubId, callback);
        },
        function(callback) {
            cacheLatestActivities(clubId, callback);
        },
        function(callback) {
            console.log('[Strava] Updating Leaderboards in database/cache');
            cacheLeaderboard(stravaIds.HAWK_HILL_SEGMENT_ID, true, year, clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.HAWK_HILL_SEGMENT_ID, false, '', clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.POLO_FIELD_SEGMENT_ID, true, year, clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.POLO_FIELD_SEGMENT_ID, false, '', clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.FOUR_CORNERS_SEGMENT_ID, true, year, clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.FOUR_CORNERS_SEGMENT_ID, false, '', clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.PANTOLL_SEGMENT_ID, true, year, clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.PANTOLL_SEGMENT_ID, false, '', clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.CAMINO_ALTO_SEGMENT_ID, true, year, clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.CAMINO_ALTO_SEGMENT_ID, false, '', clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.MT_TAM_SEGMENT_ID, true, year, clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.MT_TAM_SEGMENT_ID, false, '', clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.STINSON_PANTOLL_ID, true, year, clubId, callback);
        },
        function(callback) {
            cacheLeaderboard(stravaIds.STINSON_PANTOLL_ID, false, '', clubId, callback);
        }
    ], function (err, results) {
        if (err !== undefined) {
            console.log('Something went wrong: ' + err);
            return;
        }
        console.log('[Strava] Done updating database/cache for clubId=' + clubId);
    });
}

var cacheLatestActivities = function(clubId, callback) {
    console.log('[Strava] Updating activities in database/cache');
    axios.get("/clubs/"+clubId+"/activities?per_page=200")
        .then(function (response) {
            processActivities(clubId, response.data, callback);
        })
        .catch(function (error) {
            console.log(error);
        });
};

var processActivities = function(clubId, json, callback) {
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

var processSingleActivity = function(activity) {

    var clubId = 197635;

    if (activity.id >= 982921122) {
        console.log(activity.id);
        return;
    }

    var startDate = moment.utc(activity.start_date, "YYYY-MM-DDThh:mm:ssZ");
    var shared = 0;

    if (activity.athlete.id != 20965599 ||
        activity.athlete.id != 14531982 ||
        activity.athlete.id != 2943525 ||
        activity.athlete.id != 4190437 ||
        activity.athlete.id != 9757503 ||
        activity.athlete.id != 2339027 ||
        activity.athlete.id != 74954 ||
        activity.athlete.id != 3014007 ||
        activity.athlete.id != 9022454 ||
        activity.athlete.id != 1911372 ||
        activity.athlete.id != 1211014) {
        // console.log("lastActivityId="+activity.id)
        return;
    }

    console.log("+++++++++++++++++++++++++++++++++++++++++++lastActivityId="+activity.id)
    console.log(activity);
    return;

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
};

var cacheClubMembers = function(clubId, callback) {
    console.log('[Strava] Updating members in database/cache for ClubId='+clubId);
    retrieveClubMembers(clubId, function processMembers(json){
        database.addMembers(moment().utc().year(), clubId, JSON.stringify(json));
        json.forEach(function(member) {athletesSet.add(member.id)});
        console.log('We processed ' + json.length + ' Strava members for ClubId='+clubId);
        callback();
    });
}

var cacheLeaderboard = function(segmentId, onlyYtd, year, clubId, callback) {
    retrieveSegment(segmentId, onlyYtd, clubId, function processLeaderboard(json){
        database.addLeaderboard(segmentId, year, clubId, JSON.stringify(json));
        callback();
    });
}

/******************************************************************************/
module.exports = {
    cacheData: function(){
        var x = 906499301;
        var milisInMinutes = 60*1000;
        setInterval(function() {
            console.log('Retrieving old activities');
            var count = 0;
            while (x < 982921122 && count < 500) {
                retrieveActivity(x, processSingleActivity);
                x = x + 1;
                count++;
            }
            count = 0;
            console.log("value of x="+x);
        }, 15*milisInMinutes);

        // cacheData(197635);
        // setTimeout(function(){
        //     cacheData(2016);
        //     console.log('processing m2 data');
        // }, 60000);
    }
};
