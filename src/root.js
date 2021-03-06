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

// root.js:
// Handles requests for the API root (/).

var session = require('./util/session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  // Reply to requests for the API root with a "No Content" response.
  // This is useful for e.g. verifying user credentials or establishing
  // sessions before making concrete requests.
  app.get('/', session.provider, function(req, res) {
    res.send(204);
  });
};
