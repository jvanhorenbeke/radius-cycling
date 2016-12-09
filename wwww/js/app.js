var map = new Map();
var activitiesSet = new Set();
var bearerToken = 'Bearer ';

var metersToMiles = function(meters) {
  return Math.round(meters/1000*0.62137);
}

var metersToFeet = function(meters) {
  return Math.round(meters*3.28084);;
}

//Compose template string
String.prototype.compose = (function (){
    var re = /\{{(.+?)\}}/g;
    return function (o){
        return this.replace(re, function (_, k){
            return typeof o[k] != 'undefined' ? o[k] : '';
        });
    }
}());

// --------------- Load Local Activites ---------------
var parseLocalActivities = function() {
  $.getJSON("../logs/data.json", {})
  .done(function(data) {
    $.each(data, function(i, activity) {
      if (activitiesSet.has(activity.id) || activity.type != 'Ride' || activity.commute == true || !map.has(activity.athlete.id)) {
        return;
      }

      activitiesSet.add(activity.id);
      update(activity.athlete.id, activity.distance, activity.total_elevation_gain, activity.start_date);
    });

    // loadClubAcitivities();
    generateYellowMaillotRankings();
    generatePolkaRankings();
  })
  .fail(function(){});
};

//--------------- Hawk Hill Leaderboard ---------------
var loadRadiusLeaderBoard = function() {
  $.ajax({
       url: "https://www.strava.com/api/v3/segments/229781/leaderboard?club_id=197635&per_page=50",
       headers: {"Authorization": bearerToken}
   })
   .done(function (data) {
     generateRadiusRankings(data);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve Hawk Hill leaderboard');
   });
};

//--------------- Polo Field Leaderboard ---------------
var loadSprinterLeaderBoard = function() {
  $.ajax({
       url: "https://www.strava.com/api/v3/segments/432873/leaderboard?club_id=197635&per_page=50",
       headers: {"Authorization": bearerToken}
   })
   .done(function (data) {
     generateGreenMaillotRankings(data);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve Polo Field leaderboard');
   });
}

// --------------- Club Activities ---------------
var loadClubAcitivities = function() {
  $.ajax({
       url: "https://www.strava.com/api/v3/clubs/radius-intelligence/activities?per_page=200",
       headers: {"Authorization": bearerToken}
   })
   .done(function (data) {
      $.each(data, function(i, item) {
        if (activitiesSet.has(item.id)) {
          return;
        }

        if (item.type == 'Ride' && item.commute == false) {
          update(item.athlete.id, item.distance, item.total_elevation_gain, item.start_date);
        }
      });

      //now that all our data is loaded we print the values;
      generateYellowMaillotRankings();
      generatePolkaRankings();
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve club activities');
   });
}

$(document).ready(function() {
  //--------------- Members ---------------
  $.ajax({
       url: "https://www.strava.com/api/v3/clubs/radius-intelligence/members?per_page=200",
       headers: {"Authorization": bearerToken}
   })
   .done(function (data) {
      $.each(data, function(i, member) {
        if (!map.has(member.id)) {
          map.set(member.id, {
            'distance' : 0,
            'elevation' : 0,
            'profilePicture' : member.profile_medium,
            'rider' : member.firstname + ' ' + member.lastname
          });
        }
      });

      parseLocalActivities();
      loadSprinterLeaderBoard();
      loadRadiusLeaderBoard();
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve club activities');
   });
});

// ------------------ Util functions ---------------------

var update = function(id, distance, elevation, startDate) {
  var activityYear = moment(startDate, "YYYY-MM-DDTHH:mm:ssZ").year();
  if (activityYear != moment().year()) {
    return;
  }
  var athlete = map.get(id);
  athlete.distance += distance;
  athlete.elevation += elevation;
}

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

var generatePolkaRankings = function() {
  var polkaJerseyImg = '<img src="./res/Jersey_polkadot.svg.png" class="jersey" />';
  var tbody = $('#polkaMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#polkaMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td>{{name}}</td>'+
      '<td>{{elevation}}</td>'+
  '</tr>';

  var polkaStandings = [...map.values()];
  polkaStandings.sort(function (a, b) {
    if (a.elevation > b.elevation) {
      return -1;
    }
    if (a.elevation < b.elevation) {
      return 1;
    }

    return 0;
  });

  var i = 0;
  for (var rider of polkaStandings) {
    table.append(row.compose({
        'id': ++i,
        'name': i == 1 ? polkaJerseyImg + rider.rider : rider.rider,
        'elevation': metersToFeet(rider.elevation) + ' ft'
    }));
  }
}

var generateYellowMaillotRankings = function() {

  var yellowJerseyImg = '<img src="./res/Jersey_yellow.svg.png" class="jersey" />';
  var tbody = $('#yellowMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#yellowMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td>{{name}}</td>'+
      '<td>{{distance}}</td>'+
      '<td>{{gap}}</td>'+
  '</tr>';

  var gcStandings = [...map.values()];
  gcStandings.sort(function (a, b) {
    if (a.distance > b.distance) {
      return -1;
    }
    if (a.distance < b.distance) {
      return 1;
    }
    return 0;
  });

  var i = 0;
  var gap = 0;
  for (var rider of gcStandings) {
    table.append(row.compose({
        'id': i,
        'name': i == 0 ? yellowJerseyImg + rider.rider : rider.rider,
        'distance': metersToMiles(rider.distance),
        'gap': i == 0 ? '--' : metersToMiles(gap - rider.distance) + ' mi'
    }));
    gap = i == 0 ? rider.distance : gap;
    i++;
  };
}
