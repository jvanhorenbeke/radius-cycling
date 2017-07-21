var serverUrl = '';
var activityUrl = 'https://www.strava.com/activities/';
var athleteUrl = 'https://www.strava.com/athletes/';
const defaultClubId = '197635'; //Default clubId is Radius-Cycling team

//Compose template string
String.prototype.compose = (function (){
    var re = /\{{(.+?)\}}/g;
    return function (o){
        return this.replace(re, function (_, k){
            return typeof o[k] != 'undefined' ? o[k] : '';
        });
    }
}());
// --------------- Club Activities ---------------
var loadClubRankings = function() {

    var params = "/";
    var clubId = getUrlVar('clubid');
    params += clubId != "" ? clubId : defaultClubId;

    var year = getUrlVar('year');
    params += year != "" ? "/" + year : "";

    $.ajax({url: serverUrl + "/boards" + params})
     .done(function (data) {
       $.each(data, function(i, board) {
           if (board.name == "general") {
               $.ajax({url: serverUrl + "/general" + params})
                .done(function (data) {
                     generateYellowMaillotRankings(data);
                })
                .fail(function (jqXHR, textStatus) {
                   console.log('unable to retrieve GC ranking');
                });
           }
           else {
               loadSegmentLeaderBoard(board, params);
           }
       })
     })
     .fail(function (jqXHR, textStatus) {
        console.log('unable to retrieve leaderboards for club');
     });
}
//--------------- Segment Leaderboard ---------------
var loadSegmentLeaderBoard = function(leaderboard, params) {
  $.ajax({url: serverUrl + '/' + leaderboard.name + params})
   .done(function (standings) {
       generateSegmentRankings(standings, leaderboard);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve leaderboard: ' + leaderboard.name);
   });
};
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
var generateSegmentRankings = function(standings, leaderboard) {
    var tbody = $('#' + leaderboard.id).children('tbody');
    var table = tbody.length ? tbody : $('#' + leaderboard.id);
    var jerseyImg = '<img src="./res/jersey/' + leaderboard.jersey + '.png" class="jersey" />';
    var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td><a href="' + activityUrl + '{{activityId}}">{{name}}</a></td>'+
      '<td><a href="' + activityUrl + '{{activityId}}">{{time}}</a></td>'+
      (leaderboard.hasGap ? '<td>{{gap}}</td>' : '') +
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
        'gap': i == 0 ? '--' : moment.utc(1000*(rider.elapsed_time - gap)).format('mm:ss'),
        'activityId': rider.activity_id
    }));
    gap = i == 0 ? rider.elapsed_time : gap;
  });
}

var generateYellowMaillotRankings = function(gcStandings) {
  var yellowJerseyImg = '<img src="./res/jersey/yellow.png" class="jersey" />';
  var tbody = $('#yellowMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#yellowMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td><a href="' + athleteUrl + '{{athleteId}}"><img src="{{picture}}" class="avatar"/></a></td>'+
      '<td><a href="' + athleteUrl + '{{athleteId}}">{{name}}</a></td>'+
      '<td>{{distance}} mi</td>'+
      '<td>{{points}}</td>'+
      '<td>{{gap}}</td>'+
  '</tr>';

  var i = 0;
  var gap = 0;
  for (var rider of gcStandings) {
    if (rider.distance <= 0) {
        continue;
    }

    table.append(row.compose({
        'id': ++i,
        'picture': rider.profilePicture,
        'name': i == 1 ? yellowJerseyImg + rider.rider : rider.rider,
        'distance': metersToMiles(rider.distance).toLocaleString(),
        'gap': i == 1 ? '--' : metersToMiles(gap - rider.points).toLocaleString(),
        'points': metersToMiles(rider.points),
        'athleteId': rider.athlete_id
    }));
    gap = i == 1 ? rider.points : gap;
  };
}

var loadClubHeader = function() {
    var clubId = getUrlVar('clubid');
    var clubHeader = '<h1><img src="https://dgalywyr863hv.cloudfront.net/pictures/clubs/197635/4257457/2/medium.jpg" /> Radius Cycling</h1>';
    if (clubId != "" && clubId==2016) {
        clubHeader = '<h1><img src="https://dgalywyr863hv.cloudfront.net/pictures/clubs/2016/1229525/1/medium.jpg" /> M2 Revolution</h1>';
    }
    $('#clubHeader').append(clubHeader);
}

// -------------------------- document ready -----------------------------------
$(document).ready(function() {
    loadClubHeader();
    loadClubRankings();
});
