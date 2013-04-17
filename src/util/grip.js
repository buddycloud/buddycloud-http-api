/*
 * Copyright 2013 Justin Karneges <justin@fanout.io>
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

// grip.js:
// Provides functions relating to GRIP realtime proxying.

var pubcontrol = require('pubcontrol')
var griplib = require('grip')
var config = require('./config');

// global PubControl reference
var pub = null;

/**
 * Middleware that parses the HTTP "Grip-Sig" header and sets
 * req.gripProxied.
 */
exports.parser = function(req, res, next) {
  if (!config.gripKey) {
    next();
    return;
  }

  var sig = req.header('Grip-Sig');
  if (!sig) {
    next();
    return;
  }

  /*if (!griplib.validateSig(sig, config.gripKey)) {
    next();
    return;
  }*/

  req.gripProxied = true;

  next();
};

exports.encodeChannel = function(channel) {
  return channel.replace(/\//g, ".");
}

/**
 * Convenience publish function.
 */
exports.publish = function(channel, id, prevId, rheaders, rbody, sbody) {
  if (!config.gripControlUri) {
    return;
  }

  if (!pub) {
    var auth = null;  
    if(config.gripControlIss) {
      auth = pubcontrol.Auth.AuthJwt({'iss': config.gripControlIss}, config.gripKey);
    }

    pub = new pubcontrol.PubControl(config.gripControlUri, auth);
  }

  var formats = [];
  if (rbody != null) {
    formats.push(new griplib.HttpResponseFormat(200, 'OK', rheaders, rbody));
  }
  if (sbody != null) {
    formats.push(new griplib.HttpStreamFormat(sbody));
  }

  pub.publish(channel, new pubcontrol.Item(formats, id, prevId));
}
