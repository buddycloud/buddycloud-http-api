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

// auth.js:
// Provides functions relating to HTTP authentication.

var config = require('./config');

/**
 * Middleware that parses the HTTP "Authorization" header and stores
 * the read credentials into req.user and req.password.
 */
exports.parser = function(req, res, next) {
  var auth = req.header('Authorization');
  if (!auth) {
    next();
    return;
  }

  var match = auth.match(/Basic\s+([A-Za-z0-9\+\/]+=*)\s*/);
  if (!match) {
    next(new Error('Bad Request'));
    return;
  }

  var buf = new Buffer(match[1], 'base64');
  var credentials = buf.toString('utf8');

  var separatorIdx = credentials.indexOf(':');
  if (separatorIdx < 0) {
    next(new Error('Bad Request'));
    return;
  }

  req.user = credentials.slice(0, separatorIdx);
  req.password = credentials.slice(separatorIdx + 1);
  req.credentials = credentials;

  // If the username has no domain part, assume the home domain
  if (req.user.indexOf('@') < 0) {
    req.user += '@' + config.xmppDomain;
  }

  next();
};
