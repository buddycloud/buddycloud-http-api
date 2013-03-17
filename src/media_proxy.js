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

// media.js:
// Handles requests for communicationg with buddycloud media servers
// (/<channel>/media, /<channel>/media/<file>).

var http = require('http');
var https = require('https');
var url = require('url');
var config = require('./util/config');

var PROXY_PREFIX = '/media_proxy';

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/media_proxy/:channel',
           proxyToMediaServer);
  app.get('/media_proxy/:channel/:id',
           proxyToMediaServer);
  app.put('/media_proxy/:channel/:id',
           proxyToMediaServer);
};

function proxyToMediaServer(req, res, next) {
  forwardRequest(req, res);
}

function forwardRequest(req, res) {
  originUrl = url.parse(req.url);
  destUrl = url.parse(config.homeMediaRoot);
  
  req.headers['host'] = destUrl.host;
  var request = (destUrl.protocol == 'https:') ? https.request : http.request;
  
  var mediaReq = request({
    host: destUrl.hostname,
    port: destUrl.port,
    method: req.method,
    path: originUrl.path.slice(PROXY_PREFIX.length),
    headers: req.headers,
  }, function(mediaRes) {
      res.writeHead(mediaRes.statusCode, mediaRes.headers);
      mediaRes.on('data', function(data) {
        res.write(data);
      });
      mediaRes.on('end', function(data) {
        res.end();
      });
      mediaRes.on('close', function(data) {
        res.send(500);
      });
  });
  mediaReq.on('error', function(err) {
    res.send(err, 500);
  });
  if (req.body) {
    mediaReq.write(req.body);
  }
  mediaReq.end();
}
