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
var connect = require('connect');
var xmpp = require('node-xmpp');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/:account',
           connect.json(),
           registerAccount);
};

//// POST /account /////////////////////////////////////////////////////////////

function registerAccount(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  if (!username || !password) {
    res.send(400);
    return;
  }

  var client = new xmpp.Client({
    jid: [username, '@', config.xmppDomain].join(''),
    password: password,
    register: true
  });
  client.on('online', function() {
    client.end();
    res.send(200);
  });
  client.on('error', function(err) {
    res.send(503);
  });
}
