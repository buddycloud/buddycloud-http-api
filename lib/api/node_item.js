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

// node_item.js:
// Handles requests regarding single node items.

var xml = require('libxmljs');
var autil = require('./api_util');
var atom = require('../atom');
var pubsub = require('../pubsub');
var session = require('../session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.get('/channels/:channel/:node/item', session.provider, getNodeItem);
};

function getNodeItem(req, res) {
    var itemId = req.query.id;
    if (!itemId) {
        req.send(404);
        return;
    }

    var nodeId = '/user/' + req.params.channel + '/' + req.params.node;
    requestNodeItem(req, res, nodeId, itemId, function(reply) {
        var entry = extractEntry(reply);
        if (!entry) {
            res.send(404);
        } else {
            atom.ensureEntryHasTitle(entry);
            res.contentType('atom');
            res.send(entry.toString());
        }
    });
}

function requestNodeItem(req, res, nodeId, itemId, callback) {
    var iq = pubsub.singleItemIq(nodeId, itemId);
    autil.sendQuery(req, res, iq, callback);
}

function extractEntry(reply) {
    var replyDoc = xml.parseXmlString(reply.toString());
    return replyDoc.get('/iq/p:pubsub/p:items/p:item/a:entry', {
        p: pubsub.ns,
        a: atom.ns
    });
}

