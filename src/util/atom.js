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

var ltx = require('ltx');

/** The Atom XML namespace. */
exports.ns = 'http://www.w3.org/2005/Atom';
exports.threadNS = 'http://purl.org/syndication/thread/1.0';

/**
 * Like libxmljs.Element.get(), but automatically binds the 'atom:'
 * prefix to the Atom namespace.
 */
exports.get = function(element, query) {
  if (!element) {
    return null;
  }
  return element.getChild(query, exports.ns);
};

exports.normalizeEntry = function(entry) {
  ensureEntryHasTitle(entry);
  ensureEntryHasAuthorName(entry);
};

function ensureEntryHasTitle(entry) {
  var contentEl = exports.get(entry, 'content');
  var titleEl = exports.get(entry, 'title');
  if (contentEl && !titleEl) {
    var teaser = extractTeaser(contentEl.text());
    entry.c('title').t(teaser);
  }
}

function extractTeaser(content) {
  if (content.length < 40) {
    return content;
  } else {
    return content.slice(0, 39) + '…';
  }
}

function ensureEntryHasAuthorName(entry) {
  var author = exports.get(entry, 'author');
  var authorName = author ? author.getChild('name') : null;
  if (author && !authorName) {
    var name;
    var uriEl = author.getChild('uri');
    var uri = uriEl.text();
    if (uri.indexOf('acct:') === 0) {
      name = uri.split(':', 2)[1];
    } else {
      name = uri;
    }
    author.c('name').t(name);
  }
}

/**
 * Serializes an Atom <feed/> or <entry/> element to a JSON form which
 * contains the most important entry attributes.
 */
exports.toJSON = function(element) {
  if (element.getName() == 'feed') {
    return feedToJSON(element);
  } else {
    return entryToJSON(element);
  }
};

function feedToJSON(feed) {
  var json = [];
  
  var entries = feed.getChildrenByFilter(function (c) {
    return typeof c != 'string' && 
      c.getName() == 'entry' && c.getNS() == exports.ns; 
  }, true);
  entries.forEach(function(e) {
    json.push(entryToJSON(e));
  });

  return json;
}

function entryToJSON(entry) {
  var id = exports.get(entry, 'id');
  var sourceEl = exports.get(entry, 'source');
  var sourceId = sourceEl ? sourceEl.getChild('id') : sourceEl;
  var author = exports.get(entry, 'author');
  var authorName = author ? author.getChild('name') : author;
  var published = exports.get(entry, 'published');
  var updated = exports.get(entry, 'updated');
  var content = exports.get(entry, 'content');

  // Workaround to handle entries result from post and get
  var media = structuredFieldToJSON(entry.getChild('media') || exports.get(entry, 'media'),
    function(item) {
      var id = item.attr('id');
      var channel = item.attr('channel');
      return {id: id, channel: channel};
    }
  );
  var replyTo = entry.getChild(
    'in-reply-to',
    'http://purl.org/syndication/thread/1.0'
  );

  var localId = null;
  if (id) {
    var idSplitted = id.text().split(',');
    localId = idSplitted[idSplitted.length - 1];
  }

  return {
    id: localId,
    source: sourceId ? sourceId.text().match(/node=\/user\/(.*)$/)[1] : undefined,
    author: authorName ? authorName.text() : (author ? author.text() : null),
    published: published ? published.text() : null,
    updated: updated ? updated.text() : null,
    content: content ? content.text() : null,
    media: media.length > 0 ? media : null,
    replyTo: replyTo ? replyTo.attr('ref') : undefined
  };
}

function structuredFieldToJSON(field, parser) {
  var json = [];
  if (field) {
    var items = field.getChildrenByFilter(function (c) {
      return typeof c != 'string' 
    });
    
    items.forEach(function(i) {
      json.push(parser(i));
    });
  }

  return json;
}

/**
 * Converts an JSON-serialized Atom entry into an Atom XML document.
 */
exports.fromJSON = function(entry) {
  var entrydoc = new ltx.Element('entry', {xmlns: exports.ns})

  if (entry.id) {
    entrydoc.c('id').t(escapeText(entry.id));
  }

  if (entry.title) {
    entrydoc.c('title').t(escapeText(entry.id));
  }

  if (entry.author) {
    entrydoc.c('author').t(escapeText(entry.author));
  }

  var content = '';
  if (entry.content) {
    content = entry.content;
  }
  entrydoc.c('content').t(content);

  if (entry.replyTo) {
    entrydoc.c('in-reply-to', 
      {xmlns: exports.threadNS, ref: entry.replyTo});
  }

  if (entry.media) {
    var media = entrydoc.c('media');
    for (var m in entry.media) {
      media.c('item', 
        {id: entry.media[m].id, channel: entry.media[m].channel});
    }
  }

  return entrydoc;
};

function escapeText(text) {
  return text.replace('&', '&amp;');
}