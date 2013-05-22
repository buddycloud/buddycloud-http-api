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

var API_SRV_PREFIX = '_buddycloud-api._tcp.';
var MEDIA_PROXY_ENDPOINT = '/media_proxy';

var TXT_TOKENS = ['v', 'host', 'protocol', 'path', 'port'];

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
  dns.resolveTxt(API_SRV_PREFIX + remoteDomain, function (err, addresses) {
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
    var txtRecord = splitTXTRecord(firstAddress);
    if (!txtRecord) {
      callback(null);
      return;
    }
    
    var host = txtRecord['host'];
    var port = txtRecord['port'];
    
    ping(host, port, function() {
      callback(null);
    }, function() {
      var protocol = txtRecord['protocol'];
      var path = txtRecord['path'];
      path = !path || path == '/' ? '' : path; 
      callback(protocol + '://' + host + ':' + port + path + MEDIA_PROXY_ENDPOINT);
    });
  });
}

function sortTuplesByValues(dict) {
  var tuples = [];
  for (var key in dict) {
    tuples.push([key, dict[key]]);
  }
  tuples.sort(function(a, b) { 
    return a[1] - b[1]; 
  });
  return tuples;
}

function extractTXTValues(tuples, response) {
  var values = {};
  for (var i = 0; i < tuples.length; i++) {
    var tuple = tuples[i];
    var token = tuple[0];
    var thisIdx = tuple[1];
    var nextIdx = null;
    if (i < tuples.length - 1) {
      var nextTuple = tuples[i + 1];
      nextIdx = nextTuple[1];
    }
    values[token] = response.substring(
      thisIdx + token.length + 1, 
      nextIdx ? nextIdx : response.length); 
  }
  return values;
}

function splitTXTRecord(response) {
  var indexes = {};
  for (var i in TXT_TOKENS) {
    var t = TXT_TOKENS[i];
    indexes[t] = response.indexOf(t + '=');
    if (indexes[t] == -1) {
      return null;
    }
  }
  var tuples = sortTuplesByValues(indexes);
  var values = extractTXTValues(tuples, response);
  return values;
}

exports.discoverAPI = function(req, callback) {
  
  var channel = req.params.channel;
  var remoteDomain = channel.split('@')[1];
  
  if (remoteDomain == config.xmppDomain) {
    if (!config.homeMediaRoot) return callback();
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

