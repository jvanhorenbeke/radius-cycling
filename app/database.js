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

function insertRows(startDate, activityId, clubId, athleteId, type, json) {
    //Adding the IGNORE action because we might process already stored activities
    var stmt = db.prepare("INSERT OR IGNORE INTO activities VALUES (?,?,?,?,?,?)");
    stmt.run(startDate, activityId, athleteId, type, json, clubId);
    stmt.finalize();
}

function insertMembers(year, json) {
    var stmt = db.prepare("INSERT OR IGNORE INTO members VALUES (?,?)");
    stmt.run(year, json);
    stmt.finalize();
}

function insertLeaderboard(segmentId, year, json) {
    var stmt = db.prepare("INSERT OR IGNORE INTO leaderboards VALUES (?,?,?)");
    stmt.run(segmentId, year, json);
    stmt.finalize();
}

function readAllRows(table, callback) {
    db.all("SELECT rowid AS id, * FROM "+table, function(err, rows) {
        callback(rows);
    });
}

function loadCurrentCyclingActivities(callback) {
    loadCyclingActivities(moment().utc().year(), callback);
}

function loadCyclingActivities(year, callback) {
    var startEpoch = moment.utc(Number(year), "YYYY").unix();
    var endEpoch = moment.utc(Number(year)+1, "YYYY").unix();
    var sqlQuery = 'SELECT json FROM activities WHERE startDate >= '
    + startEpoch + ' AND startDate < ' + endEpoch;
    db.all(sqlQuery, function(err, rows) {
        var modifiedRows = [];
        rows.forEach(function (row) {
            modifiedRows.push(JSON.parse(row.json));
        });
        callback(modifiedRows);
    });
}

function closeDb() {
    db.close();
}

module.exports = {
  init: function(){createDb()},
  addActivity: function(startDate, activityId, clubId, athleteId, type, json){insertRows(startDate, activityId, clubId, athleteId, type, json)},
  addLeaderboard: function(segmentId, year, json){insertLeaderboard(segmentId, year, json)},
  addMembers: function(year, json){insertMembers(year, json)},
  loadCurrentCyclingActivities: function(callback){loadCurrentCyclingActivities(callback)},
  loadCyclingActivities: function(year, callback){loadCyclingActivities(year, callback)},
  close: function(){closeDb()}
};
