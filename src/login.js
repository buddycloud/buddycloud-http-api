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

// login.js:
// Handles login requests (/login).

var config = require('./util/config');
var connect = require('connect');
var xmpp = require('node-xmpp');

/**
 * Login resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/login',
           connect.json(),
           login);
};

//// POST /login /////////////////////////////////////////////////////////////

function login(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if (!username || !password) {
    res.send(400);
    return;
  }

  if (username.indexOf("@") == -1) {
    username = [username, '@', config.xmppDomain].join('');
  }

  var client = new xmpp.Client({
    jid: username,
    host: config.xmppHost,
    password: password
  });

  client.on('online', function() {
    loginSucessful(client, res);
  });

  client.on('error', function(err) {
    console.log(err);
    res.send(503);
  });
}

function loginSucessful(client, res) {
  client.end();
  res.send(200);
}