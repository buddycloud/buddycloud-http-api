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

// notifications_posts.js:
// Resource to long-poll for future posts.

var api = require('./util/api');
var atom = require('./util/atom');
var config = require('./util/config');
var pubsub = require('./util/pubsub');
var session = require('./util/session');
var logger = require('./util/log');

exports.setup = function(app) {
  app.get('/notifications/posts',
          session.provider,
          listenForNextItem);
};

function notify(req, res) {
  // Resume request
  req.resume();
  var itemCache = req.session.itemCache;
  var lastTimestamp = itemCache[itemCache.length - 1].timestamp;
  var entries = nextItems(itemCache, req.query.since, lastTimestamp);
  sendResponse(req, res, entries, lastTimestamp);
}

function pause(req, res) {
  var ctx = {
    req : req,
    res : res
  };

  // TODO: get connectionTimeout from config file
  var connectionTimeout = 60;
  req.connection.setTimeout(connectionTimeout * 1000);
  req.connection.on('timeout', function() {
    ctx.req = null;
    ctx.res = null;
    logger.debug('Request from ' + req.session.getFullJID() + ' timeout');
  });

  // Pause request
  req.pause();
  logger.debug('Request from ' + req.session.getFullJID() + ' paused');

  // Session holds the request
  req.session.holdRequest(ctx, notify);
}

function nextItems(itemCache, since, lastTimestamp) {
  var entries = [];
  var cacheSize = itemCache.length;

  var i = cacheSize - 1;
  while (i >= 0 && itemCache[i].timestamp > since) {
    i--;
  }

  for (var j = i + 1; j < cacheSize; j++) {
    entries.push(itemCache[j].item);
  }

  return entries;
}

function sendResponse(req, res, entries, lastTimestamp) {
  var sourceEl = entries[0].getChild('source');
  var idEl = sourceEl.getChild('id');
  
  // /user/:channel/:node
  var nodeIdSplit = idEl.text().split('/');
  var channel = nodeIdSplit[2];
  var node = nodeIdSplit[3];

  // Send response
  var feed = api.generateNodeFeedFromEntries(channel, node, config.channelDomain, entries);
  api.sendAtomResponse(req, res, feed.root(), 200, lastTimestamp + '');
}

function listenForNextItem(req, res, next) {
  // Repeated calls are okay, as it is only ever sent once. Note though,
  // that we never send offline presence to undo any of this
  req.session.sendPresenceOnline();
  var since = req.query.since;
  
  if (since) {
    var cacheSize = req.session.itemCache.length;
    if (cacheSize > 0) {
      var lastTimestamp = req.session.itemCache[cacheSize - 1].timestamp;

      if (since < lastTimestamp) {
        var entries = nextItems(req.session.itemCache, since, lastTimestamp);
        sendResponse(req, res, entries, lastTimestamp);
        return;
      }
    }
    
    // Pause request
    pause(req, res);
  } else {
    sendUpdateResponse(req, res);
  }
}

function sendUpdateResponse(req, res) {
  response = {};

  var itemCache = req.session.itemCache;
  var lastTimestamp = itemCache.length > 0 ?
    itemCache[itemCache.length - 1].timestamp : new Date().getTime();

  response['last'] = lastTimestamp;
  response['items'] = [];

  res.send(response);
}
