'use strict';

var IncomingWebhook = require('@slack/client').IncomingWebhook;

var url = process.env.SLACK_WEBHOOK_URL || '';
var webhook = new IncomingWebhook(url);

var sendSlackNotification = function(message) {
    var payload = {
        "text": message,
        "username": "Eddy Merckx",
        "channel": "#cycling",
        "iconUrl":"https://radius-cycling.herokuapp.com/res/eddy-merckx.jpg"
    };

    webhook.send(payload, function(err, res) {
        if (err) {
            console.log('Error:', err);
        }
    });
}

/******************************************************************************/
module.exports = {
    sendNotification: function(jerseyId, previousRider, newRider) {
        var message = '';
        if (previousRider == '') {
            message = newRider + ' takes the lead for the ' + jerseyId + '! Good job!';
        } else {
            message = 'Wow! Looks like ' + newRider + ' takes the lead from ' +
            previousRider + ' for the ' + jerseyId + '.\n He reminds me of a young me.';
        }
        sendSlackNotification(message);
    }
};
