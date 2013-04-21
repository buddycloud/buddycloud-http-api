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

function listenForNextItem(req, res, next) {
  if (!req.gripProxied) {
    api.sendGripUnsupported(res);
    return;
  }

  var gripChannel = grip.encodeChannel('np-' + req.session.jid);

  if (req.query.since != null) {
    var since = req.query.since;
    if (since) {
      var at = since.indexOf(':');
      if (at == -1 || since.substring(0, at) != "cursor") {
        res.send('Error: Invalid since value\n', 400);
        return;
      }

      var cur = parseInt(since.substring(at + 1));
      if (isNaN(cur)) {
        res.send('Error: Invalid cursor value\n', 400);
        return;
      }

      var last = req.session.itemCache.length;
      if (cur < last) {
        var entries = [];
        for (var n = cur; n < last; ++n) {
          entries.push(req.session.itemCache[n]);
        }

        var nodeId = entries[0].get('a:source/a:id', {a: atom.ns}).text();
        var at = nodeId.indexOf('/user/');
        var channelAndNode = nodeId.substring(at + 6);
        at = channelAndNode.indexOf('/');
        var channel = channelAndNode.substring(0, at);
        var node = channelAndNode.substring(at + 1);

        var feed = api.generateNodeFeedFromEntries(channel, node, config.channelDomain, entries);
        api.sendAtomResponse(req, res, feed.root(), 200, '' + last);
      } else {
        api.sendHoldResponse(req, res, gripChannel, '' + last);
      }
    } else {
      // if no cursor specified, then bootstrap with an empty response and cursor header
      out = {};
      out["last_cursor"] = '' + req.session.itemCache.length;
      out["items"] = [];
      res.send(out);
    }
  } else {
    // if no since parameter at all, then hold
    api.sendHoldResponse(req, res, gripChannel, '' + req.session.itemCache.length);
  }
}
