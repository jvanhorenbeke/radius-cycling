var athletesMap = new Map();
var fastestRider;
var maxSpeed = 0;
var genesisEpoch = 1481415064;
// var serverUrl = 'https://radiant-taiga-80822.herokuapp.com';
var serverUrl = 'http://jelles-macbook-pro-2.local:3000';

//Compose template string
String.prototype.compose = (function (){
    var re = /\{{(.+?)\}}/g;
    return function (o){
        return this.replace(re, function (_, k){
            return typeof o[k] != 'undefined' ? o[k] : '';
        });
    }
}());

//Because of Strava API's limitation we need to hardcode the distances of older activities
var loadFixedValues = function() {
    update(3014007, milesToMeters(2696.8), feetToMeters(191946), '2016-12-02T14:28:21Z');//Philip
    update(9022454, milesToMeters(1530.6), feetToMeters(74009), '2016-12-02T14:28:21Z');//Jelle
    update(1911372, milesToMeters(1605), feetToMeters(111027), '2016-12-02T14:28:21Z');//Preston
    update(9757503, milesToMeters(1928), feetToMeters(145335), '2016-12-02T14:28:21Z');//Evan
    update(74954, milesToMeters(1711.7), feetToMeters(78215), '2016-12-02T14:28:21Z');//Pablo
    update(1211014, milesToMeters(2235.1), feetToMeters(152959), '2016-12-02T14:28:21Z');//Tyler W
    update(14531982, milesToMeters(300.8), feetToMeters(18202), '2016-12-02T14:28:21Z');//Antoine
    update(1896314, milesToMeters(520.3), feetToMeters(32336), '2016-12-02T14:28:21Z');//Tyler P.
    update(13205409, milesToMeters(843.3), feetToMeters(44682), '2016-12-02T14:28:21Z');//Yoshio
    update(4190437, milesToMeters(683.2), feetToMeters(26440), '2016-12-02T14:28:21Z');//Dan
    update(13718617, milesToMeters(223.8), feetToMeters(9797), '2016-12-02T14:28:21Z');//Isaac
    update(2339027, milesToMeters(102.8), feetToMeters(8543), '2016-12-02T14:28:21Z');//Nick
    update(11759106, milesToMeters(324.6), feetToMeters(10794), '2016-12-02T14:28:21Z');//Austin
}

//--------------- Hawk Hill Leaderboard ---------------
var loadRadiusLeaderBoard = function() {
  $.ajax({url: serverUrl + "/radius"})
   .done(function (data) {
     generateRadiusRankings(data);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve Hawk Hill leaderboard');
   });
};

//--------------- Polo Field Leaderboard ---------------
var loadSprinterLeaderBoard = function() {
  $.ajax({url: serverUrl + "/sprinters"})
   .done(function (data) {
     generateGreenMaillotRankings(data);
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve Polo Field leaderboard');
   });
}

// --------------- Club Activities ---------------
var loadClubAcitivities = function() {
  $.ajax({url: serverUrl + "/activities"})
   .done(function (data) {
      $.each(data, function(i, activity) {
        var activityEpoch = moment.utc(activity.start_date, "YYYY-MM-DDTHH:mm:ssZ");
        activityEpoch = activityEpoch.unix();
        if (activityEpoch < genesisEpoch) {
            return;
        }

        if (activity.type == 'Ride' && activity.commute == false) {
          update(activity.athlete.id, activity.distance, activity.total_elevation_gain, activity.start_date);
          updateMaxSpeed(activity.max_speed, activity.athlete.id, activity.athlete.firstname + ' ' + activity.athlete.lastname);
        }
      });

      //now that all our data is loaded we print the values;
      generateYellowMaillotRankings();
      generatePolkaRankings();
      linkedFastestRider();
   })
   .fail(function (jqXHR, textStatus) {
      console.log('unable to retrieve club activities');
   });
}

// --------------- Club Members ---------------
var loadClubMembers = function() {
    $.ajax({url: serverUrl + "/members"})
     .done(function (data) {
        $.each(data, function(i, member) {
          if (!athletesMap.has(member.id)) {
            athletesMap.set(member.id, {
              'distance' : 0,
              'elevation' : 0,
              'profilePicture' : member.profile_medium,
              'rider' : member.firstname + ' ' + member.lastname
            });
          }
        });

        loadFixedValues();
        loadClubAcitivities();
        loadSprinterLeaderBoard();
        loadRadiusLeaderBoard();
     })
     .fail(function (jqXHR, textStatus) {
        console.log('unable to retrieve club activities');
     });
}

$(document).ready(function() {
    loadClubMembers();
});

// ------------------ Util functions ---------------------
var feetToMeters = function(feet) {
    return Math.round(feet/3.28084);
}

var milesToMeters = function(miles) {
    return Math.round(miles/0.62137*1000);
}

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

var updateMaxSpeed = function(max_speed, id, name){
    if (maxSpeed < max_speed) {
        fastestRider = name;
        maxSpeed = max_speed;
    }
}

var update = function(id, distance, elevation, startDate) {
    var activityYear = moment(startDate, "YYYY-MM-DDTHH:mm:ssZ").year();
    if (activityYear != moment().year()) {
        return;
    }
    var athlete = athletesMap.get(id);
    athlete.distance += distance;
    athlete.elevation += elevation;
}

// ------------------ Bind data to HTML elements ---------------------
var linkedFastestRider = function() {
    $('#fastestRider').html(fastestRider + ' - ' + speedToMiles(maxSpeed) + ' mi/h');
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

  var polkaStandings = [...athletesMap.values()];
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
        'elevation': metersToFeet(rider.elevation).toLocaleString() + ' ft'
    }));
  }
}

var generateYellowMaillotRankings = function() {
  var yellowJerseyImg = '<img src="./res/Jersey_yellow.svg.png" class="jersey" />';
  var tbody = $('#yellowMaillot').children('tbody');
  var table = tbody.length ? tbody : $('#yellowMaillot');
  var row = '<tr>'+
      '<th scope="row">{{id}}</th>'+
      '<td><img src="{{picture}}" class="avatar"/></td>'+
      '<td>{{name}}</td>'+
      '<td>{{distance}}</td>'+
      '<td>{{gap}}</td>'+
  '</tr>';

  var gcStandings = [...athletesMap.values()];
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
        'id': ++i,
        'picture': rider.profilePicture,
        'name': i == 1 ? yellowJerseyImg + rider.rider : rider.rider,
        'distance': metersToMiles(rider.distance).toLocaleString() + ' mi',
        'gap': i == 1 ? '--' : metersToMiles(gap - rider.distance).toLocaleString() + ' mi'
    }));
    gap = i == 1 ? rider.distance : gap;
  };
}
