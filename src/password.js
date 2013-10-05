/*
 * Copyright 2012 Denis Washington <denisw@online.de>
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

// account.js:
// Handles account-related requests (/account).

var config = require('./util/config');
var pusher = require('./util/pusher');
var session = require('./util/session');
var api = require('./util/api');
var xmpp = require('node-xmpp');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/account/pw/change',
           api.bodyReader,
           session.provider,
           changePassword);
};

//// POST /account/pw/change /////////////////////////////////////////////////////////////

function changePassword(req, res) {
  try {
    var pwChange = JSON.parse(req.body);
  } catch (e) {
    res.send(400);
  }
  
  var username = pwChange['username'];
  var password = pwChange['password'];
  
  if (!username || !password) {
    res.send(400);
    return;
  }

  var domain = null;
  
  if (username.indexOf("@") == -1) {
    domain = config.xmppDomain;
  } else {
    var splitUsername = username.split('@');
    username = splitUsername[0];
    domain = splitUsername[1];
  }

  var pwChangeIq = createPasswordChangeIQ(username, password);
  api.sendQueryToXmpp(req, res, pwChangeIq, domain, function(reply) {
    res.send(200);
  });
}

function createPasswordChangeIQ(username, password) {
  var queryNode = new xmpp.Iq({type: 'set'}).c('query', {xmlns: 'jabber:iq:register'});
  queryNode.c('username').t(username);
  queryNode.c('password').t(password);
  return queryNode.root();
}
