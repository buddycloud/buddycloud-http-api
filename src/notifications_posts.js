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
var grip = require('./util/grip');

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
  var entries = nextItems(itemCache, req.query.since);
  sendResponse(req, res, entries, lastTimestamp);
}

function pause(req, res, lastTimestamp) {
  var ctx = {
    req : req,
    res : res
  };

  var connectionTimeout = config.pollTimeout ? config.pollTimeout : 55;

  setTimeout(function() {
    ctx.req = null;
    ctx.res = null;
    req.resume()
    sendResponse(req, res, [], lastTimestamp);
    console.log('Request from ' + req.session.getFullJID() + ' timeout');
  }, connectionTimeout * 1000);

  // Pause request
  req.pause();
  console.log('Request from ' + req.session.getFullJID() + ' paused');

  // Session holds the request
  req.session.holdRequest(ctx, notify);
}

function nextItems(itemCache, since) {
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
  if (entries.length > 0) {
    var sourceEl = entries[0].getChild('source');
    var idEl = sourceEl.getChild('id');
  
    // /user/:channel/:node
    var nodeIdSplit = idEl.text().split('/');
    var channel = nodeIdSplit[2];
    var node = nodeIdSplit[3];

    // Send response
    var feed = api.generateNodeFeedFromEntries(channel, node, config.channelDomain, entries);
    api.sendAtomResponse(req, res, feed.root(), 200, '' + lastTimestamp);
  } else {
    // send empty response
    var response = {};
    response['last'] = '' + lastTimestamp;
    response['items'] = [];
    res.send(response);
  }
}

function listenForNextItem(req, res, next) {
  // Repeated calls are okay, as it is only ever sent once. Note though,
  // that we never send offline presence to undo any of this
  req.session.sendPresenceOnline();

  // make sure since is a non-negative int
  var since = req.query.since;
  if (since != null) {
    since = parseInt(since);
    if (isNaN(since) || since < 0) {
      since = null;
    }
  }

  if (since != null) {
    var lastItem = null;
    var cacheSize = req.session.itemCache.length;
    if (cacheSize > 0) {
      var lastItem = req.session.itemCache[cacheSize - 1];

      if (since < lastItem.timestamp) {
        var entries = nextItems(req.session.itemCache, since);
        sendResponse(req, res, entries, lastItem.timestamp);
        return;
      }
    }

    var lastTimestamp = (lastItem != null ? lastItem.timestamp : since);

    if (req.gripProxied) {
      // respond with instructions to the proxy
      var gripChannel = grip.encodeChannel('np-' + req.session.jid);
      var prevId = (lastItem != null ? lastItem.timestamp : null);
      api.sendHoldResponse(req, res, gripChannel, prevId, lastTimestamp);
    } else {
      // Pause request
      pause(req, res, lastTimestamp);
    }
  } else {
    // immediately send response with current time
    sendResponse(req, res, [], new Date().getTime());
  }
}
