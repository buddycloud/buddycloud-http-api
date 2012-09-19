/*
 * Copyright 2012 buddycloud
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// notification.js:
// Handles requests related to notification settings (/notifications).

var session = require('./util/session');
var pusher = require('./util/pusher');
var api = require('./util/api');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.get('/notifications',
          session.provider,
          getSettings);
  app.post('/notifications',
           session.provider,
           updateSettings);
};

//// GET /notifications /////////////////////////////////////////////////////////////

function getSettings(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }
  
  requestSettings(req, res, function(reply) {
    var body = pusher.settingsToJSON(reply);
    res.contentType('json');
    res.send(body);
  });
}

function requestSettings(req, res, callback) {
  var getSettingsIq = pusher.getSettings();
  api.sendQueryToPusher(req, res, getSettingsIq, callback);
}

////POST /notifications /////////////////////////////////////////////////////////////

function updateSettings(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }
  
  var settings = {
    email: req.body.email, 
    postAfterMe: req.body.postafterme,
    postMentionedMe: req.body.postmentionedme,
    postOnMyChannel: req.body.postonmychannel,
    postOnSubscribedChannel: req.body.postonsubscribedchannel,
    followMyChannel: req.body.followmychannel,
    followRequest: req.body.followrequest
  };
  
  requestSettingsUpdate(req, res, settings, function(reply) {
    var body = pusher.settingsToJSON(reply);
    res.contentType('json');
    res.send(body);
  });
}

function requestSettingsUpdate(req, res, settings, callback) {
  var updateSettingsIq = pusher.updateSettings(settings);
  api.sendQueryToPusher(req, res, updateSettingsIq, callback);
}