'use strict';

var IncomingWebhook = require('@slack/client').IncomingWebhook;

var url = process.env.SLACK_WEBHOOK_URL || '';
var webhook = new IncomingWebhook(url);

var sendSlackNotification = function(message) {
    webhook.send(message, function(err, res) {
        if (err) {
            console.log('Error:', err);
        } else {
            console.log('Message sent: ', res);
        }
    });
}

/******************************************************************************/
module.exports = {
    sendNotification: function(jerseyId, previousRider, newRider) {
        var message = newRider + ' takes the lead from ' + previousRider + ' for the ' + jerseyId + '.';
        console.log(message);
        sendSlackNotification(message);
    }
};
