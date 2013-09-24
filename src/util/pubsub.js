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

// pubsub.js:
// Supports the construction of XMPP Pub-Sub queries.

var ltx = require('ltx');
var xmpp = require('node-xmpp');
var config = require('./config');
var atom = require('./atom');
var xml = require('libxmljs');

/** The XMPP Pub-Sub XML namespaces. */
exports.ns = 'http://jabber.org/protocol/pubsub';
exports.eventNS = 'http://jabber.org/protocol/pubsub#event';
exports.ownerNS = 'http://jabber.org/protocol/pubsub#owner';

/**
 * Returns the Pub-Sub node ID for the specified buddycloud channel node.
 */
exports.channelNodeId = function(channel, name) {
  return '/user/' + channel + '/' + name;
};

/**
 * Generates an XMPP pub-sub query URI with the passed parameters.
 * (See secion 16.1 of XEP-0060.)
 */
exports.queryURI = function(host, action, node) {
  return 'xmpp:' + host + '?pubsub;action=' + action + ';node=' + node;
};

// Creates the basic skeleton for all types of Pub-Sub queries.
function iq(attrs, ns) {
  return new xmpp.Iq(attrs).c('pubsub', {xmlns: ns || exports.ns});
}

/**
 * Creates an Pub-Sub node <query/> IQ to retrieve a node's metadata.
 */
exports.metadataIq = function(nodeId) {
  return new xmpp.Iq({type: 'get'}).
    c('query', {node: nodeId, xmlns: 'http://jabber.org/protocol/disco#info'}).
    root();
};

/**
 * Creates a Pub-Sub <items/> IQ that retrieves all items of a node (or
 * up to 'max' items, excluding the item with ID 'after' and all newer
 * ones).
 */
exports.itemsIq = function(nodeId, max, after) {
  var itemsNode = iq({type: 'get'}).c('items', {node: nodeId});
  if (max || after) {
    itemsNode.attr('max_items', max); // for XEP-0060 compatibility
    addRSM(itemsNode.up(), max, after);
  }
  return itemsNode.root();
};

function addRSM(parent, max, after) {
  var setElem = parent.c('set', {xmlns: 'http://jabber.org/protocol/rsm'});
  if (max) {
    setElem.c('max').t(max);
  }
  if (after) {
    setElem.c('after').t(after);
  }
}

/**
 * Creates a Pub-Sub <items/> IQ that retrieves a single item from a node.
 */
exports.singleItemIq = function(nodeId, itemId) {
  return exports.itemsIq(nodeId).
    getChild('pubsub').
    getChild('items').
    c('item', {id: itemId}).
    root();
};

/**
 * Creates a Pub-Sub <items/> IQ that retracts a single item from a node.
 */
exports.singleItemRetractIq = function(nodeId, itemId) {
  var retractNode = iq({type: 'set'}).c('retract', {node: nodeId, notify: '1'});
  var itemNode = retractNode.c('item', {id: itemId});
  return itemNode.root();
};

/**
 * Creates a Pub-Sub <publish/> IQ, which posts an item to a node.
 */
exports.publishIq = function(nodeId, item) {
  return iq({type: 'set'}).c('publish', {node: nodeId}).
    c('item').
    cnode(ltx.parse(item)).
    root();
};

/**
 * Creates a Pub-Sub user <affiliations/> IQ, which retrieves a list of all
 * nodes that the requesting user subscribed to.
 */
exports.userAffiliationsIq = function(user) {
  return iq({type: 'get'}).
    c('affiliations').
    root();
};

/**
 * Creates a Pub-Sub <affiliations/> IQ, which retrieves a list of all
 * users subscribed to a node and their affiliations (roles).
 */
exports.nodeAffiliationsIq = function(nodeId, item) {
  return iq({type: 'get'}, exports.ownerNS).
    c('affiliations', {node: nodeId}).
    root();
};

/**
 * Creates a Pub-Sub <affiliations/> IQ with multiple <affiliation> tags,
 * each composed by a jid of a subscribing channel and its new type of affiliation.
 * The <subscribedJIDAndAffiliation> parameter must be an array of entries in the format:
 * {'jid' : 'jid_val', 'affiliation' : 'affiliation_type'}
 */
exports.changeNodeAffiliationsIq = function(nodeId, newAffiliations) {
  var iqBody = iq({type : 'set'}, exports.ownerNS).
	  c('affiliations', {node: nodeId});
  for (var jid in newAffiliations) {
    var affiliation = newAffiliations[jid];
    iqBody.c('affiliation', {jid: jid, affiliation: affiliation});
  }
  return iqBody.root();
};

/**
 * Creates a Pub-Sub <subscriptions/> IQ, which approves 
 * pending subscriptions to a node.
 */
exports.approveSubscriptionIq = function(nodeId, subscribers) {
  var iqBody = iq({type : 'set'}, exports.ownerNS).
      c('subscriptions', {node: nodeId});
  for (var i in subscribers) {
    var subscriber = subscribers[i]; 
    iqBody.c('subscription', {jid: subscriber['jid'], subscription: subscriber['subscription']});
  }
  return iqBody.root();
};

/**
 * Creates a Pub-Sub <subscriptions/> IQ, that retrieves 
 * subscriptions from a node.
 */
exports.nodeSubscriptionsIq = function(nodeId, subscribersJid) {
  var iqBody = iq({type : 'get'}, exports.ownerNS).
      c('subscriptions', {node: nodeId});
  return iqBody.root();
};

/**
 * Creates a Pub-Sub <subscribe/> IQ, which subscribes to a node.
 */
exports.subscribeIq = function(nodeId, jid, isTemp) {
  var query = iq({type: 'set'});
  query.c('subscribe', {node: nodeId, jid: jid});
  if (isTemp) {
    var form = query.c('options').
    c('x', {xmlns: 'jabber:x:data', type: 'submit'});
    addFormField(form, 'FORM_TYPE', 'hidden',
                 'http://jabber.org/protocol/pubsub#node_config');
    addFormField(form, 'pubsub#expire', 'text-single', 'presence');
  }
  return query.root();
};

/**
 * Creates a Pub-Sub <unsubscribe/> IQ, which unsubscribes from a node.
 */
exports.unsubscribeIq = function(nodeId, jid) {
  return iq({type: 'set'}).
    c('unsubscribe', {node: nodeId, jid: jid}).
    root();
};

/**
 * Creates a Pub-Sub <configure/> IQ which sets a node's configuration.
 */
exports.configureIq = function(nodeId, fields) {
  var form = iq({type: 'set'}, exports.ownerNS).
    c('configure', {node: nodeId}).
    c('x', {xmlns: 'jabber:x:data', type: 'submit'});

  addFormField(form, 'FORM_TYPE', 'hidden',
               'http://jabber.org/protocol/pubsub#node_config');

  for (var field in fields) {
    addFormField(form, field, 'text-single', fields[field]);
  }

  return form.root();
};

/**
 * Creates a Pub-Sub <create/> IQ which creates a node
 */
exports.createNodeIq = function(nodeId) {
  var pubsubIq = iq({type: 'set'}, exports.ns);
  pubsubIq.c('create', {node: nodeId});
  
  var form = pubsubIq.c('configure', {node: nodeId}).
    c('x', {xmlns: 'jabber:x:data', type: 'submit'});
    
  addFormField(form, 'FORM_TYPE', 'hidden',
               'http://jabber.org/protocol/pubsub#node_config');
  addFormField(form, 'buddycloud#default_affiliation', 'text-single',
               'publisher');
  
  return pubsubIq.root();
};

/**
 * Creates a Pub-Sub <create/> IQ which deletes a node
 */
exports.deleteNodeIq = function(nodeId) {
  var deleteIq = iq({type: 'set'}, exports.ownerNS).
    c('delete', {node: nodeId});
  return deleteIq.root();
};

function addFormField(form, name, type, value) {
  form.c('field', {'var': name, 'type': type}).c('value').t(value);
}

exports.isPubSubItemMessage = function(stanza) {
  if (stanza.attrs.from == config.channelDomain) {
    var eventEl = stanza.getChild('event', exports.eventNS);
    var itemsEl = eventEl ? eventEl.getChild('items') : null;
    var itemEl = itemsEl ? itemsEl.getChild('item') : null;
    var entryEl = itemEl ? itemEl.getChild('entry', atom.ns) : null;
    return !!entryEl;
  } else {
    return false;
  }
}

exports.extractItem = function(message) {
  message = xml.parseXmlString(message.toString());
  messageEl = message.get('/message');
  // Fix for tigase xmlns
  if (!messageEl) {
    messageEl = message.get('/j:message', {j: 'jabber:client'})
  }
  var items = messageEl.get('p:event/p:items', {
    p: exports.eventNS
  });
  var entry = items.get('p:item/a:entry', {
    p: exports.eventNS,
    a: atom.ns
  });
  addSourceToEntry(entry, items.attr('node').value());
  return entry;
}

function addSourceToEntry(entry, node) {
  var source = entry.node('source');
  var queryURI = exports.queryURI(config.channelDomain, 'retrieve', node);
  var sourceId = source.node('id', queryURI);
  source.namespace(atom.ns);
  sourceId.namespace(atom.ns);
}
