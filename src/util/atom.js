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
 * Like libxmljs.Element.get(), but automatically binds the 'atom:'
 * prefix to the Atom namespace.
 */
exports.get = function(element, query, namespaces) {
    if (!namespaces)
        namespaces = {};
    namespaces.atom = exports.ns;
    return element.get(query, namespaces);
};

/**
 * Checks if an Atom entry has a <title> element and, if it hasn't,
 * constructs one from the entry's content.
 */
exports.ensureEntryHasTitle = function(entry) {
    var content = exports.get(entry, 'atom:content/text()');
    if (content) {
        var teaser = extractTeaser(content.toString());
        entry.node('title', teaser).namespace(exports.ns);
    }
};

function extractTeaser(content) {
    if (content.length < 40)
        return content;
    else
        return content.slice(0, 39) + '…';
}

/**
 * Serializes an Atom <feed/> or <entry/> element to a JSON form which
 * contains the most important entry attributes.
 */
exports.toJSON = function(element) {
    if (element.name() == 'feed') {
        return feedToJSON(element);
    } else {
        return entryToJSON(element);
    }
};

function feedToJSON(feed) {
    var json = [];

    var entries = feed.find('a:entry', {a: exports.ns});
    entries.forEach(function(e) {
        json.push(entryToJSON(e));
    });

    return json;
}

function entryToJSON(entry) {
    var id = exports.get(entry, 'atom:id');
    var author = exports.get(entry, 'atom:author');
    var authorName = author ? exports.get(author, 'atom:name') : author;
    var updated = exports.get(entry, 'atom:updated');
    var content = exports.get(entry, 'atom:content');

    return {
        id: id ? id.text() : null,
        author: authorName ? authorName.text() : (author ? author.text() : null),
        updated: updated ? updated.text() : null,
        content: content ? content.text() : null,
    };
}