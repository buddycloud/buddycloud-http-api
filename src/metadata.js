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

// metadata.js:
// Handles requests for getting and setting channel metadata
// (/<channel>/metadata/<node>).

var xml = require('libxmljs');
var api = require('./util/api');
var pubsub = require('./util/pubsub');
var session = require('./util/session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.get('/:channel/metadata/:node',
        session.provider,
        api.channelServerDiscoverer,
        getNodeMetadata);
    app.post('/:channel/metadata/:node',
        api.bodyReader,
        session.provider,
        api.channelServerDiscoverer,
        setNodeMetadata);
};

function getNodeMetadata(req, res) {
    var channel = req.params.channel;
    var node = req.params.node;

    requestNodeMetadata(req, res, channel, node, function(reply) {
        var body = replyToJSON(reply);
        res.contentType('json');
        res.send(body);
    });
}

function requestNodeMetadata(req, res, channel, node, callback) {
    var nodeId = pubsub.channelNodeId(channel, node);
    var iq = pubsub.metadataIq(nodeId);
    iq.to = req.channelServer;
    api.sendQuery(req, res, iq, callback);
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

function configureNode(req, res, channel, node, fields, callback) {
    var nodeId = pubsub.channelNodeId(channel, node);
    var iq = makeConfigureIq(nodeId, fields);
    iq.to = req.channelServer;
    api.sendQuery(req, res, iq, callback);
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