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

// notifications_posts.js:
// Resource to long-poll for future posts.

var api = require('./util/api');
var atom = require('./util/atom');
var config = require('./util/config');
var pubsub = require('./util/pubsub');
var session = require('./util/session');
var grip = require('./util/grip');
var xml = require('libxmljs');

exports.setup = function(app) {
  app.get('/notifications/posts',
          session.provider,
          listenForNextItem);
};

function listenForNextItem(req, res, next) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }

  if (!req.gripProxied) {
    api.sendGripUnsupported(res);
    return;
  }

  var channel = grip.encodeChannel('np-' + req.session.jid);

  req.session.onStanza(function(stanza, wait) {
    if (isPubSubItemMessage(stanza)) {
      req.session.sendPresenceOffline();
      var item = extractItem(stanza);
      api.publishAtomResponse(channel, item);
    } else {
      wait();
    }
  });

  req.session.sendPresenceOnline();
  api.sendHoldResponse(req, res, channel);
}

function isPubSubItemMessage(stanza) {
  if (stanza.attrs.from == config.channelDomain) {
    var eventEl = stanza.getChild('event', pubsub.eventNS);
    var itemsEl = eventEl ? eventEl.getChild('items') : null;
    var itemEl = itemsEl ? itemsEl.getChild('item') : null;
    var entryEl = itemEl ? itemEl.getChild('entry', atom.ns) : null;
    return !!entryEl;
  } else {
    return false;
  }
}

function extractItem(message) {
  message = xml.parseXmlString(message.toString());
  messageEl = message.get('/message');
  // Fix for tigase xmlns 
  if (!messageEl) {
    messageEl = message.get('/j:message', {j: 'jabber:client'})
  }
  var items = messageEl.get('p:event/p:items', {
    p: pubsub.eventNS
  });
  var entry = items.get('p:item/a:entry', {
    p: pubsub.eventNS,
    a: atom.ns
  });
  addSourceToEntry(entry, items.attr('node').value());
  return entry;
}

function addSourceToEntry(entry, node) {
  var source = entry.node('source');
  var queryURI = pubsub.queryURI(config.channelDomain, 'retrieve', node);
  var sourceId = source.node('id', queryURI);
  source.namespace(atom.ns);
  sourceId.namespace(atom.ns);
}
