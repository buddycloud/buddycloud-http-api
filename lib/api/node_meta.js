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

// node_sub.js:
// Handles requests regarding node metadata.

var xml = require('libxmljs');
var autil = require('./api_util');
var pubsub = require('../pubsub');
var session = require('../session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.get('/channels/:channel/:node/meta',
        session.provider,
        getNodeMetadata);
    app.post('/channels/:channel/:node/meta',
        autil.bodyReader,
        session.provider,
        setNodeMetadata);
};

function getNodeMetadata(req, res) {
    var channel = req.params.channel;
    var node = req.params.node;

    autil.discoverNodeMetadata(req, res, channel, node, function(reply) {
        var body = replyToJSON(reply);
        res.contentType('json');
        res.send(body);
    });
}

function replyToJSON(reply) {
    var replydoc = xml.parseXmlString(reply.toString());

    var title = getOption(replydoc, 'pubsub#title');
    var description = getOption(replydoc, 'pubsub#description');
    var accessModel = getOption(replydoc, 'pubsub#access_model');
    var creationDate = getOption(replydoc, 'pubsub#creation_date');
    var type = getOption(replydoc, 'buddycloud#channel_type');
    var affiliation = getOption(replydoc, 'buddycloud#default_affiliation');

    return {
        title: title,
        description: description,
        access_model: accessModel,
        creation_date: creationDate,
        channel_type: type,
        default_affiliation: affiliation
    };
}

function getOption(reply, name) {
    var query = '//x:field[@var="' + name + '"]/x:value';
    var option = reply.get(query, {x: 'jabber:x:data'});
    return option ? option.text() : undefined;
}

function setNodeMetadata(req, res) {
    var channel = req.params.channel;
    var node = req.params.node;
    var fields = JSON.parse(req.body);

    configureNode(req, res, channel, node, fields, function() {
        res.send(200);
    });
}

function makeConfigureIq(node, fields) {
    var pfields = {};

    for (var field in fields) {
        var pfield = pubsubFieldName(field);
        if (!pfield) {
            continue;
        } else {
            pfields[pfield] = fields[field];
        }
    }

    return pubsub.configureIq(node, pfields);
}

function pubsubFieldName(field) {
    switch (field) {
        case 'title':        return 'pubsub#title';
        case 'description':  return 'pubsub#description';
        case 'access_model': return 'pubsub#access_model';
        default:             return null;
    }
}

function configureNode(req, res, channel, node, fields, callback) {
    autil.discoverChannelNode(req, res, channel, node, function(server, id) {
        var iq = makeConfigureIq(id, fields);
        iq.to = server;
        console.log(iq.toString());
        autil.sendQuery(req, res, iq, callback);
    });
}
