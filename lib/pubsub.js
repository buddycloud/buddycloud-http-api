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

/** The XMPP Pub-Sub XML namespace. */
exports.ns = 'http://jabber.org/protocol/pubsub'

/**
 * Generates an XMPP pub-sub query URI with the passed parameters.
 * (See secion 16.1 of XEP-0060.)
 */
exports.queryURI = function(host, action, node) {
    return 'xmpp:' + host + '?pubsub;action=' + action + ';node=' + node;
}

// Creates the basic skeleton for all types of Pub-Sub queries.
function iq(attrs) {
    return new xmpp.Iq(attrs).c('pubsub', {xmlns: exports.ns});
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
    if (max)
        setElem.c('max').t(max);
    if (after)
        setElem.c('after').t(after);
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
 * Creates a Pub-Sub <publish/> IQ, which posts an item to a node.
 */
exports.publishIq = function(nodeId, item) {
    return iq({type: 'set'}).c('publish', {node: nodeId}).
        c('item').
        cnode(ltx.parse(item)).
        root();
};

/**
 * Creates a Pub-Sub <affiliations/> IQ, which retrieves a list of all
 * users subscribed to a node and their affiliations (roles).
 */
exports.affiliationsIq = function(nodeId, item) {
    return iq({type: 'get'}).
        c('affiliations', {node: nodeId}).
        root();
};

/**
 * Creates a Pub-Sub <subscribe/> IQ, which subscribes to a node.
 */
exports.subscribeIq = function(nodeId, jid) {
    return iq({type: 'set'}).
        c('subscribe', {node: nodeId, jid: jid}).
        root();
};

/**
 * Creates a Pub-Sub <unsubscribe/> IQ, which unsubscribes from a node.
 */
exports.unsubscribeIq = function(nodeId, jid) {
    return iq({type: 'set'}).
        c('unsubscribe', {node: nodeId, jid: jid}).
        root();
};
