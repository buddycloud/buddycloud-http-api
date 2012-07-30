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

// api.js:
// Utility functions and middleware used by the API resource handlers.

var xml = require('libxmljs');
var xmpp = require('node-xmpp');
var atom = require('./atom');
var auth = require('./auth');
var cache = require('./cache');
var config = require('./config');
var disco = require('./disco');
var pubsub = require('./disco');

/**
 * Sends a "401 Unauthorized" response with the correct "WWW-Authenticate"
 * header set.
 */
exports.sendUnauthorized = function(res) {
    res.header(
        'WWW-Authenticate',
        'Basic realm="' + config.xmppDomain + '"'
    );
    res.send(401);
};

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
        if (error.getChild('not-authorized') ||
            error.getChild('not-allowed') ||
            error.getChild('forbidden')) {
            if (req.user) {
                res.send(403);
            } else {
                exports.sendUnauthorized(res);
            }
        }
        else if (error.getChild('item-not-found'))
            res.send(404);
    }
    res.send(500);
}

/**
 * Responds to req with an Atom document in a format
 * determined by the "Accept" request header (either
 * XML or JSON).
 */
exports.sendAtomResponse = function(req, res, doc) {
    var response;

    if (req.accepts('application/atom+xml')) {
        res.contentType('atom');
        response = doc.toString();
    } else if (req.accepts('application/json')) {
        res.contentType('json');
        response = atom.toJSON(doc);
    } else {
        response = 406;
    }

    res.send(response);
};

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
 * Middleware that uses discoverChannelServer() from "util/buddycloud"
 * to look up the requested channel's home server name. It is assumed
 * that the request handler's URL pattern has a ":channel" placeholder.
 * On success, the middleware sets req.channelServer to the discovered
 * server's hostname.
 *
 * This is assumed to run after session.provider().
 */
 exports.channelServerDiscoverer = function(req, res, next) {
    var channel = req.params.channel;
    var domain = channel.slice(channel.lastIndexOf('@') + 1);

    disco.discoverChannelServer(domain, req.session, function(server, err) {
        if (err) {
            res.send(err);
        } else {
            req.channelServer = server;
            next();
        }
    });
};

/**
 * Middleware that looks up the buddycloud media server responsible
 * for the requested resource and stores its HTTP root in req.mediaRoot.
 */
exports.mediaServerDiscoverer = function(req, res, next) {
    // FIXME: This must be replaced with real discovery
    req.mediaRoot = config.homeMediaRoot;
    next();
};
