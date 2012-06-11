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

// server.js:
// The HTTP API server's entry point.

var express = require('express');
var auth = require('./lib/auth');
var config = require('./lib/config');
var session = require('./lib/session');

function setupConfig(app) {
    app.configure(function() {
        app.use(express.logger({immediate: true}));
        app.use(auth.parser);
        app.use(express.errorHandler());
    });
    app.configure('development', function() {
        app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    });
}

function setupResourceHandlers(app) {
    var handlers = [
        require('./lib/api/node_feed'),
        require('./lib/api/node_item'),
        require('./lib/api/node_sub')
    ];
    handlers.forEach(function(h) { h.setup(app); });
}

function printInitialMessage() {
    var profile = config.profile;
    console.log('Server started with configuration profile "' + profile + '"');
    console.log('Listening on port ' + config.port);
}

var app = express.createServer();
setupConfig(app);
setupResourceHandlers(app);
printInitialMessage();
app.listen(config.port);

