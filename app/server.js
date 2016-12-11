'use strict';

const Hapi = require('hapi');
const database = require('./database');
const strava = require('./strava');

const server = new Hapi.Server();
server.connection({ port: 3000 });

//Every 2hrs we retrieve new activities from Strava and store it in our database
var milisInMinutes = 60*1000;
setInterval(function() {
    console.log('Cache Latest Strava Activities For Club');
    strava.cacheLatestActivities();
}, 120*milisInMinutes);

// ----------------------------- ROUTES -----------------------------
server.route({
    method: 'GET',
    path: '/activities',
    handler: function (request, reply) {
        database.init();
        database.loadCyclingActivitiesCurrent(function(rows) {
            database.close();
            reply(rows);
        });
    }
});

server.route({
    method: 'GET',
    path: '/members',
    handler: function (request, reply) {
        strava.retrieveClubMembers(function(data) {
            reply(data);
        });
    }
});

server.route({
    method: 'GET',
    path: '/radius',
    handler: function (request, reply) {
        strava.retrieveRadiusLeaderboard(function(data) {
            reply(data);
        });
    }
});

server.route({
    method: 'GET',
    path: '/sprinters',
    handler: function (request, reply) {
        strava.retrieveSprinterLeaderboard(function(data) {
            reply(data);
        });
    }
});

server.register(require('inert'), (err) => {

    if (err) {
        throw err;
    }

    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory :{
                path : './public',
                index: false
            }
        }
    })

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {
            reply.file('./public/index.html');
        }
    });
});

server.start((err) => {
    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});
