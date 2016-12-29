# Radius Cycling Leaderboard

## Playing around with Node.js and Strava's APIs.

Radius Cycling Leaderboard uses a Year to date ranking system based on the [Strava](http://strava.com) activities for a given club or team. It uses a similar ranking system as the Tour de France. This app was built during the 2016-12 Radius Hackathon.

### Wanna try?
1. Install [npm](https://github.com/npm/npm)
1. Install [node.js](https://nodejs.org/en/)
1. Run `npm install` to install all dependencies
1. Export your Strava Access Token as the env variable `STRAVA_KEY`
1. run `npm start`

### TO DO list features:
- Include points. If rider w/ radius team miles X 1.2
- PolkaMaillot should be based on time of several climbs (HH, Four Corners, ... )
- Random fact/stat generator (fastest rider, who runs?, Max power, etc)
- Filter segments rankings by year

### Technical debt:
- Improve logging
- Clean up jQuery bindings, use better framework
- Store team members as well
- Import old activities in DB, hardcoded delta.
- Links CSS in rules HTML.
- Update ranking every 2 hours and store in db.

### How does it look?:
![alt tag](https://gitlab.com/jvanhorenbeke/radius-cycling/raw/master/screenshot.png)
