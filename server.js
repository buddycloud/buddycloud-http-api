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
var auth = require('./src/util/auth');
var config = require('./src/util/config');
var session = require('./src/util/session');
var grip = require('./src/util/grip');

function setupConfig(app) {
  app.configure(function() {
    app.use(express.logger());
    app.use(function(req, res, next) {
        if (config.debug) 
          console.log("Incoming request: " + req.method + " " + req.url)
        next()
    })
    app.use(auth.parser);
    app.use(grip.parser);
    app.use(crossOriginAllower);
    app.use(app.router);
    app.use(express.errorHandler({
      dumpExceptions: config.debug || false,
      showStack: config.debug || false
    }))
  });
}

function crossOriginAllower(req, res, next) {
  var origin = req.header('Origin', '*');
  if (origin == 'null') {
    origin = '*';
  }

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers',
             'Authorization, Content-Type, X-Requested-With, X-Session-Id');
  res.header('Access-Control-Expose-Headers', 'Location, X-Session-Id');

  if (req.method == 'OPTIONS') {
    res.header('Access-Control-Max-Age', 86400);
    res.send(200);
  } else {
    next();
  }
}

function setupResourceHandlers(app) {
  // Always define non-REST (static) endpoints first
  var handlers = [
    require('./src/account'),
    require('./src/media_proxy'),
    require('./src/content_feed'),
    require('./src/content_item'),
    require('./src/replies'),
    require('./src/media'),
    require('./src/metadata'),
    require('./src/notification_settings'),
    require('./src/notifications_posts'),
    require('./src/root'),
    require('./src/search'),
    require('./src/subscriptions'),
    require('./src/recommendations'),
    require('./src/most_active'),
    require('./src/sync'),
    require('./src/similar'),
    require('./src/contact_matching'),
    require('./src/topic_channel'),
    require('./src/app_node')
  ];
  handlers.forEach(function(h) { h.setup(app); });
}

function printInitialMessage() {
  var profile = config.profile;
  console.log('Server started with configuration profile "' + profile + '"');
  console.log('Listening on port ' + config.port);
}

function createServer() {
  if (config.https) {
    var options = {
      cert: config.httpsCert,
      key: config.httpsKey
    };
    if (!options.cert || !options.key) {
      console.error('HTTPS enabled, but no certificate/key specified');
      process.exit(1);
    }
    return express(options);
  } else {
    return express();
  }
}

var app = createServer();
setupConfig(app);
setupResourceHandlers(app);
printInitialMessage();
app.listen(config.port);

