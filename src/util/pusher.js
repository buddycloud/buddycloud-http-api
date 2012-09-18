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
var signupNs = 'http://buddycloud.com/pusher/signup'

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
