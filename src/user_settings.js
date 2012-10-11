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

// user_settings.js:
// Handles requests related to user notification settings (/user_settings).

var session = require('./util/session');
var pusher = require('./util/pusher');
var api = require('./util/api');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.get('/user_settings',
          session.provider,
          getSettings);
  app.post('/user_settings',
           api.bodyReader,
           session.provider,
           updateSettings);
};

//// GET /user_settings /////////////////////////////////////////////////////////////

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

////POST /user_settings /////////////////////////////////////////////////////////////

function updateSettings(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }
  
  var fields = JSON.parse(req.body);
  
  requestSettingsUpdate(req, res, fields, function(reply) {
    var body = pusher.settingsToJSON(reply);
    res.contentType('json');
    res.send(body);
  });
}

function requestSettingsUpdate(req, res, settings, callback) {
  var updateSettingsIq = pusher.updateSettings(settings);
  api.sendQueryToPusher(req, res, updateSettingsIq, callback);
}