'use strict';

const Hapi = require('hapi');
const moment = require('moment');
const strava = require('./strava');
const rankings = require('./rankings');
const server = new Hapi.Server();

// Strava Specific TEMP
const clubId = '197635';

// let heroku set the port
var herokuPort = process.env.PORT || 3000
server.connection({ port: herokuPort });

//Update Strava data after startup
strava.cacheData();

//Every 2hrs we retrieve new activities from Strava and store it in our database
var milisInMinutes = 60*1000;
setInterval(function() {
    console.log('Cache Latest Strava Activities For Club');
    strava.cacheData();
    setTimeout(function() {
        console.log('Update leaders for notifications');
        // rankings.updateAllLeaders();
    }, 10*milisInMinutes)
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
    path: '/boards/{clubId?}',
    handler: function (request, reply) {
        reply([
            {
                "id" : "yellowMaillot",
                "name" : "general",
                "jersey" : "yellow",
                "hasGap" : true
            },
            {
                "id" : "polkaMaillot",
                "name" : "polka",
                "jersey" : "polkadot",
                "hasGap" : true
            },
            {
                "id" : "greenMaillot",
                "name" : "sprinters",
                "jersey" : "green",
                "hasGap" : false
            },
            {
                "id" : "radiusMaillot",
                "name" : "radius",
                "jersey" : "blue",
                "hasGap" : true
            }
        ]);
    }
});

server.route({
    method: 'GET',
    path: '/radius/{year?}',
    handler: function (request, reply) {
        var year = request.params.year ? encodeURIComponent(request.params.year) : moment().utc().year();
        rankings.retrieveRadiusLeaderboard(year, clubId, function(data) {
            reply(data);
        });
    }
});

server.route({
    method: 'GET',
    path: '/sprinters/{year?}',
    handler: function (request, reply) {
        var year = request.params.year ? encodeURIComponent(request.params.year) : moment().utc().year();
        rankings.retrieveSprinterLeaderboard(year, clubId, function(data) {
            reply(data);
        });
    }
});

server.route({
    method: 'GET',
    path: '/polka/{year?}',
    handler: function (request, reply) {
        var year = request.params.year ? encodeURIComponent(request.params.year) : moment().utc().year();
        rankings.retrievePolkaLeaderboard(year, clubId, function(data) {
            reply(data);
        });
    }
});

server.route({
    method: 'GET',
    path: '/general/{year?}',
    handler: function (request, reply) {
        var year = request.params.year ? encodeURIComponent(request.params.year) : moment().utc().year();
        rankings.retrieveGeneralLeaderboard(year, clubId, function(data) {
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
