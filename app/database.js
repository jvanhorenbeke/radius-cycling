"use strict";

const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
const fs = require("fs");
const file = "data.db";
var db;

function createDb() {
    db = new sqlite3.Database(file);
}

function createTables() {
    db.run("CREATE TABLE activities(startDate INTEGER NOT NULL, stravaActivityId INTEGER UNIQUE, stravaAthleteId INTEGER, type TEXT, json TEXT NOT NULL, clubId INTEGER)");
    db.run("CREATE TABLE leaderboards(segmentId INTEGER NOT NULL, year INTEGER, json TEXT NOT NULL)");
    db.run("CREATE TABLE members(year INTEGER, json TEXT NOT NULL)");
}

function insertRows(startDate, activityId, clubId, athleteId, type, shared, json, relatedActivities) {
    //Adding the IGNORE action because we might process already stored activities
    var stmt = db.prepare("INSERT OR REPLACE INTO activities VALUES (?,?,?,?,?,?,?,?)");
    stmt.run(startDate, activityId, athleteId, type, json, clubId, shared, relatedActivities);
    stmt.finalize();
}

function insertMembers(year, json) {
    var stmt = db.prepare("INSERT OR REPLACE INTO members VALUES (?,?)");
    stmt.run(year, json);
    stmt.finalize();
}

function insertLeaderboard(segmentId, year, json) {
    var stmt = db.prepare("INSERT OR REPLACE INTO leaderboards VALUES (?,?,?)");
    stmt.run(segmentId, year, json);
    stmt.finalize();
}

function readAllRows(table, callback) {
    db.all("SELECT rowid AS id, * FROM "+table, function(err, rows) {
        callback(rows);
    });
}

function loadCyclingActivities(year, callback) {
    var startEpoch = moment.utc(Number(year), "YYYY").unix();
    var endEpoch = moment.utc(Number(year)+1, "YYYY").unix();
    var sqlQuery = 'SELECT shared, json FROM activities WHERE startDate >= '
    + startEpoch + ' AND startDate < ' + endEpoch;
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

function loadMembers(year, callback) {
    var sqlQuery = 'SELECT json FROM members WHERE year = ' + year;
    db.all(sqlQuery, function(err, rows) {
        if (rows.length>0) {
            callback(JSON.parse(rows[0].json));
        } else {
            callback(JSON.parse('[]'));
        }
    });
}

function loadSegmentLeaderboard(segmentId, year, callback) {
    var sqlQuery = 'SELECT json FROM leaderboards WHERE segmentId=' + segmentId + ' AND year=' + year;
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
  addLeaderboard: function(segmentId, year, json){insertLeaderboard(segmentId, year, json)},
  addMembers: function(year, json){insertMembers(year, json)},
  loadCyclingActivities: function(year, callback){loadCyclingActivities(year, callback)},
  loadMembers: function(year, callback){loadMembers(year, callback)},
  loadSegmentLeaderboard: function(segmentId, year, callback){loadSegmentLeaderboard(segmentId, year, callback)},
  close: function(){closeDb()}
};
