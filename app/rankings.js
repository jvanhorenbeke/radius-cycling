'use strict';

const moment = require('moment');
const series = require('run-series')
const database = require('./database');
const strava = require('./strava');
const stravaIds = require('./stravaIds');
var athletesMap = new Map();
database.init();

/******************************************************************************/
var updateStats = function(id, distance, elevation, points, time, startDate) {
    var athlete = athletesMap.get(id);
    athlete.distance += distance;
    athlete.elevation += elevation;
    athlete.points += points;
    athlete.time += time;
    athlete.polka_climbs += time === 0 ? 0 : 1;
}

var loadSegmentLeaderboard = function(segmentId, year, callback) {
    database.loadSegmentLeaderboard(segmentId, year, callback);
}

var retrieveClubMembers = function(year, callback) {
    database.loadMembers(year, function(data) {
        data.forEach(function(member, i) {
            if (!athletesMap.has(member.id)) {
                athletesMap.set(member.id, {
                    'distance' : 0,
                    'elevation' : 0,
                    'points' : 0,
                    'time' : 0,
                    'polka_climbs' : 0,
                    'profilePicture' : member.profile_medium,
                    'rider' : member.firstname + ' ' + member.lastname
                });
            }
        });
        console.log('done retrieving club members');
        callback();
    });
};

var loadClubAcitivities = function(year, callback) {
    database.loadCyclingActivities(year, function processActivities(rows) {
        rows.forEach(function(activity) {
            if (activity.type == 'Ride' && activity.commute == false) {
                updateStats(activity.athlete.id, activity.distance,
                    activity.total_elevation_gain, activity.points,
                    0, activity.start_date);
            }
        });
        callback();
    });
};

var retrieveGeneralLeaderboard = function(year, callback) {
    athletesMap = new Map();
    series([
        function(callback) {
            retrieveClubMembers(year, callback);
        },
        function(callback) {
            loadClubAcitivities(year, callback);
        }
        // ,
        // function(callback) {
        //     retrievePolkaTimes(callback);
        // }
    ], function (err, results) {
        if (err !== undefined) {
            console.log('Something went wrong: ' + err);
            return;
        }

        if (year == 2016) loadFixedValues();
        var gcStandings = [...athletesMap.values()];
        gcStandings.sort(function (a, b) {
            var dPoints = b.points - a.points;
            if(dPoints) return dPoints;

            var dDistance = b.distance - a.distance;
            if(dDistance) return dDistance;

            return 0;
        });

        if (callback !== undefined) callback(gcStandings);
    });
}

var retrievePolkaTimes = function(callback) {
    var handleSegmentResults = function(data) {
        data.entries.forEach(function(athlete){
            updateStats(athlete.athlete_id, 0, 0, 0, athlete.elapsed_time, athlete.start_date);
        });
    }

    var handleSegmentResultsWcb = function(data) {
        data.entries.forEach(function(athlete){
            updateStats(athlete.athlete_id, 0, 0, 0, athlete.elapsed_time, athlete.start_date);
        });
        callback();
    }
    strava.retrieveSegment(stravaIds.HAWK_HILL_SEGMENT_ID, handleSegmentResults);
    strava.retrieveSegment(stravaIds.CAMINO_ALTO_SEGMENT_ID, handleSegmentResults);
    strava.retrieveSegment(stravaIds.PANTOLL_SEGMENT_ID, handleSegmentResults);
    strava.retrieveSegment(stravaIds.FOUR_CORNERS_SEGMENT_ID, handleSegmentResultsWcb);
}
/*******************************************************************************
 Cache Strava Activities and Members:
*******************************************************************************/
//Because of Strava API's limitation we need to hardcode the distances of older activities
var feetToMeters = function(feet) {
    return Math.round(feet/3.28084);
}

var milesToMeters = function(miles) {
    return Math.round(miles/0.62137*1000);
}

var loadFixedValues = function() {
    updateStats(3014007, milesToMeters(1694.8), feetToMeters(121244), milesToMeters(1694.8), 0, '2016-12-02T14:28:21Z');//Philip
    updateStats(9022454, milesToMeters(401), feetToMeters(29324), milesToMeters(401), 0, '2016-12-02T14:28:21Z');//Jelle
    updateStats(1911372, milesToMeters(594), feetToMeters(40896), milesToMeters(594), 0, '2016-12-02T14:28:21Z');//Preston
    updateStats(9757503, milesToMeters(478), feetToMeters(28967), milesToMeters(478), 0, '2016-12-02T14:28:21Z');//Evan
    updateStats(74954, milesToMeters(617), feetToMeters(31952), milesToMeters(617), 0, '2016-12-02T14:28:21Z');//Pablo
    updateStats(1211014, milesToMeters(1739), feetToMeters(113989), milesToMeters(1739), 0, '2016-12-02T14:28:21Z');//Tyler W
    updateStats(14531982, milesToMeters(219.8), feetToMeters(11687), milesToMeters(219.8), 0, '2016-12-02T14:28:21Z');//Antoine
    updateStats(1896314, milesToMeters(143.3), feetToMeters(8750), milesToMeters(143.3), 0, '2016-12-02T14:28:21Z');//Tyler P.
    updateStats(13205409, milesToMeters(19), feetToMeters(2195), milesToMeters(19), 0, '2016-12-02T14:28:21Z');//Yoshio
    updateStats(4190437, milesToMeters(656.2), feetToMeters(25069), milesToMeters(656.2), 0, '2016-12-02T14:28:21Z');//Dan
    updateStats(13718617, milesToMeters(223.8), feetToMeters(9797), milesToMeters(223.8), 0, '2016-12-02T14:28:21Z');//Isaac
    updateStats(2339027, milesToMeters(102.8), feetToMeters(8543), milesToMeters(102.8), 0, '2016-12-02T14:28:21Z');//Nick
    updateStats(11759106, milesToMeters(324.6), feetToMeters(10794), milesToMeters(324.6), 0, '2016-12-02T14:28:21Z');//Austin
    updateStats(2943525, milesToMeters(114.8), feetToMeters(8711), milesToMeters(114.8), 0, '2016-12-02T14:28:21Z');//Brian G
    updateStats(4601035, milesToMeters(671.2), feetToMeters(20725), milesToMeters(671.2), 0, '2016-12-02T14:28:21Z');//Steven C.
}

/******************************************************************************/
module.exports = {
    retrieveRadiusLeaderboard: function(year, cb){loadSegmentLeaderboard(stravaIds.HAWK_HILL_SEGMENT_ID, year, cb)},
    retrieveSprinterLeaderboard: function(year, cb){loadSegmentLeaderboard(stravaIds.POLO_FIELD_SEGMENT_ID, year, cb)},
    retrieveCurrentGeneralLeaderboard: function(cb){retrieveGeneralLeaderboard(moment().utc().year(), cb)},
    retrieveGeneralLeaderboard: function(year, cb){retrieveGeneralLeaderboard(year, cb)}
};
