var serverUrl = '';

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

//--------------- Polo Field Leaderboard ---------------
var loadSprinterLeaderBoard = function(params) {
  $.ajax({url: serverUrl + "/sprinters" + params})
   .done(function (data) {
     generateGreenMaillotRankings(data);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve Polo Field leaderboard');
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
          generatePolkaRankings(data);
          loadSprinterLeaderBoard(params);
          loadRadiusLeaderBoard(params);
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
var generateGreenMaillotRankings = function(data) {
  var radiusJerseyImg = '<img src="./res/Jersey_green.svg.png" class="jersey" />';
  var tbody = $('#greenMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#greenMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td>{{name}}</td>'+
      '<td>{{time}}</td>'+
  '</tr>';

  $.each(data.entries, function(i, rider) {
    table.append(row.compose({
        'id': i+1,
        'name': i == 0 ? radiusJerseyImg + rider.athlete_name : rider.athlete_name,
        'time': rider.elapsed_time + ' s'
    }));
  });
}

var generateRadiusRankings = function(data) {
  var radiusJerseyImg = '<img src="./res/Jersey_blue.svg.png" class="jersey" />';
  var tbody = $('#radiusMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#radiusMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td>{{name}}</td>'+
      '<td>{{time}}</td>'+
      '<td>{{gap}}</td>'+
  '</tr>';

  var gap = 0;
  $.each(data.entries, function(i, rider) {
    table.append(row.compose({
        'id': i+1,
        'name': i == 0 ? radiusJerseyImg + rider.athlete_name : rider.athlete_name,
        'time': moment.utc(rider.elapsed_time*1000).format('mm:ss'),
        'gap': i == 0 ? '--' : rider.elapsed_time - gap + ' s'
    }));
    gap = i == 0 ? rider.elapsed_time : gap;
  });
}

var generatePolkaRankings = function(polkaStandings) {
  var polkaJerseyImg = '<img src="./res/Jersey_polkadot.svg.png" class="jersey" />';
  var tbody = $('#polkaMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#polkaMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td>{{name}}</td>'+
      '<td>{{elevation}}</td>'+
      '<td>{{time}}</td>'+
  '</tr>';

  var minClimbs = 4;
  polkaStandings.sort(function (a, b) {
    if (a.polka_climbs < minClimbs) {
        if (b.polka_climbs < minClimbs) {
            var dElev = b.elevation - a.elevation;
            if(dElev) return dElev;
        }
        return 1;
    }

    if (b.polka_climbs < minClimbs) {
        return -1;
    }

    // Sort by time
    var dTime = a.time - b.time;
    if(dTime) return dTime;

    var dElevation = b.elevation - a.elevation;
    if(dElevation) return dElevation;

    return 0;
  });

  var i = 0;
  for (var rider of polkaStandings) {
    var time =  minClimbs > rider.polka_climbs ? 0 : rider.time;
    table.append(row.compose({
        'id': ++i,
        'name': i == 1 ? polkaJerseyImg + rider.rider : rider.rider,
        'elevation': metersToFeet(rider.elevation).toLocaleString() + ' ft',
        'time': moment.utc(time*1000).format('mm:ss'),
    }));
  }
}

var generateYellowMaillotRankings = function(gcStandings) {
  var yellowJerseyImg = '<img src="./res/Jersey_yellow.svg.png" class="jersey" />';
  var tbody = $('#yellowMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#yellowMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td><img src="{{picture}}" class="avatar"/></td>'+
      '<td>{{name}}</td>'+
      '<td>{{distance}}</td>'+
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
        'distance': metersToMiles(rider.distance).toLocaleString() + ' mi',
        'gap': i == 1 ? '--' : metersToMiles(gap - rider.distance).toLocaleString() + ' mi',
        'points': metersToMiles(rider.points)
    }));
    gap = i == 1 ? rider.distance : gap;
  };
}

// -------------------------- document ready -----------------------------------
$(document).ready(function() {
    loadClubRankings();
});
