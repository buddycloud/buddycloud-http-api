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

// disco.js:
// Implements discovery of channel servers.

var xml = require('libxmljs');
var xmpp = require('node-xmpp');
var cache = require('./cache');

// Used by discoverChannelNode() to cache the server responsible
// for a channel domain
var discoverCache = new cache.Cache(2 * 60 * 60);

var DISCO_INFO_NS = 'http://jabber.org/protocol/disco#info';
var DISCO_ITEMS_NS = 'http://jabber.org/protocol/disco#items';

/**
 * Queries a domain to find its associated channel server.
 * On success, it calls 'callback(server, null)'. Otherwise
 * 'callback(null, err)' is called, where 'err' is 404 if no
 * channel server was found and 500 otherwise.
 */
exports.discoverChannelServer = function(domain, session, callback) {
    var server = discoverCache.get(domain);
    if (server) {
        callback(server, null);
        return;
    }

    // Wrap callback with a caching operation
    var cb = callback;
    callback = function(server, err) {
        if (server) {
            discoverCache.put(domain, server);
        }
        cb(server, err);
    };

    askIfChannelServer(domain, session, function(isChannelServer) {
        if (isChannelServer) {
            callback(domain, null);
        } else {
            askAdvertisedServers(domain, session, callback);
        }
    });
};

function askIfChannelServer(server, session, callback) {
    var iq = discoInfoIq(server);

    session.sendQuery(iq, function(reply) {
        if (reply.type == 'error') {
            callback(false);
            return;
        }

        var replydoc = xml.parseXmlString(reply.toString());
        var channelServerId = replydoc.find(
            '//disco:identity[@category="pubsub"][@type=\"channels"]',
            {disco: DISCO_INFO_NS}
        );

        callback(channelServerId.length > 0 ? server : null);
    });
}

function askAdvertisedServers(server, session, callback) {
    var iq = discoItemsIq(server);

    session.sendQuery(iq, function(reply) {
        if (reply.type == 'error') {
            callback(null, 404);
            return;
        }

        var replydoc = xml.parseXmlString(reply.toString());
        var servers = replydoc.
            find('//disco:item/@jid', {disco: DISCO_ITEMS_NS}).
            map(extractJID);

        askEachServer(servers, session, callback);
    });
}

function extractJID(jidAttr) {
    if (typeof(jidAttr.text) == 'function') {
        return jidAttr.text();
    }
    jid = /jid\=\"(.*)\"/.exec(jidAttr);
    return jid[1];
}

function askEachServer(servers, session, callback) {
    if (servers.length === 0) {
        callback(null, 404);
    } else {
        var server = servers.shift();
        askIfChannelServer(server, session, function(isChannelServer) {
            if (isChannelServer)
                callback(server, null);
            else
                askEachServer(servers, session, callback);
        });
    }
}

function discoInfoIq(server, callback) {
    return new xmpp.Iq({to: server, type: 'get'}).
        c('query', {xmlns: DISCO_INFO_NS}).
        root();
}

function discoItemsIq(server, callback) {
    return new xmpp.Iq({to: server, type: 'get'}).
        c('query', {xmlns: DISCO_ITEMS_NS}).
        root();
}