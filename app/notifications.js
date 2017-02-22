'use strict';

var IncomingWebhook = require('@slack/client').IncomingWebhook;

var url = process.env.SLACK_WEBHOOK_URL || '';
var webhook = new IncomingWebhook(url);

var sendSlackNotification = function(message) {
    var random = Math.floor(Math.random() * 4);// 0 -> 4
    var famousRider = famousRiders[random];

    var payload = {
        "text": message,
        "username": famousRider[0],
        "channel": "#cycling",
        "iconUrl":famousRider[1]
    };

    webhook.send(payload, function(err, res) {
        if (err) {
            console.log('Error:', err);
        }
    });
}

var famousRiders = [
    ["Eddy Merckx", "https://radius-cycling.herokuapp.com/res/eddy-merckx.jpg"],
    ["Chris Froome", "https://radius-cycling.herokuapp.com/res/chris-froome.jpg"],
    ["Miguel Indurain", "https://radius-cycling.herokuapp.com/res/miguel-indurain.jpg"],
    ["Peter Sagan", "https://radius-cycling.herokuapp.com/res/peter-sagan.jpg"],
    ["Alberto Contador", "https://radius-cycling.herokuapp.com/res/alberto-contador.jpg"],
    ["Alejandro Valverde", "https://radius-cycling.herokuapp.com/res/alejandro-valverde.jpg"],
    ["Fabian Cancellara", "https://radius-cycling.herokuapp.com/res/fabian-cancellara.jpg"],
    ["Mark Cavendish", "https://radius-cycling.herokuapp.com/res/mark-cavendish.jpg"],
    ["Tom Boonen", "https://radius-cycling.herokuapp.com/res/tom-boonen.jpg"]
];

/******************************************************************************/
module.exports = {
    sendNotification: function(jerseyId, previousRider, newRider) {
        var message = 'Wow! Looks like ' + newRider + ' takes the lead from ' +
        previousRider + ' for the ' + jerseyId + '.';
        sendSlackNotification(message);
    }
};
