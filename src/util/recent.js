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
          json[node] = {mentionsCount: 0, totalCount: 0};
        }
        parseAndUpdateSummary(entries, user, json[node]);
      } else {
        json[node] = json[node] || [];

        entries.forEach(function(entry) {
          var jsonEntry = atom.toJSON(entry)
          json[node].push(jsonEntry)
        })
      }
  });
  return json;
};

function checkMention(jsonEntry, user) {
  if (jsonEntry.author === user) {
    return 0;
  }

  var content = jsonEntry.content || ''
  var matches = content.match(CHANNEL_REGEX) || []

  for (var i in matches) {
    if (user === matches[i]) {
      return true
    }
  }

  return false
}

function parseAndUpdateSummary(entries, user, summary) {
  var lastMention
    , lastPost

  entries.forEach(function(entry) {
    var jsonEntry = atom.toJSON(entry)
    if (jsonEntry.author !== user) {
      summary.totalCount += 1
    }

    var updated = new Date(jsonEntry.updated)
    if (!lastPost || updated > lastPost) {
      lastPost = updated
    }

    if (checkMention(jsonEntry, user)) {
      summary.mentionsCount += 1
      if (!lastMention || updated > lastMention) {
        lastMention = updated
      }
    }
  })

  if (lastMention) {
    if (!summary.lastMention || lastMention > summary.lastMention) {
      summary.lastMention = lastMention
    }
  }

  if (lastPost) {
    if (!summary.lastPost || lastPost > summary.lastPost) {
      summary.lastPost = lastPost
    }
  }  
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
