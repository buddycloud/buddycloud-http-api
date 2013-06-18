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

var xml = require('libxmljs');

/** The Atom XML namespace. */
exports.ns = 'http://www.w3.org/2005/Atom';
exports.threadNS = 'http://purl.org/syndication/thread/1.0';

/**
 * Like libxmljs.Element.get(), but automatically binds the 'atom:'
 * prefix to the Atom namespace.
 */
exports.get = function(element, query, namespaces) {
  if (!namespaces) {
    namespaces = {};
  }
  namespaces.atom = exports.ns;
  return element.get(query, namespaces);
};

exports.normalizeEntry = function(entry) {
  ensureEntryHasTitle(entry);
  ensureEntryHasAuthorName(entry);
};

function ensureEntryHasTitle(entry) {
  var content = exports.get(entry, 'atom:content/text()');
  var title = exports.get(entry, 'atom:title');
  if (content && !title) {
    var teaser = extractTeaser(content.toString());
    entry.node('title', teaser).namespace(exports.ns);
  }
};

function extractTeaser(content) {
  if (content.length < 40) {
    return content;
  } else {
    return content.slice(0, 39) + '…';
  }
}

function ensureEntryHasAuthorName(entry) {
  var author = exports.get(entry, 'atom:author');
  var authorName = exports.get(entry, 'atom:author/atom:name');
  if (author && !authorName) {
    var name;
    if (author.text().indexOf('acct:') == 0) {
      name = author.text().split(':', 2)[1];
    } else {
      name = author.text();
    }
    author.node('name', name).namespace(exports.ns);
  }
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
  var sourceId = exports.get(entry, 'atom:source/atom:id');
  var author = exports.get(entry, 'atom:author');
  var authorName = author ? exports.get(author, 'atom:name') : author;
  var published = exports.get(entry, 'atom:published');
  var updated = exports.get(entry, 'atom:updated');
  var content = exports.get(entry, 'atom:content');
  var mediaId = exports.get(entry, 'atom:media-id');
  var replyTo = entry.get(
    't:in-reply-to',
    {t: 'http://purl.org/syndication/thread/1.0'}
  );

  return {
    id: id ? id.text() : null,
    source: sourceId ? sourceId.text().match(/node=\/user\/(.*)$/)[1] : undefined,
    author: authorName ? authorName.text() : (author ? author.text() : null),
    published: published ? published.text() : null,
    updated: updated ? updated.text() : null,
    content: content ? content.text() : null,
    mediaId: mediaId ? mediaId.text() : null,
    replyTo: replyTo ? replyTo.attr('ref').value() : undefined
  };
}

/**
 * Converts an JSON-serialized Atom entry into an Atom XML document.
 */
exports.fromJSON = function(entry) {
  var entrydoc = xml.Document();
  entrydoc.node('entry').namespace(exports.ns);

  if (entry.id) {
    entrydoc.root().
      node('id', escapeText(entry.id)).
      namespace(exports.ns);
  }

  if (entry.title) {
    entrydoc.root().
      node('title', escapeText(entry.id)).
      namespace(exports.ns);
  }

  if (entry.author) {
    entrydoc.root().
      node('author', escapeText(entry.author)).
      namespace(exports.ns);
  }

  if (entry.content) {
    entrydoc.root().
      node('content', escapeText(entry.content)).
      namespace(exports.ns);
  }

  if (entry.replyTo) {
    entrydoc.root().
      node('in-reply-to').
      attr('ref', entry.replyTo).
      namespace(exports.threadNS);
  }

  if (entry.mediaId) {
    entrydoc.root().
      node('media-id', escapeText(entry.mediaId)).
      namespace(exports.ns);
  }

  return entrydoc;
};

function escapeText(text) {
  return text.replace('&', '&amp;');
}
