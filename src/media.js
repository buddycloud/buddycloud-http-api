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

// media.js:
// Handles requests for communicationg with buddycloud media servers.

var crypto = require('crypto');
var url = require('url');
var xmpp = require('node-xmpp');
var api = require('./util/api');
var session = require('./util/session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.all('/media/:channel/:id',
        session.provider,
        api.mediaServerDiscoverer,
        getMedia);
};

function getMedia(req, res) {
    // The media server doesn't currently understand anonymous requests.
    if (!req.user) {
        api.sendUnauthorized(res);
        return;
    }

    var transactionId = crypto.randomBytes(16).toString('hex');
    req.session.onStanza(confirmRequest(req, transactionId));

    var auth = generateAuth(req, transactionId);
    res.header('Location', generateMediaUrl(req, auth, transactionId));
    res.send(302);
}

function generateAuth(req, transactionId) {
    var buf = new Buffer(req.session.jid + ':' + transactionId);
    return base64url(buf);
}

function base64url(buf) {
    return buf.toString('base64').replace('+', '-').replace('/', '_');
}

function generateMediaUrl(req, auth, transactionId) {
    var mediaUrl = url.parse(req.mediaRoot);

    var path = [
        'media',
        req.params.channel,
        req.params.id
    ].join('/');
    mediaUrl.pathname += '/' + path;

    var query = { auth: auth };
    if (req.query.maxwidth) {
        query.maxwidth = req.query.maxwidth;
    }
    if (req.query.maxheight) {
        query.maxheight = req.query.maxheight;
    }
    mediaUrl.query = query;

    return url.format(mediaUrl);
}

function confirmRequest(req, transactionId) {
    return function(stanza) {
        var confirmEl = stanza.getChild('confirm');
        if (confirmEl && confirmEl.attrs.id == transactionId) {
            req.session.replyToQuery(stanza);
        }
    };
}
