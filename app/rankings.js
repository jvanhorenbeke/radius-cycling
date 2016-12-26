'use strict';

const moment = require('moment');
const series = require('run-series')
const database = require('./database');
const strava = require('./strava');
const stravaIds = require('./stravaIds');
var athletesMap = new Map();

/******************************************************************************/
var updateStats = function(id, distance, elevation, startDate) {
    var activityYear = moment(startDate, "YYYY-MM-DDTHH:mm:ssZ").year();
    if (activityYear != moment().year()) {
        return;
    }
    var athlete = athletesMap.get(id);
    athlete.distance += distance;
    athlete.elevation += elevation;
}

var retrieveClubMembers = function(callback) {
    strava.retrieveClubMembers(function(data) {
        data.forEach(function(member, i) {
            if (!athletesMap.has(member.id)) {
                athletesMap.set(member.id, {
                    'distance' : 0,
                    'elevation' : 0,
                    'points' : 0,
                    'time' : 0,
                    'profilePicture' : member.profile_medium,
                    'rider' : member.firstname + ' ' + member.lastname
                });
            }
        });
        console.log('done retrieving club members');
        callback();
    });
};

var loadClubAcitivities = function(callback) {
    database.init();
    database.loadCyclingActivitiesCurrent(function(rows) {
        database.close();
        rows.forEach(function(activity) {
            if (activity.type == 'Ride' && activity.commute == false) {
                updateStats(activity.athlete.id, activity.distance,
                    activity.total_elevation_gain, activity.start_date);
            }
        });
        callback();
    });
};

var retrieveGeneralLeaderboard = function(callback) {
    athletesMap = new Map();
    series([
        function(callback) {
            retrieveClubMembers(callback);
        },
        function(callback) {
            loadClubAcitivities(callback);
        }
    ], function (err, results) {
        if (err !== undefined) {
            console.log('Something went wrong: ' + err);
            return;
        }

        loadFixedValues();
        var gcStandings = [...athletesMap.values()];
        gcStandings.sort(function (a, b) {
            if (a.distance > b.distance) {
                return -1;
            }

            if (a.distance < b.distance) {
                return 1;
            }

            return 0;
        });

        if (callback !== undefined) callback(gcStandings);
    });
}

var retrievePolkaLeaderboard = function(callback) {
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
    updateStats(3014007, milesToMeters(1694.8), feetToMeters(121244), '2016-12-02T14:28:21Z');//Philip
    updateStats(9022454, milesToMeters(401), feetToMeters(29324), '2016-12-02T14:28:21Z');//Jelle
    updateStats(1911372, milesToMeters(594), feetToMeters(40896), '2016-12-02T14:28:21Z');//Preston
    updateStats(9757503, milesToMeters(478), feetToMeters(28967), '2016-12-02T14:28:21Z');//Evan
    updateStats(74954, milesToMeters(617), feetToMeters(31952), '2016-12-02T14:28:21Z');//Pablo
    updateStats(1211014, milesToMeters(1739), feetToMeters(113989), '2016-12-02T14:28:21Z');//Tyler W
    updateStats(14531982, milesToMeters(219.8), feetToMeters(11687), '2016-12-02T14:28:21Z');//Antoine
    updateStats(1896314, milesToMeters(143.3), feetToMeters(8750), '2016-12-02T14:28:21Z');//Tyler P.
    updateStats(13205409, milesToMeters(19), feetToMeters(2195), '2016-12-02T14:28:21Z');//Yoshio
    updateStats(4190437, milesToMeters(656.2), feetToMeters(25069), '2016-12-02T14:28:21Z');//Dan
    updateStats(13718617, milesToMeters(223.8), feetToMeters(9797), '2016-12-02T14:28:21Z');//Isaac
    updateStats(2339027, milesToMeters(102.8), feetToMeters(8543), '2016-12-02T14:28:21Z');//Nick
    updateStats(11759106, milesToMeters(324.6), feetToMeters(10794), '2016-12-02T14:28:21Z');//Austin
}

/******************************************************************************/
module.exports = {
    retrieveRadiusLeaderboard: function(cb){strava.retrieveSegment(stravaIds.HAWK_HILL_SEGMENT_ID, cb)},
    retrieveSprinterLeaderboard: function(cb){strava.retrieveSegment(stravaIds.POLO_FIELD_SEGMENT_ID, cb)},
    retrieveGeneralLeaderboard: function(cb){retrieveGeneralLeaderboard(cb)}
};
