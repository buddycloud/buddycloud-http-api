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

// pusher.js:
// Creates XMPP queries for the pusher component.

var xmpp = require('node-xmpp');
var xml = require('libxmljs');
var signupNs = 'http://buddycloud.com/pusher/signup';
var settingsNs = "http://buddycloud.com/pusher/notification-settings";
var metadataNs = "http://buddycloud.com/pusher/metadata";

// Creates the basic skeleton for all types of Pub-Sub queries.
function iq(attrs, ns) {
  return new xmpp.Iq(attrs).c('query', {xmlns: ns || exports.ns});
}

exports.signup = function(username, email) {
  var queryNode = iq({type: 'set'}, signupNs);
  queryNode.c('jid').t(username);
  queryNode.c('email').t(email);
  return queryNode.root();
};

exports.getSettings = function(type, target) {
  var queryNode = iq({type: 'get'}, settingsNs);
  queryNode.c('type').t(type);
  if (target) {
    queryNode.c('target').t(target);
  }
  return queryNode.root();
};

exports.settingsToJSON = function(reply) {

  var replyEl = xml.parseXmlString(reply.toString());

  var allSettings = replyEl.find('//query:notificationSettings', {query: settingsNs});
  var allSettingsJSON = []
  
  for (var i = 0; i < allSettings.length; i++) {
    var settings = allSettings[i];
    
    var target = settings.get("query:target", {query: settingsNs});
    var postAfterMe = settings.get("query:postAfterMe", {query: settingsNs});
    var postMentionedMe = settings.get("query:postMentionedMe", {query: settingsNs});
    var postOnMyChannel = settings.get("query:postOnMyChannel", {query: settingsNs});
    var postOnSubscribedChannel = settings.get("query:postOnSubscribedChannel", {query: settingsNs});
    var followMyChannel = settings.get("query:followMyChannel", {query: settingsNs});
    var followRequest = settings.get("query:followRequest", {query: settingsNs});
  
    jsonItem = {
      target : target ? target.text() : null,
      postAfterMe : postAfterMe ? postAfterMe.text() : null,
      postMentionedMe : postMentionedMe ? postMentionedMe.text() : null,
      postOnMyChannel : postOnMyChannel ? postOnMyChannel.text() : null,
      postOnSubscribedChannel : postOnSubscribedChannel ? postOnSubscribedChannel.text() : null,
      followMyChannel : followMyChannel ? followMyChannel.text() : null,
      followRequest : followRequest ? followRequest.text() : null
    };
    
    allSettingsJSON.push(jsonItem);
  }
  
  return allSettingsJSON;
}

exports.getMetadata = function(type) {
  var queryNode = iq({type: 'get'}, metadataNs);
  queryNode.c('type').t(type);
  return queryNode.root();
};

exports.metadataToJSON = function(reply) {
  var metadataXml = xml.parseXmlString(reply.toString()).get('//q:query', {q: metadataNs});
  var allNodes = metadataXml.childNodes();
  jsonItem = {};
  
  for (var i = 0; i < allNodes.length; i++) {
    var prop = allNodes[i].name();
    var value = allNodes[i].text();
    jsonItem[prop] = value;
  }
  
  return jsonItem;
}

exports.updateSettings = function(settings) {
  var queryNode = iq({type: 'set'}, settingsNs);
  var settingsNode = queryNode.c('notificationSettings');
  setEl('type', settings.type, settingsNode);
  setEl('target', settings.target, settingsNode);
  setEl('postAfterMe', settings.postAfterMe, settingsNode);
  setEl('postMentionedMe', settings.postMentionedMe, settingsNode);
  setEl('postOnMyChannel', settings.postOnMyChannel, settingsNode);
  setEl('postOnSubscribedChannel', settings.postOnSubscribedChannel, settingsNode);
  setEl('followMyChannel', settings.followMyChannel, settingsNode);
  setEl('followRequest', settings.followRequest, settingsNode);
  return queryNode.root();
};

function setEl(key, value, root) {
  if (value) {
    root.c(key).t(value);
  }
}
