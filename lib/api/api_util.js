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

// api_util.js:
// Utility functions used by the resource handlers.

/**
 * Sends an HTTP response code to the client that matches the passed
 * XMPP error stanza.
 */
exports.reportXmppError = function(res, errorStanza) {
    var error = errorStanza.getChild('error');
    if (error) {
        if (error.getChild('not-authorized'))
            res.send(401);
        if (error.getChild('not-allowed'))
            res.send(403);
    }
    res.send(500);
};
