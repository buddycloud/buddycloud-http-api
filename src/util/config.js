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

// config.js:
// Loads and provides configuration options for the correct profile.
// The exported names exactly match the ones of the corresponding
// config options.
var config = null
if ('testing' === process.env.NODE_ENV) {
    config = require('../../config.js.developer-example')
} else {
    config = require('../../config');
}

// Defaults
exports.requestExpirationTime = 60; // 1min
exports.sessionExpirationTime = 600; // 10min

function loadProfile(name) {
  var profile = config[name] || {};
  for (var key in profile) {
    exports[key] = profile[key];
  }
  if (!exports.mediaProxyPrefix) {
      exports.mediaProxyPrefix = '/media_proxy';
  }
    
  //if (profile.lockTo) {
  //    exports.lockTo = profile.lockTo.split(',');
  //}
}

loadProfile('_');
exports.profile = process.env.NODE_ENV || 'production';
loadProfile(exports.profile);

//if (!exports.lockTo) {
//    exports.lockTo = false;
//}