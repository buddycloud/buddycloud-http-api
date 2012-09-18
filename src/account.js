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
var connect = require('connect');
var xmpp = require('node-xmpp');
var crypto = require('crypto');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/account',
           connect.json(),
           registerAccount);
};

//// POST /account /////////////////////////////////////////////////////////////

function registerAccount(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;

  if (!username || !password || !email) {
    res.send(400);
    return;
  }

  var client = new xmpp.Client({
    jid: [username, '@', config.xmppDomain].join(''),
    password: password,
    register: true
  });
  client.on('online', function() {
    var signupIq = pusher.signup(client.jid.toString(), email);
    sendToPusher(client, signupIq, function() {
      client.end();
      res.send(200);
    });
  });
  client.on('error', function(err) {
    res.send(503);
  });
}

function sendToPusher(client, signupIq, callback) {
  iqId = crypto.randomBytes(16).toString('hex');
  
  iq = signupIq.root();
  iq.attr('from', client.jid.toString());
  iq.attr('to', config.pusherComponent);
  iq.attr('id', iqId);
  
  console.log("OUT xmpp: " + iq);
  client.on('stanza', function(stanza) {
    if (stanza.attrs.id == iqId) {
      callback();
    }
  });
  client.send(iq);
}