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

var config = require('./util/config');
var session = require('./util/session');
var api = require('./util/api');

var url = require('url');
var xmpp = require('node-xmpp');
var xml = require('libxmljs');

var ns = 'http://buddycloud.com/friend_finder/match_';

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.get('/match_contacts',
           session.provider,
           getMatchingContacts);
};

//// GET /match_contacts?provider=p&access_token=o /////////////////////////////////////////////////////////////

function getMatchingContacts(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }
  
  var params = url.parse(req.url, true).query;
  
  var provider = params.provider;
  var accessToken = params.access_token;
  var accessTokenSecret = params.access_token_secret;

  requestMatchingContacts(req, res, provider, accessToken, accessTokenSecret, function(reply) {
    var items = contactsToJSON(reply, ns + provider);
    var body = {items: items};
    res.contentType('json');
    res.send(body);
  });
}

function contactsToJSON(reply, providerNs) {
  var items = xml.parseXmlString(reply.toString()).find('//query:item', {query: providerNs});
  var jsonItems = [];
  items.forEach(function(e){
    jsonItems.push(contactToJSON(e, ns));
  });
  return jsonItems;
}

function contactToJSON(item) {
  var jid = item.attr('jid');
  var matchedHash = item.attr('matched-hash');
  return {jid : jid.value(), matchedHash : matchedHash.value()};
}

function requestMatchingContacts(req, res, provider, accessToken, accessTokenSecret, callback) {
  var iq = getMatchingContactsIq(provider, accessToken, accessTokenSecret);
  api.sendQueryToFriendFinder(req, res, iq, callback);
}

function iq(attrs, ns) {
  return new xmpp.Iq(attrs).c('query', {xmlns: ns || exports.ns});
}

function getMatchingContactsIq(provider, accessToken, accessTokenSecret) {
  var queryNode = iq({type: 'get'}, ns + provider);
  queryNode.c('access_token').t(accessToken);
  if (accessTokenSecret) {
    queryNode.c('access_token_secret').t(accessTokenSecret);
  }
  return queryNode.root();
}