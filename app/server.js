'use strict';

const Hapi = require('hapi');
const database = require('./database');
const strava = require('./strava');
const rankings = require('./rankings');
const server = new Hapi.Server();

// let heroku set the port
var herokuPort = process.env.PORT || 3000
server.connection({ port: herokuPort });

//Every 2hrs we retrieve new activities from Strava and store it in our database
var milisInMinutes = 60*1000;
setInterval(function() {
    console.log('Cache Latest Strava Activities For Club');
    strava.cacheData();
}, 120*milisInMinutes);

// ----------------------------- ROUTES -----------------------------
server.route({
    method: 'GET',
    path: '/update-cache',
    handler: function (request, reply) {
        console.log('Triggered... Updating Cache with latest Strava data for Club');
        strava.cacheData();
        reply('Updating cache');
    }
});

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
        rankings.retrieveRadiusLeaderboard(function(data) {
            reply(data);
        });
    }
});

server.route({
    method: 'GET',
    path: '/sprinters',
    handler: function (request, reply) {
        rankings.retrieveSprinterLeaderboard(function(data) {
            reply(data);
        });
    }
});

server.route({
    method: 'GET',
    path: '/general',
    handler: function (request, reply) {
        rankings.retrieveCurrentGeneralLeaderboard(function(data) {
            reply(data);
        });
    }
});

server.route({
    method: 'GET',
    path: '/general/{year}',
    handler: function (request, reply) {
        var year = encodeURIComponent(request.params.year);
        rankings.retrieveGeneralLeaderboard(year, function(data) {
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
        path: '/database/' + process.env.DB_KEY,
        handler: {
            file: {
                path: 'data.db',
                filename: 'data.db',
                mode: 'attachment',
                lookupCompressed: true
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {
            reply.file('./public/index.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/rules',
        handler: function (request, reply) {
            reply.file('./public/rules.html');
        }
    });
});

server.start((err) => {
    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});
