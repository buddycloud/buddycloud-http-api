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

// xmpp_mockserver.js:
// A small XMPP server which is used as a stand-in for a real one for
// tests. It doesn't actually process incoming stanzas, but simply looks
// them up in a simple request-reply table.
//
// The mock server is configured by the test framework by sending it a
// message. The message's content is a JSON object of the following
// format:
//
// {
//     users: {
//         'user1': 'password1',
//         'user2': 'password2',
//         ...
//     },
//     stanzas: {
//         '<iq type="get">...</iq>': '<iq type="result">...</result>',
//         '<iq type="set">...</iq>': '<iq type="result">...</result>',
//         ...
//     }
// }
//
// 'users' defines the username/password combinations accepted by the
// server. 'stanzas' specifies how each request is replied to.

var ltx = require('ltx')
  , xmpp = require('node-xmpp-server')
  , config = require('../../src/util/config')

var stanzasNS = 'urn:ietf:params:xml:ns:xmpp-stanzas';
var mockConfig;

function setup() {
  process.on('message', function(message) {
    mockConfig = {};
    mockConfig.users = message.users;

    mockConfig.stanzas = {};
    addDefaultStanzaRules();
    addStanzaRules(message.stanzas);

    process.send(true);
  });
}

function addDefaultStanzaRules() {
  addStanzaRules({
    '<iq type="get">\
       <query xmlns="http://jabber.org/protocol/disco#info" node=""/>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://jabber.org/protocol/disco#info">\
         <identity category="pubsub" type="channels"/>\
       </query>\
     </iq>'
  });
}

function addStanzaRules(rules) {
  for (var pattern in rules) {
    if (pattern) {
      var normalizedPattern = removeInsignificantWhitespace(pattern);
      var action = rules[pattern];
      mockConfig.stanzas[normalizedPattern] = action;
    }
  }
}

function removeInsignificantWhitespace(stanza) {
  var doc = ltx.parse(stanza.toString().replace(/>\s+</g, '><'));
  if (typeof stanza != 'string') { // was an already-parsed document
    return doc;
  } else {
    return doc.toString();
  }
}

function start() {
  var server = new xmpp.C2SServer({
    domain: config.xmppHost,
    port: config.xmppPort
  });
  server.on('connect', function(client) {
    client.on('authenticate', function(options, callback) {
      checkAuth(options.user, options.password, callback);
    });
    client.on('stanza', function(stanza) {
      handleStanza(client, stanza);
    });
  });
}

function checkAuth(user, password, callback) {
  if (!user) {
    // Anonymous login
    callback();
  } else {
    var correctPassword = mockConfig.users[user];
    if (correctPassword && password == correctPassword) {
      callback();
    } else {
      callback(new Error('Unauthorized'));
    }
  }
}

function handleStanza(client, stanza) {
  if (stanza.name == 'presence') {
    return;
  }

  var action = findMatchingRule(stanza);
  if (!action) {
    console.error('No rule for handling stanza ' + stanza.toString());
    replyServiceUnavailable(client, stanza.attrs.id);
    return;
  }

  var reply;
  if (typeof action == 'object') {
    addStanzaRules(action);
    reply = action[''];
  } else {
    reply = action;
  }

  reply = ltx.parse(reply);
  reply.attrs.id = stanza.attrs.id;
  client.send(reply);
}

function replyServiceUnavailable(client, id) {
  client.send(new ltx.Element('iq', { id: id, type: 'error' }).
              c('error', {type: '503'}).
              c('service-unavailable', {xmlns: stanzasNS}));
}

function findMatchingRule(stanza) {
  stanza = removeInsignificantWhitespace(stanza);

  for (var key in mockConfig.stanzas) {
    var pattern = ltx.parse(key);
    pattern.attrs.id = stanza.attrs.id;

    if (elementMatches(pattern, stanza)) {
      return mockConfig.stanzas[key];
    }
  }

  return null;
}

function elementMatches(expected, actual) {
  if (typeof expected == 'string') {
    return typeof actual == 'string' && expected == actual;
  }
  if (!actual.is(expected.getName(), expected.getNS())) {
    return false;
  }

  for (var key in expected.attrs) {
    if (expected.attrs[key]) {
      if (expected.attrs[key] != actual.attrs[key])
        return false;
    } else if (actual.attrs[key]) {
      return false;
    }
  }

  if (expected.children.length != actual.children.length) {
    return false;
  }

  for (var i = 0; i < expected.children.length; i++) {
    if (!elementMatches(expected.children[i], actual.children[i])) {
      return false;
    }
  }

  return true;
}

setup();
start();

