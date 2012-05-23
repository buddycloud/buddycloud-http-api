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

// node_feed.js:
// Handles requests regarding node feeds.

var xmpp = require('node-xmpp');
var xml = require('libxmljs');
var autil = require('./api_util');
var atom = require('../atom');
var config = require('../config');
var pubsub = require('../pubsub');
var session = require('../session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.get('/channels/:channel/:node', session.provider, getNodeFeed);
};

function getNodeFeed(req, res) {
    var nodeId = '/user/' + req.params.channel + '/' + req.params.node;
    requestNodeItems(req.session, nodeId, function(reply) {
        if (reply.type == 'error') {
            autil.reportXmppError(res, reply);
        } else {
            var feed = generateNodeFeed(reply);
            res.contentType('atom');
            res.send(feed.toString());
        }
    });
}

function requestNodeItems(session, nodeId, callback) {
    var iq = pubsub.itemsIq({node: nodeId});
    session.sendQuery(iq, callback);
}

function generateNodeFeed(reply) {
    var feed = xml.Document();
    feed.node('feed').namespace(atom.ns);

    var replyDoc = xml.parseXmlString(reply.toString());
    var entries = replyDoc.find('/iq/p:pubsub/p:items/p:item/atom:entry', {
        p: pubsub.ns,
        atom: atom.ns
    });

    entries.forEach(function(entry) {
        addTitleIfNeeded(entry);
        feed.root().addChild(entry.remove());
    });

    return feed;
}

function addTitleIfNeeded(entry) {
    var content = entry.get('a:content/text()', {a: atom.ns});
    if (content) {
        var teaser = extractTeaser(content.toString());
        entry.node('title', teaser).namespace(atom.ns);
    }
}

function extractTeaser(content) {
    if (content.length < 40)
        return content;
    else
        return content.slice(0, 39) + '…';
}

