"use strict";

const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
const fs = require("fs");
const file = "data.db";
var exists = fs.existsSync(file);
var db;

function createDb() {
    if(!exists) {
      console.log("Creating DB file.");
      fs.openSync(file, "w");
    }

    db = new sqlite3.Database(file, createTable);
}

function createTable() {
    if(!exists) {
        console.log("createTable Activities");
        db.run("CREATE TABLE activities(startDate INTEGER NOT NULL, stravaActivityId INTEGER UNIQUE, stravaAthleteId INTEGER, type TEXT, json TEXT NOT NULL, clubId INTEGER)");
        db.run("CREATE TABLE leaderboards(segmentId INTEGER NOT NULL, year INTEGER, json TEXT NOT NULL)");
        db.run("CREATE TABLE members(year INTEGER, json TEXT NOT NULL)");
    }
}

function insertRows(startDate, activityId, clubId, athleteId, type, json) {
    //Adding the IGNORE action because we might process already stored activities
    var stmt = db.prepare("INSERT OR IGNORE INTO activities VALUES (?,?,?,?,?,?)");
    stmt.run(startDate, activityId, athleteId, type, json, clubId);
    stmt.finalize();
}

function readAllRows(callback) {
    db.all("SELECT rowid AS id, * FROM activities", function(err, rows) {
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
  loadCurrentCyclingActivities: function(callback){loadCurrentCyclingActivities(callback)},
  loadCyclingActivities: function(year, callback){loadCyclingActivities(year, callback)},
  close: function(){closeDb()}
};
