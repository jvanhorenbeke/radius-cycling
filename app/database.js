"use strict";

const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
const fs = require("fs");
const file = "data.db";
var db;

function createDb() {
    db = new sqlite3.Database(file);
}

//ALTER TABLE leaderboards ADD COLUMN clubId INTEGER default 197635
function createTables() {
    db.run("CREATE TABLE activities(startDate INTEGER NOT NULL, stravaActivityId INTEGER UNIQUE, stravaAthleteId INTEGER, type TEXT, json TEXT NOT NULL, clubId INTEGER)");
    db.run("CREATE TABLE leaderboards(segmentId INTEGER NOT NULL, year INTEGER, json TEXT NOT NULL, clubId INTEGER)");
    db.run("CREATE TABLE members(year INTEGER, json TEXT NOT NULL, clubId INTEGER)");
    db.run("CREATE TABLE leaders(startDate INTEGER NOT NULL, stravaAthleteId INTEGER NOT NULL, athleteName TEXT NOT NULL, jerseyName TEXT NOT NULL, clubId INTEGER)");
}

function insertRows(startDate, activityId, clubId, athleteId, type, shared, json, relatedActivities) {
    var stmt = db.prepare("INSERT OR REPLACE INTO activities VALUES (?,?,?,?,?,?,?,?)");
    stmt.run(startDate, activityId, athleteId, type, json, clubId, shared, relatedActivities);
    stmt.finalize();
}

function insertMembers(year, clubId, json) {
    var stmt = db.prepare("INSERT OR REPLACE INTO members VALUES (?,?,?)");
    stmt.run(year, json, clubId);
    stmt.finalize();
}

function insertLeaderboard(segmentId, year, clubId, json) {
    var stmt = db.prepare("INSERT OR REPLACE INTO leaderboards VALUES (?,?,?,?)");
    stmt.run(segmentId, year, json, clubId);
    stmt.finalize();
}

function insertLeader(date, stravaAthleteId, athleteName, jerseyName, clubId) {
    var stmt = db.prepare("INSERT OR REPLACE INTO leaders VALUES (?,?,?,?,?)");
    stmt.run(date, stravaAthleteId, athleteName, jerseyName, clubId);
    stmt.finalize();
}

function readAllRows(table, callback) {
    db.all("SELECT rowid AS id, * FROM "+table, function(err, rows) {
        callback(rows);
    });
}

function loadLeader(jersey, clubId, callback) {
    var sqlQuery = 'SELECT stravaAthleteId, athleteName FROM leaders WHERE jerseyName = ' + jersey + ' AND clubId=' + clubId + ' ORDER BY date DESC';
    db.get(sqlQuery, function(err, row) {
        callback(row);
    });
}

function loadCyclingActivities(year, clubId, callback) {
    var startEpoch = moment.utc(Number(year), "YYYY").unix();
    var endEpoch = moment.utc(Number(year)+1, "YYYY").unix();
    var sqlQuery = 'SELECT shared, json FROM activities WHERE startDate >= '
    + startEpoch + ' AND startDate < ' + endEpoch + ' AND clubId=' + clubId;
    db.all(sqlQuery, function(err, rows) {
        var modifiedRows = [];
        rows.forEach(function (row) {
            var json = JSON.parse(row.json);
            json.points = row.shared == 1 ? json.distance * 1.5 : json.distance;
            modifiedRows.push(json);
        });
        callback(modifiedRows);
    });
}

function loadMembers(year, clubId, callback) {
    var sqlQuery = 'SELECT json FROM members WHERE year = ' + year + ' AND clubId=' + clubId;
    db.all(sqlQuery, function(err, rows) {
        if (rows.length>0) {
            callback(JSON.parse(rows[0].json));
        } else {
            callback(JSON.parse('[]'));
        }
    });
}

function loadSegmentLeaderboard(segmentId, year, clubId, callback) {
    var sqlQuery = 'SELECT json FROM leaderboards WHERE segmentId=' + segmentId + ' AND year=' + year + ' AND clubId=' + clubId;
    db.all(sqlQuery, function(err, rows) {
        if (rows.length>0) {
            callback(JSON.parse(rows[0].json));
        } else {
            callback(JSON.parse('[]'));
        }
    });
}

function closeDb() {
    db.close();
}

module.exports = {
  init: function(){createDb()},
  addActivity: function(startDate, activityId, clubId, athleteId, type, shared, json, relatedActivities){insertRows(startDate, activityId, clubId, athleteId, type, shared, json, relatedActivities)},
  addLeaderboard: function(segmentId, year, clubId, json){insertLeaderboard(segmentId, year, clubId, json)},
  addMembers: function(year, clubId, json){insertMembers(year, clubId, json)},
  addLeader: function(date, stravaAthleteId, athleteName, jerseyName, clubId){insertLeader(date, stravaAthleteId, athleteName, jerseyName, clubId)},
  loadCyclingActivities: function(year, clubId, callback){loadCyclingActivities(year, clubId, callback)},
  loadMembers: function(year, clubId, callback){loadMembers(year, clubId, callback)},
  loadSegmentLeaderboard: function(segmentId, year, clubId, callback){loadSegmentLeaderboard(segmentId, year, clubId, callback)},
  loadLeader: function(jersey, clubId, callback){loadLeader(jersey, clubId, callback)},
  close: function(){closeDb()}
};
