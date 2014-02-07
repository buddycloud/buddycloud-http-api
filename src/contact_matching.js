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

// similar.js:
// Handles requests related to channel similarity (/:channel/similar/).

var config = require('./util/config')
  , session = require('./util/session')
  , api = require('./util/api')
  , url = require('url')
  , ltx = require('ltx')

var ns = 'http://buddycloud.com/friend_finder/match';

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/match_contacts',
           api.bodyReader,
           session.provider,
           postMatchingContacts);
};

//// POST /match_contacts /////////////////////////////////////////////////////////////

function postMatchingContacts(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }

  var contacts = JSON.parse(req.body);

  requestMatchingContacts(req, res, contacts.mine, contacts.others, function(reply) {
    var items = contactsToJSON(reply);
    var body = {items: items};
    res.contentType('json');
    res.send(body);
  });
}

function contactsToJSON(reply) {
  var items = ltx.parse(reply.toString())
      .getChild('query', ns)
      .getChildren('item');
  var jsonItems = [];
  items.forEach(function(e){
    jsonItems.push(contactToJSON(e));
  });
  return jsonItems;
}

function contactToJSON(item) {
  var jid = item.attrs.jid;
  var matchedHash = item.attrs['matched-hash'];
  return { jid: jid, 'matched-hash': matchedHash };
}

function requestMatchingContacts(req, res, mine, others, callback) {
  var iq = getMatchingContactsIq(mine, others);
  api.sendQueryToFriendFinder(req, res, iq, callback);
}

function iq(attrs, ns) {
  return new ltx.Element('iq', attrs).c('query', {xmlns: ns || exports.ns});
}

function getMatchingContactsIq(mine, others) {
  var queryNode = iq({type: 'get'}, ns);
  if (mine) {
    for (var myHashIdx in mine) {
      queryNode.c('item', {'item-hash': mine[myHashIdx], 'me': 'true'});
    }
  }
  if (others) {
    for (var otherHashIdx in others) {
      queryNode.c('item', {'item-hash': others[otherHashIdx]});
    }
  }
  return queryNode.root();
}