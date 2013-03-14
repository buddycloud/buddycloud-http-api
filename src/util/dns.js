/*
 * Copyright 2013 Abmar Barros <abmar@buddycloud.com>
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

var dns = require('dns');
var net = require('net');
var config = require('./config');

var HTTP = 'http://';
var HTTPS = 'https://';
var API_SRV_PREFIX = '_buddycloud-api._tcp.';
var MEDIA_PROXY_ENDPOINT = '/media_proxy';

function ping(address, port, error, success) {
  var socket = new net.Socket();
  socket.connect({'port': port, 'host': address});
  socket.on('connect', function() {
    socket.destroy();
    success();
  });
  socket.on('error', function() {
    socket.destroy();
    error();
  });
}

function discoverRemote(req, remoteDomain, callback) {
  dns.resolveSrv(API_SRV_PREFIX + remoteDomain, function (err, addresses) {
    if (err) {
      callback(null);
      return;
    }
    
    if (addresses.length == 0) {
      callback(null);
      return;
    }
    
    //TODO Iterate over all addresses
    var firstAddress = addresses[0];
    ping(firstAddress.name, firstAddress.port, function() {
      callback(null);
    }, function() {
      var protocol = HTTP;
      if (firstAddress.port == 443) {
        protocol = HTTPS;
      }
      console.log('Discovered: ' + protocol + firstAddress.name + MEDIA_PROXY_ENDPOINT);
      callback(protocol + firstAddress.name + MEDIA_PROXY_ENDPOINT);
    });
    
  });
}

exports.discoverAPI = function(req, callback) {
  var channel = req.params.channel;
  var remoteDomain = channel.split('@')[1];
  
  if (remoteDomain == config.xmppDomain) {
    mediaRoot = config.homeMediaRoot;
    localMediaAddress = mediaRoot.split('://')[1];
    localMediaAddressSplit = localMediaAddress.split(':');
    ping(localMediaAddressSplit[0], localMediaAddressSplit[1], function() {
      discoverRemote(req, remoteDomain, callback);
    }, function() {
      callback(mediaRoot)
    });
  } else {
    discoverRemote(req, remoteDomain, callback);
  }
};

