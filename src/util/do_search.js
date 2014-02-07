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

// do_search.js:
// Creates XMPP queries for the search component.

var config = require('./config')
  , ltx = require('ltx')

var metadataNs = 'http://buddycloud.com/channel_directory/metadata_query';
var contentNs = 'http://buddycloud.com/channel_directory/content_query';
var recommendationNs = 'http://buddycloud.com/channel_directory/recommendation_query';
var mostActiveNs = 'http://buddycloud.com/channel_directory/most_active';

var entryNs = 'http://www.w3.org/2005/Atom';
var thrNs = 'http://purl.org/syndication/thread/1.0';
var rsmNs = 'http://jabber.org/protocol/rsm';

// Creates the basic skeleton for all types of Pub-Sub queries.
function iq(attrs, ns) {
  return new ltx.Element('iq', attrs).c('query', { xmlns: ns || exports.ns })
}

exports.mostActive = function(max, index, domain, period) {
  var queryNode = iq({type: 'get'}, mostActiveNs)

  if (period) {
    queryNode.c('period').t(period)
  }

  if (domain) {
    queryNode.c('domain').t(domain)
  }

  if (max || index) {
    var rsm = queryNode.c('set', {xmlns: 'http://jabber.org/protocol/rsm'})
    if (max) {
      rsm.c('max').t(max)
    }
    if (index) {
      rsm.c('index').t(index)
    }
  }

  return queryNode.root()
};

exports.recommend = function(userJid, max, index) {
  var queryNode = iq({type: 'get'}, recommendationNs);
  queryNode.c('user-jid').t(userJid);

  if (max || index) {
    var rsm = queryNode.c('set', {xmlns: 'http://jabber.org/protocol/rsm'});
    if (max) {
      rsm.c('max').t(max);
    }
    if (index) {
      rsm.c('index').t(index);
    }
  }

  return queryNode.root();
};

exports.appendRSM = function(queryNode, max, index) {
  if (max || index) {
    var rsm = queryNode.c('set', {xmlns: 'http://jabber.org/protocol/rsm'});
    if (max) {
      rsm.c('max').t(max);
    }
    if (index) {
      rsm.c('index').t(index);
    }
  }
};

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
    var rsm = queryNode.c('set', {xmlns: 'http://jabber.org/protocol/rsm'});
    if (max) {
      rsm.c('max').t(max);
    }
    if (index) {
      rsm.c('index').t(index);
    }
  }

  return queryNode.root();
};

exports.channelsToJSON = function(reply, ns) {
  var items = xml.parse(reply.toString()).getChild('query')
      .getChild('pubsub')
      .getChildren('items');
  var jsonItems = [];
  items.forEach(function(e){
    var item = e.getChild('item')
    jsonItems.push(channelToJson(item, ns));
  });
  return jsonItems;
}

function channelToJson(item, ns) {
  var jid = item.attrs.jid;
  var description = item.attrs.description;
  var creationDate = item.attrs.created;
  var title = item.getChild('title');
  var defaultAffiliation = item.getChild('default_affiliation');
  var channelType = item.getChild('channel_type');

  jsonItem = {
    jid : jid ? jid.getText() : null,
    description : description ? description.getText() : null,
    creationDate : creationDate ? creationDate.getText() : null,
    title : title ? title.getText() : null,
    channelType : channelType ? channelType.getText() : null,
    defaultAffiliation : defaultAffiliation ? defaultAffiliation.getText() : null
  };

  return jsonItem;
}

function postToJson(item) {
  var entry = item.child(0);

  var id = item.attrs.id;
  var author = entry.getChild("author");
  var content = entry.getChild("content");
  var updated = entry.getChild("updated");
  var published = entry.getChild("published");
  var parentFullid = entry.getChild("parent_fullid");
  var parentSimpleid = entry.getChild("parent_simpleid");
  var inReplyTo = entry.getChild("in-reply-to", thrNs);

  jsonItem = {
    id : id ? id : null,
    author : author ? author.getText() : null,
    content : content ? content.getText() : null,
    updated : updated ? updated.getText() : null,
    published : published ? published.getText() : null,
    parent_fullid : parentFullid ? parentFullid.getText() : null,
    parent_simpleid : parentSimpleid ? parentSimpleid.getText() : null,
    in_reply_to : inReplyTo ? (inReplyTo.attrs.ref ? inReplyTo.attrs.ref : null) : null
  };

  return jsonItem;
}

exports.postsToJSON = function(reply) {
  var items = ltx.parse(reply.toString()).getChild('query').getChild('pubsub').getChildren('items')
  var jsonItems = [];
  items.forEach(function(e){
    var item = e.getChild('item');
    jsonItems.push(postToJson(item));
  });
  return jsonItems;
}

exports.rsmToJSON = function(reply) {
  var rsmSet = xml.parseXmlString(reply.toString()).get('//set:set', {set: rsmNs});
  var firstNode = rsmSet.get('set:first', {set: rsmNs});
  var index = 0;
  if (firstNode) {
    index = firstNode.attr('index').value();
  }
  var count = rsmSet.get('set:count', {set: rsmNs}).text();
  return {index: index, count: count};
}