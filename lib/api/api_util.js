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

// api_util.js:
// Utility functions used by the resource handlers.

var xml = require('libxmljs');
var xmpp = require('node-xmpp');
var auth = require('../auth');
var cache = require('../cache');
var config = require('../config');

var discoInfoNS = 'http://jabber.org/protocol/disco#info';
var discoItemsNS = 'http://jabber.org/protocol/disco#items';

// Used by discoverChannelNode() to cache the server responsible
// for a channel domain
var discoverCache = new cache.Cache();

/**
 * Middleware that reads the request body into a Buffer which is stored
 * in req.body.
 */
exports.bodyReader = function(req, res, next) {
    var chunks = [];
    var size = 0;

    req.on('data', function(data) {
        chunks.push(data);
        size += data.length;
    });

    req.on('end', function(data) {
        req.body = new Buffer(size);
        copyIntoBuffer(req.body, chunks);
        next();
    });
};

function copyIntoBuffer(buffer, chunks) {
    var offset = 0;
    chunks.forEach(function(chunk) {
        chunk.copy(buffer, offset);
        offset += chunk.length;
    });
}

/**
 * Like session.sendQuery(), but takes care of any returned XMPP error
 * stanzas and only passes real replies to the callback.
 */
exports.sendQuery = function(req, res, iq, callback) {
    req.session.sendQuery(iq, function(reply) {
        if (reply.type == 'error')
            reportXmppError(req, res, reply);
        else
            callback(reply);
    });
};

function reportXmppError(req, res, errorStanza) {
    var error = errorStanza.getChild('error');
    if (error) {
        if (error.getChild('not-authorized'))
            res.send(401);
        else if (error.getChild('not-allowed')) {
            if (req.user)
                res.send(403);
            else
                auth.respondNotAuthorized(res);
        }
        else if (error.getChild('item-not-found'))
            res.send(404);
    }
    res.send(500);
};

/**
 * Returns the Pub-Sub node ID for the specified channel node.
 */
exports.channelNodeId = function(channel, subnode) {
    return '/user/' + channel + '/' + subnode;
};

/**
 * Discovers the server and pub-sub node ID for the specified buddycloud
 * channel subnode and calls 'callback(server, id)' on success. If the server
 * could not be determined, "404 Not Found" is returned to the client instead
 * (and the callback is not called).
 */
exports.discoverChannelNode = function(req, res, channel, subnode, callback) {
    var domain = channel.slice(channel.lastIndexOf('@') + 1);
    var nodeId = exports.channelNodeId(channel, subnode);

    exports.discoverChannelServer(req, res, domain, function(server) {
        if (!server) {
            res.send(404);
        } else {
            discoverCache.put(domain, server, config.discoveryExpirationTime);
            callback(server, nodeId);
        }
    });
}

exports.discoverChannelServer = function(req, res, domain, callback) {
    var server = discoverCache.get(domain);
    if (server) {
        callback(server);
        return;
    }

    queryServer(req, res, domain, function(isChannelServer) {
        if (isChannelServer)
            callback(domain);
        else
            queryAdvertisedServers(req, res, domain, callback);
    });
}

function queryServer(req, res, server, callback) {
    sendDiscoInfo(req, res, server, function(reply) {
        var replyDoc = xml.parseXmlString(reply.toString());
        var channelIdentity = replyDoc.find(
            '//disco:identity[@category="pubsub"][@type=\"channels"]',
            {disco: discoInfoNS}
        );
        callback(channelIdentity.length > 0 ? server : null);
    });
}

function sendDiscoInfo(req, res, server, callback) {
    var iq = new xmpp.Iq({to: server, type: 'get'}).
        c('query', {xmlns: discoInfoNS}).root();

    req.session.sendQuery(iq, function(reply) {
        if (reply.type == 'error')
            // Ignore servers that don't support disco#info by
            // returning an empty result
            callback(new xmpp.Iq());
        else
            callback(reply);
    });
}

function queryAdvertisedServers(req, res, server, callback) {
    sendDiscoItems(req, res, server, function(reply) {
        var replyDoc = xml.parseXmlString(reply.toString());
        var servers = replyDoc.
            find('//disco:item/@jid', {disco: discoItemsNS}).
            map(extractJID);
        queryEachServer(req, res, servers, callback);
    });
}

function extractJID(jidAttr) {
    if (typeof(jidAttr.text) == 'function') {
	    return jidAttr.text();
    }
    jid = /jid\=\"(.*)\"/.exec(jidAttr);
    return jid[1];
}

function sendDiscoItems(req, res, server, callback) {
    var iq = new xmpp.Iq({to: server, type: 'get'}).
        c('query', {xmlns: discoItemsNS});
    exports.sendQuery(req, res, iq, callback);
}

function queryEachServer(req, res, servers, callback) {
    if (servers.length == 0) {
        callback(null);
    } else {
        var server = servers.shift();
        queryServer(req, res, server, function(isChannelServer) {
            if (isChannelServer)
                callback(server);
            else
                queryEachServer(req, res, servers, callback);
        });
    }
}

/**
 *
 */
exports.discoverNodeMetadata = function(req, res, channel, node, callback) {
    exports.discoverChannelNode(req, res, channel, node, function(server, id) {
        var iq = new xmpp.Iq({to: server, type: 'get'}).
            c('query', {xmlns: discoInfoNS, node: id});
        exports.sendQuery(req, res, iq, callback);
    });
}
