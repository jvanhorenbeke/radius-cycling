'use strict';

const moment = require('moment');
const series = require('run-series')
const database = require('./database');
const strava = require('./strava');
const stravaIds = require('./stravaIds');
const jerseyIds = require('./jerseyIds');
const notification = require('./notifications');
var athletesMap = new Map();
database.init();

/******************************************************************************/
var updateStats = function(id, distance, elevation, points, time, startDate) {
    if (!athletesMap.has(id)){return;}

    var athlete = athletesMap.get(id);
    athlete.distance += distance;
    athlete.elevation += elevation;
    athlete.points += points;
    athlete.time += time;
    athlete.polka_climbs += time === 0 ? 0 : 1;
}

var updateLeader = function(jerseyId, athlete, clubId) {
    var athleteName = athlete.athlete_name ? athlete.athlete_name : athlete.rider;
    var athleteId = athlete.athlete_id;

    database.loadLeader(jerseyId, clubId, function(previousLeader) {
        if (previousLeader && previousLeader.athleteName == athleteName) {
            return;
        }

        database.addLeader(Date.now(), athleteId, athleteName, jerseyId, clubId);

        if (previousLeader && previousLeader.athlete_name != athleteName) {
            var previousLeaderName = previousLeader.athlete_name;
            notification.sendNotification(jerseyId, previousLeaderName, athleteName);
        }
    });
}

var updateAllLeaders = function() {
    //Update general classification
    retrieveGeneralLeaderboard(getCurrentYear(), function(gcStandings) {
        updateLeader(jerseyIds.YELLOW_JERSEY, gcStandings[0]);
    });

    //Update climber jersey
    retrieveGeneralLeaderboard(getCurrentYear(), function(gcStandings) {
        retrievePolkaLeaderboard(getCurrentYear(), gcStandings, function(polkaStandings){
            updateLeader(jerseyIds.POLKA_JERSEY, polkaStandings[0]);
        });
    });

    //Update Sprinter jersey
    loadSegmentLeaderboard(stravaIds.POLO_FIELD_SEGMENT_ID, getCurrentYear(), function(json) {
        if (json.entries.length > 1) {
            updateLeader(jerseyIds.GREEN_JERSEY, json.entries[0]);
        }
    });

    //Update Radius jersey
    loadSegmentLeaderboard(stravaIds.HAWK_HILL_SEGMENT_ID, getCurrentYear(), function(json) {
        if (json.entries.length > 1) {
            updateLeader(jerseyIds.RADIUS_JERSEY, json.entries[0]);
        }
    });
}

var loadSegmentLeaderboard = function(segmentId, year, clubId, callback) {
    database.loadSegmentLeaderboard(segmentId, year, clubId, callback);
}

var retrieveClubMembers = function(year, clubId, callback) {
    database.loadMembers(year, clubId, function(data) {
        data.forEach(function(member, i) {
            if (!athletesMap.has(member.id)) {
                athletesMap.set(member.id, {
                    'athlete_id' : member.id,
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
        callback();
    });
};

var loadClubAcitivities = function(year, clubId, callback) {
    database.loadCyclingActivities(year, clubId, function processActivities(rows) {
        rows.forEach(function(activity) {
            if ((activity.type == 'Ride' || activity.type == 'VirtualRide') && activity.commute == false) {
                updateStats(activity.athlete.id, activity.distance,
                    activity.total_elevation_gain, activity.points,
                    0, activity.start_date);
            }
        });
        callback();
    });
};

var retrievePolkaLeaderboard = function(year, standings, callback) {
    var minClimbs = 1;
    standings.sort(function (a, b) {
      if (a.polka_climbs < minClimbs) {
          if (b.polka_climbs < minClimbs) {
              var dElev = b.elevation - a.elevation;
              if(dElev) return dElev;
          }
          return 1;
      }

      if (b.polka_climbs < minClimbs) {
          return -1;
      }

      // Sort by time
      var dTime = a.time - b.time;
      if(dTime) return dTime;

      var dElevation = b.elevation - a.elevation;
      if(dElevation) return dElevation;

      return 0;
    });

    if (callback !== undefined) callback(standings);
}

var retrieveGeneralLeaderboard = function(year, clubId, callback) {
    athletesMap = new Map();
    series([
        function(callback) {
            retrieveClubMembers(year, clubId, callback);
        },
        function(callback) {
            loadClubAcitivities(year, clubId, callback);
        },
        function(callback) {
            retrievePolkaTimes(stravaIds.STINSON_PANTOLL_ID, year, clubId, callback);
        }
        //,
        // function(callback) {
        //     retrievePolkaTimes(stravaIds.CAMINO_ALTO_SEGMENT_ID, year, callback);
        // },
        // function(callback) {
        //     retrievePolkaTimes(stravaIds.MT_TAM_SEGMENT_ID, year, callback);
        // },
        // function(callback) {
        //     retrievePolkaTimes(stravaIds.FOUR_CORNERS_SEGMENT_ID, year, callback);
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

var retrievePolkaTimes = function(segmentId, year, clubId, callback) {
    loadSegmentLeaderboard(segmentId, year, clubId, function handleSegmentResults(data) {
        //don't process if undefined or empty
        if (!data || data.entries.length < 1) {
            return callback();
        }

        data.entries.forEach(function(athlete) {
            updateStats(athlete.athlete_id, 0, 0, 0, athlete.elapsed_time, athlete.start_date);
        });
        callback();
    });
}
/*******************************************************************************
 Cache Strava Activities and Members:
*******************************************************************************/
var feetToMeters = function(feet) {
    return Math.round(feet/3.28084);
}

var milesToMeters = function(miles) {
    return Math.round(miles/0.62137*1000);
}

var isYearCurrent = function(year) {
    return moment().utc().year() == year;
}

var getCurrentYear = function() {
    return moment().utc().year();
}

//Because of Strava API's limitation we need to hardcode the distances of older activities
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
    retrieveRadiusLeaderboard: function(year, clubId, cb) {
        loadSegmentLeaderboard(stravaIds.HAWK_HILL_SEGMENT_ID, year, clubId, function(json) {
            cb(json);
        })
    },
    retrieveSprinterLeaderboard: function(year, clubId, cb) {
        loadSegmentLeaderboard(stravaIds.POLO_FIELD_SEGMENT_ID, year, clubId, function(json) {
            cb(json);
        })
    },
    retrievePolkaLeaderboard: function(year, clubId, cb) {
        loadSegmentLeaderboard(stravaIds.STINSON_PANTOLL_ID, year, clubId, function(json) {
            cb(json);
        })
    },
    retrieveCurrentGeneralLeaderboard: function(clubId, cb) {
        retrieveGeneralLeaderboard(moment().utc().year(), clubId, cb);
    },
    retrieveGeneralLeaderboard: function(year, clubId, cb){
        retrieveGeneralLeaderboard(year, clubId, cb);
    },
    updateAllLeaders: function() {
        updateAllLeaders();
    }
};
