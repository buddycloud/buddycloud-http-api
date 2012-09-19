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
var signupNs = 'http://buddycloud.com/pusher/signup';
var settingsNs = "http://buddycloud.com/pusher/notification-settings";

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

exports.getSettings = function() {
  var queryNode = iq({type: 'get'}, settingsNs);
  return queryNode.root();
};

exports.settingsToJSON = function(reply) {
  var settings = xml.parseXmlString(reply.toString()).get('//query:notificationSettings', {query: settingsNs});
  var email = settings.get("query:email", {query: settingsNs});
  var postAfterMe = settings.get("query:postAfterMe", {query: settingsNs});
  var postMentionedMe = settings.get("query:postMentionedMe", {query: settingsNs});
  var postOnMyChannel = settings.get("query:postOnMyChannel", {query: settingsNs});
  var postOnSubscribedChannel = settings.get("query:postOnSubscribedChannel", {query: settingsNs});
  var followMyChannel = settings.get("query:followMyChannel", {query: settingsNs});
  var followRequest = settings.get("query:followRequest", {query: settingsNs});
  
  jsonItem = {
    email : email ? email.text() : null,
    postAfterMe : postAfterMe ? postAfterMe.text() : null,
    postMentionedMe : postMentionedMe ? postMentionedMe.text() : null,
    postOnMyChannel : postOnMyChannel ? postOnMyChannel.text() : null,
    postOnSubscribedChannel : postOnSubscribedChannel ? postOnSubscribedChannel.text() : null,
    followMyChannel : followMyChannel ? followMyChannel.text() : null,
    followRequest : followRequest ? followRequest.text() : null
  };
  
  return jsonItem;
}

exports.updateSettings = function(settings) {
  var queryNode = iq({type: 'set'}, settingsNs);
  var settingsNode = queryNode.c('notificationSettings');
  setEl('email', settings.email, settingsNode);
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
