/*
 * Copyright 2012 buddycloud
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

var pubsub = require('./pubsub');
var atom = require('./atom');
var xml = require('libxmljs');

var rsmNs = 'http://jabber.org/protocol/rsm';
var CHANNEL_REGEX = '\\b([\\w\\d][\\w\\d-_%&<>.]+@[\\w\\d-]{3,}\\.[\\w\\d-]{2,}(?:\\.[\\w]{2,6})?)\\b';

exports.toJSON = function(reply, json, user, summary) {
  var items = xml.parseXmlString(reply.toString()).find('/iq/p:pubsub/p:items', {
    p: pubsub.ns
  });
  items.forEach(function(e) {
      var node = e.attr('node').value();
      entries = e.find('p:item/a:entry', {
        p: pubsub.ns,
        a: atom.ns
      });

      if (summary) {
        if (!json[node]) {
          json[node] = {mentionsCount: 0, totalCount: 0, repliesCount: 0, postsThisWeek: []};
        }
        parseSummary(entries, user, json[node]);
      } else {
        json[node] = json[node] || [];

        for (var i in entries) {
          var jsonEntry = atom.toJSON(entries[i]);
          json[node].push(jsonEntry);
        }
      }
  });
  return json;
};

function lastWeekDate() {
  var weekInMillis = 7*(24*60*(60*1000));
  var now = new Date();
  return new Date(now - weekInMillis);
}

function countReplies(posts, replies) {
  var repliesCount = 0;
  for (var i in posts) {
    repliesCount += replies[posts[i]] || 0;
  }
  return repliesCount;
}

function checkMentions(jsonEntry, user) {
  if (jsonEntry.author === user) {
    return 0;
  }
  var content = jsonEntry.content || '';
  var matches = content.match(CHANNEL_REGEX) || [];
  for (var j in matches) {
    if (matches[j] === user) {
      return 1;
    }
  }
  return 0;
}

function parseSummary(entries, user, obj) {
  var lastWeek =  lastWeekDate();
  var userPosts = [];
  var replies = {};
  var lastUpdated;

  for (var i in entries) {
    var jsonEntry = atom.toJSON(entries[i]);
    if (jsonEntry.author != user) {
      obj.totalCount += 1;
    }
    obj.mentionsCount += checkMentions(jsonEntry, user);
    
    var updated = new Date(jsonEntry.updated);
    if (updated > lastWeek) {
      obj.postsThisWeek.push(jsonEntry.updated);
    }

    if (!lastUpdated || updated > lastUpdated) {
      lastUpdated = updated;
    }

    if (jsonEntry.replyTo) {
      if (jsonEntry.author != user) {
        var repliesToThread = replies[jsonEntry.replyTo];
        replies[jsonEntry.replyTo] = repliesToThread ? repliesToThread + 1 : 1;
      }
    } else {
      // Posts from this user
      if (jsonEntry.author === user) {
        userPosts.push(jsonEntry.id);
      }
    }
  }
  
  if (lastUpdated) {
    if (!obj.lastUpdated || lastUpdated > obj.lastUpdated) {
      obj.lastUpdated = lastUpdated;
    }
  }

  obj.repliesCount += countReplies(userPosts, replies);
}

exports.rsmToJSON = function(reply) {
  var rsmSet = xml.parseXmlString(reply.toString()).get('//set:set', {set: rsmNs});
  var rsm = {};

  if (!rsmSet) {
    return rsm;
  }

  var firstNode = rsmSet.get('set:first', {set: rsmNs});
  if (firstNode) {
    rsm['first'] = firstNode.text();
  }
  var lastNode = rsmSet.get('set:last', {set: rsmNs});
  if (lastNode) {
    rsm['last'] = lastNode.text();
  }
  var count = rsmSet.get('set:count', {set: rsmNs});
  if (count) {
    rsm['count'] = count.text();
  }
  return rsm;
};
