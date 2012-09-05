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

// testutil.js:
// Utility functions for the tests.

var child_process = require('child_process');
var fork = child_process.fork;
var spawn = child_process.spawn;
var http = require('http');
var config = require('../../src/util/config');

var httpserver;
var mockserver;

/**
 * Starts the HTTP API server and calls 'callback' when it is ready.
 */
exports.startHttpServer = function(callback) {
  httpserver = spawn(process.execPath, ['server.js']);

  // Wait until server is ready (and begins printing to stdout)
  httpserver.stdout.on('data', function() {
    if (callback) {
      callback();
      callback = null;
    }
  });

  // Echo the server's error output
  httpserver.stderr.on('data', function(data) {
    console.error(data.toString());
  });
};

/**
 * Starts the XMPP mock server with the passed configuration and calls
 * 'callback' when it is ready. See xmpp_mockserver.js for the config
 * format.
 */
exports.mockXmppServer = function(serverConfig, callback) {
  var options = {env: process.env};
  mockserver = fork('test/support/xmpp_mockserver.js', [], options);
  mockserver.send(serverConfig);

  // Wait until the mock server says it's ready
  mockserver.on('message', function() {
    callback();
  });
}

/**
 * Like http.get(), but with the target host and port automatically filled
 * in from the server configuration.
 */
exports.get = function(options, callback) {
  options.host = 'localhost';
  options.port = config.port;
  return http.get(options, function(response) {
    readBody(response, function(body) {
      callback(response, body);
    });
  });
};

function readBody(response, callback) {
  var chunks = [];
  var size = 0;

  response.on('data', function(data) {
    chunks.push(data);
    size += data.length;
  });

  response.on('end', function() {
    var body = new Buffer(size);
    copyIntoBuffer(body, chunks);
    callback(body);
  });

  response.on('close', function() {
    callback(null);
  });
}

function copyIntoBuffer(buffer, chunks) {
  var offset = 0;
  chunks.forEach(function(chunk) {
    chunk.copy(buffer, offset);
    offset += chunk.length;
  });
}

/**
 * Like http.get(), but with the target host and port automatically filled
 * in from the server configuration.
 */
exports.post = function(options, callback) {
  options.method = 'POST';
  options.host = 'localhost';
  options.port = config.port;

  var req = http.request(options, function(response) {
    readBody(response, function(body) {
      callback(response, body);
    });
  });
  req.write(options.body);
  req.end();
  return req;
};

/**
 * Stops all started serves.
 */
exports.end = function() {
  if (httpserver) { httpserver.kill(); }
  if (mockserver) { mockserver.kill(); }
};

// Make sure the servers are killed on exit
process.on('exit', exports.end);

