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
var ltx = require('ltx');

// config.js:
// Loads and provides configuration options for the correct profile.
// The exported names exactly match the ones of the corresponding
// config options.
var baseConfig = null
if ('testing' === process.env.NODE_ENV) {
    baseConfig = require('../../config.js.developer-example')
} else {
    baseConfig = require('../../config');
}

var config = {}
var autoDiscoverCache = {}

// Defaults
exports.requestExpirationTime = 60; // 1min
exports.sessionExpirationTime = 600; // 10min

function loadProfile(name) {
  var profile = baseConfig[name] || {};
  for (var key in profile) {
    config[key] = profile[key];
  }
  if (!config.mediaProxyPrefix) {
      config.mediaProxyPrefix = '/media_proxy';
  }
    
  if (profile.lockTo) {
      config.lockTo = profile.lockTo.split(',');
  }
}

loadProfile('_');
config.profile = process.env.NODE_ENV || 'production';
loadProfile(config.profile);

if (!config.lockTo) {
    config.lockTo = false;
}

var discoverComponents = function(domain, client, callback) {
    var discoItems = new ltx.Element('iq', { type: 'get', to: 'domain' )
        .c('query', { xmlns: 'http://jabber.org/protocol/disco#info' })
    var baseId = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 12)
    var stanzaListener = client.on('stanza', function(stanza) {
        
    })
    client.send(discoItems)
    
    
        
    client.removeEventListener(stanzaListener)
        
}

config.getSessionConfig = function(domain, client, callback) {
    if (!config.autoDiscover) return callback(null, config)
    if (autoDiscoverCache[domain]) return callback(null, autoDiscoverCache[domain])
    discoverComponents(domain, callback)
}


module.exports = config