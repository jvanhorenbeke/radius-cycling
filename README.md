# Radius Cycling Leaderboard

## Playing around with Node.js and Strava's APIs.

Radius Cycling Leaderboard uses a Year to date ranking system based on the [Strava](http://strava.com) activities for a given club or team. It uses a similar ranking system as the Tour de France. This app was built during the 2016-12 Radius Hackathon.

### Wanna try?
1. Install [npm](https://github.com/npm/npm)
1. Install [node.js](https://nodejs.org/en/)
1. Run `npm install` to install all dependencies
1. Export your Strava Access Token as the env variable `STRAVA_KEY`
1. Export your Slack webhook URL as `SLACK_WEBHOOK_URL` to receive notifications in your `#cycling` channel
1. run `npm start`

### TO DO list features:
- Random fact/stat generator (fastest rider, who runs?, Max power, etc)
- Make app configurable.
- up and down arrows.
- How to reflect running miles? Should there be a triathlon version? What would we measure? Total miles, speed, etc?

### New login site:
- https://vuejs.org/v2/guide/
- oAuth
- Simple pages with 5 jersey that already have a configuration. 

### Technical debt:
- Clean up jQuery bindings, use better framework
- Import old activities in DB, hardcoded delta.
- Get title and logo from Strava club information

### How does it look?:
![alt tag](https://gitlab.com/jvanhorenbeke/radius-cycling/raw/master/screenshot.png)
