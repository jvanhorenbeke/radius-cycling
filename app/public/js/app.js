var serverUrl = '';
var activityUrl = 'https://www.strava.com/activities/';
var athleteUrl = 'https://www.strava.com/athletes/';

//Compose template string
String.prototype.compose = (function (){
    var re = /\{{(.+?)\}}/g;
    return function (o){
        return this.replace(re, function (_, k){
            return typeof o[k] != 'undefined' ? o[k] : '';
        });
    }
}());

//--------------- Hawk Hill Leaderboard ---------------
var loadRadiusLeaderBoard = function(params) {
  $.ajax({url: serverUrl + "/radius" + params})
   .done(function (data) {
     generateRadiusRankings(data);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve Hawk Hill leaderboard');
   });
};

//--------------- Sprinter Leaderboard ---------------
var loadSprinterLeaderBoard = function(params) {
  $.ajax({url: serverUrl + "/sprinters" + params})
   .done(function (data) {
     generateGreenMaillotRankings(data);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve Sprinter leaderboard');
   });
}

//--------------- Sprinter Leaderboard ---------------
var loadPolkaLeaderBoard = function(params) {
  $.ajax({url: serverUrl + "/polka" + params})
   .done(function (data) {
     generatePolkaRankings(data);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve Polka leaderboard');
   });
}

// --------------- Club Activities ---------------
var loadClubRankings = function() {

    var params = "";
    var year = getUrlVar('year');
    if (year != "") {
        params = "/" + year;
    }

    $.ajax({url: serverUrl + "/general" + params})
     .done(function (data) {
          //now that all our data is loaded we print the values;
          generateYellowMaillotRankings(data);
          loadSprinterLeaderBoard(params);
          loadRadiusLeaderBoard(params);
          loadPolkaLeaderBoard(params);
     })
     .fail(function (jqXHR, textStatus) {
        console.log('unable to retrieve GC ranking');
     });
}
// ------------------ Util functions ---------------------
var metersToMiles = function(meters) {
    return Math.round(meters/1000*0.62137);
}

var metersToFeet = function(meters) {
    return Math.round(meters*3.28084);
}

var speedToMiles = function(metersPerSeconds) {
    metersPerHour = metersPerSeconds * 3600;
    return metersToMiles(metersPerHour);
}

var getUrlVar = function(key) {
	var result = new RegExp(key + "=([^&]*)", "i").exec(window.location.search);
	return result && unescape(result[1]) || "";
}
// ------------------ Bind data to HTML elements ---------------------
var generateGreenMaillotRankings = function(standings) {
    var jerseyImg = '<img src="./res/Jersey_green.svg.png" class="jersey" />';
    var tbody = $('#greenMaillot').children('tbody');
    var table = tbody.length ? tbody : $('#greenMaillot');
    generateSegmentRankings(standings, false, table, jerseyImg);
}

var generateRadiusRankings = function(standings) {
    var jerseyImg = '<img src="./res/Jersey_blue.svg.png" class="jersey" />';
    var tbody = $('#radiusMaillot').children('tbody');
    var table = tbody.length ? tbody : $('#radiusMaillot');
    generateSegmentRankings(standings, true, table, jerseyImg);
}

var generatePolkaRankings = function(polkaStandings) {
    var jerseyImg = '<img src="./res/Jersey_polkadot.svg.png" class="jersey" />';
    var tbody = $('#polkaMaillot').children('tbody');
    var table = tbody.length ? tbody : $('#polkaMaillot');
    generateSegmentRankings(polkaStandings, true, table, jerseyImg);
}

var generateSegmentRankings = function(standings, hasGap, table, jerseyImg) {
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td>{{name}}</td>'+
      '<td>{{time}}</td>'+
      (hasGap ? '<td>{{gap}}</td>' : '') +
  '</tr>';

  if (standings.entries.length < 1) {
      table.append(row.compose({
          'id': '--',
          'name': '<i>No results</i>',
          'time': '--',
          'gap': '--',
          'activityId': '#'
      }));
  }

  var gap = 0;
  $.each(standings.entries, function(i, rider) {
    table.append(row.compose({
        'id': i+1,
        'name': i == 0 ? jerseyImg + rider.athlete_name : rider.athlete_name,
        'time': moment.utc(rider.elapsed_time*1000).format('mm:ss'),
        'gap': i == 0 ? '--' : moment.utc(rider.elapsed_time - gap).format('mm:ss'),
        'activityId': rider.activity_id
    }));
    gap = i == 0 ? rider.elapsed_time : gap;
  });
}

var generateYellowMaillotRankings = function(gcStandings) {
  var yellowJerseyImg = '<img src="./res/Jersey_yellow.svg.png" class="jersey" />';
  var tbody = $('#yellowMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#yellowMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td><a href="' + athleteUrl + '{{athleteId}}"><img src="{{picture}}" class="avatar"/></a></td>'+
      '<td>{{name}}</td>'+
      '<td>{{distance}} mi</td>'+
      '<td>{{points}}</td>'+
      '<td>{{gap}}</td>'+
  '</tr>';

  var i = 0;
  var gap = 0;
  for (var rider of gcStandings) {
    table.append(row.compose({
        'id': ++i,
        'picture': rider.profilePicture,
        'name': i == 1 ? yellowJerseyImg + rider.rider : rider.rider,
        'distance': metersToMiles(rider.distance).toLocaleString(),
        'gap': i == 1 ? '--' : metersToMiles(gap - rider.points).toLocaleString(),
        'points': metersToMiles(rider.points),
        'athleteId': rider.id
    }));
    gap = i == 1 ? rider.points : gap;
  };
}

// -------------------------- document ready -----------------------------------
$(document).ready(function() {
    loadClubRankings();
});
