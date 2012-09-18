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

// pusher.js:
// Creates XMPP queries for the pusher component.

var xmpp = require('node-xmpp');
var config = require('./config');
var metadataNs = 'http://buddycloud.com/channel_directory/metadata_query';
var contentNs = 'http://buddycloud.com/channel_directory/content_query';

// Creates the basic skeleton for all types of Pub-Sub queries.
function iq(attrs, ns) {
  return new xmpp.Iq(attrs).c('query', {xmlns: ns || exports.ns});
}

exports.search = function(type, q, max, index) {
  var ns = null;
  if (type == 'metadata') {
    ns = metadataNs;
  } else if (type == 'content') {
    ns = contentNs;
  }
  var queryNode = iq({type: 'get'}, ns);
  queryNode.c('search').t(q);
  
  if (max || index) {
    var rsm = queryNode.c('rsm', {xmlns: 'http://jabber.org/protocol/rsm'});
    if (max) {
      rsm.c('max').t(max);
    }
    if (index) {
      rsm.c('index').t(index);
    }
  }
  
  return queryNode.root();
};
