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

exports.toJSON = function(reply, json, counters) {
  var items = xml.parseXmlString(reply.toString()).find('/iq/p:pubsub/p:items', {
    p: pubsub.ns
  });
  items.forEach(function(e) {
      var node = e.attr('node').value();
      entries = e.find('p:item/a:entry', {
        p: pubsub.ns,
        a: atom.ns
      });
      for (var i = 0; i < entries.length; i++) { 
        var entry = entries[i];
        if (!json[node]) {
          if (counters) {
            json[node] = 0;
          } else {
            json[node] = [];
          }
        }
        if (counters) {
          json[node] += 1;
        } else {
          json[node].push(atom.toJSON(entry));
        }
      }
  });
  return json;
};

exports.rsmToJSON = function(reply) {
  var rsmSet = xml.parseXmlString(reply.toString()).get('//set:set', {set: rsmNs});
  var rsm = {};
  
  var firstNode = rsmSet.get('set:first', {set: rsmNs});
  if (firstNode) {
    rsm['first'] = firstNode.text();
  }
  var lastNode = rsmSet.get('set:last', {set: rsmNs});
  if (lastNode) {
    rsm['last'] = lastNode.text();
  }
  
  var count = rsmSet.get('set:count', {set: rsmNs}).text();
  rsm['count'] = count;
  return rsm;
}