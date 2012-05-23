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

// atom.js:
// Simplifies working with Atom feeds.

/** The Atom XML namespace. */
exports.ns = 'http://www.w3.org/2005/Atom';

/**
 * Checks if an Atom entry has a <title> element and, if it hasn't,
 * constructs one from the entry's content.
 */
exports.ensureEntryHasTitle = function(entry) {
    var content = entry.get('a:content/text()', {a: exports.ns});
    if (content) {
        var teaser = extractTeaser(content.toString());
        entry.node('title', teaser).namespace(exports.ns);
    }
}

function extractTeaser(content) {
    if (content.length < 40)
        return content;
    else
        return content.slice(0, 39) + '…';
}

