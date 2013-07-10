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

exports.toJSON = function(reply, json, user, counters) {
  var items = xml.parseXmlString(reply.toString()).find('/iq/p:pubsub/p:items', {
    p: pubsub.ns
  });
  items.forEach(function(e) {
      var node = e.attr('node').value();
      entries = e.find('p:item/a:entry', {
        p: pubsub.ns,
        a: atom.ns
      });
      if (!json[node]) {
        if (counters) {
          json[node] = {mentionsCount: 0, totalCount: 0};
        } else {
          json[node] = [];
        }
      }
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var jsonEntry = atom.toJSON(entry);
        if (counters) {
          var content = jsonEntry.content || '';
          var matches = content.match(CHANNEL_REGEX) || [];
          for (var j = 0; j < matches.length; j++) {
            if (matches[j] === user) {
              json[node].mentionsCount += 1;
              break;
            }
          }

          json[node].totalCount += 1;
        } else {
          json[node].push(jsonEntry);
        }
      }
  });
  return json;
};

exports.rsmToJSON = function(reply) {
  var rsmSet = xml.parseXmlString(reply.toString()).get('//set:set', {set: rsmNs})
  var rsm = {}

  if (!rsmSet) return rsm

  var firstNode = rsmSet.get('set:first', {set: rsmNs})
  if (firstNode) {
    rsm['first'] = firstNode.text()
  }
  var lastNode = rsmSet.get('set:last', {set: rsmNs})
  if (lastNode) {
    rsm['last'] = lastNode.text()
  }
  var count = rsmSet.get('set:count', {set: rsmNs})
  if (count) rsm['count'] = count.text()
  return rsm
}
