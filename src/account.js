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
var friendFinder = require('./util/friendfinder');
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

  if (username.indexOf("@") == -1) {
    username = [username, '@', config.xmppDomain].join('');
  }

  var client = new xmpp.Client({
    jid: username,
    host: config.xmppHost,
    password: password,
    register: true
  });
  
  client.on('online', function() {
    registerOnChannelServer(client, function() {
      if (config.pusherComponent) {
        registerOnPusher(client, email);
      }
      if (config.friendFinderComponent) {
        registerOnFriendFinder(client, email);
      }
      registrationSucessful(client, res);
    });
  });
  
  client.on('error', function(err) {
    console.log(err);
    res.send(503);
  });
}

function getChannelServerRegIQ() {
  var queryNode = new xmpp.Iq({type: 'set'}).c('query', {xmlns: 'jabber:iq:register'});
  return queryNode.root();
}

function registerOnChannelServer(client, callback) {
  var signupIq = getChannelServerRegIQ();
  sendRegisterIq(client, signupIq, config.channelDomain, function() {
    callback();
  });
}

function registerOnPusher(client, email) {
  var signupIq = pusher.signup(client.jid.toString(), email);
  sendRegisterIq(client, signupIq, config.pusherComponent);
}

function registerOnFriendFinder(client, email) {
  var signupIq = friendFinder.signup(client.jid.toString(), email);
  sendRegisterIq(client, signupIq, config.friendFinderComponent);
}

function registrationSucessful(client, res) {
  client.end();
  res.send(200);
}

function sendRegisterIq(client, registerIq, to, callback) {
  var iqId = crypto.randomBytes(16).toString('hex');
  var iq = registerIq.root();
  iq.attr('from', client.jid.toString());
  iq.attr('to', to);
  iq.attr('id', iqId);
  
  console.log("OUT xmpp: " + iq);
  client.on('stanza', function(stanza) {
    if (callback && stanza.attrs.id == iqId) {
      callback();
    }
  });
  
  client.send(iq);
}