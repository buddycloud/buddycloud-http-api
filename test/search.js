/*
 * Copyright 2014 Abmar Barros <abmar@buddycloud.com>
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

// test/search.js:
// Tests requests related to the search endpoint.

var should = require('should');
var tutil = require('./support/testutil');

var mockConfig = {
  users: {
    'alice': 'alice'
  },
  stanzas: {
    // Search for metadata 
    '<iq type="get">\
       <query xmlns="http://buddycloud.com/channel_directory/metadata_query">\
         <search>query</search>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/channel_directory/metadata_query">\
         <item jid="jid" description="desc" created="created">\
           <title>title</title>\
           <default_affiliation>affiliation</default_affiliation>\
           <channel_type>channel_type</channel_type>\
         </item>\
         <set xmlns="http://jabber.org/protocol/rsm"><count>1</count></set>\
       </query>\
     </iq>',
     
    // Search for metadata with max and index 
    '<iq type="get">\
       <query xmlns="http://buddycloud.com/channel_directory/metadata_query">\
         <search>query</search>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <max>1</max>\
           <index>1</index>\
         </set>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/channel_directory/metadata_query">\
         <item jid="jid" description="desc" created="created">\
           <title>title</title>\
           <default_affiliation>affiliation</default_affiliation>\
           <channel_type>channel_type</channel_type>\
         </item>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <first index="1" />\
           <count>2</count>\
         </set>\
       </query>\
     </iq>',
    
    // Search for metadata with missing fields 
    '<iq type="get">\
       <query xmlns="http://buddycloud.com/channel_directory/metadata_query">\
         <search>query-missing</search>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/channel_directory/metadata_query">\
         <item jid="jid" created="created">\
           <default_affiliation>affiliation</default_affiliation>\
           <channel_type>channel_type</channel_type>\
         </item>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <count>1</count>\
         </set>\
       </query>\
     </iq>',
     
    // Search for content with no rsm 
    '<iq type="get">\
       <query xmlns="http://buddycloud.com/channel_directory/content_query">\
         <search>query</search>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/channel_directory/content_query">\
         <item id="id123">\
           <entry>\
             <author>author</author>\
             <content>content</content>\
             <updated>updated</updated>\
             <published>published</published>\
             <parent_fullid>fullid</parent_fullid>\
             <parent_simpleid>simpleid</parent_simpleid>\
             <in-reply-to xmlns="http://purl.org/syndication/thread/1.0" ref="thrId" />\
           </entry>\
         </item>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <count>1</count>\
         </set>\
       </query>\
     </iq>',
     
     // Search for content with rsm 
    '<iq type="get">\
       <query xmlns="http://buddycloud.com/channel_directory/content_query">\
         <search>query</search>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <max>1</max>\
           <index>1</index>\
         </set>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/channel_directory/content_query">\
         <item id="id123">\
           <entry>\
             <author>author</author>\
             <content>content</content>\
             <updated>updated</updated>\
             <published>published</published>\
             <parent_fullid>fullid</parent_fullid>\
             <parent_simpleid>simpleid</parent_simpleid>\
             <in-reply-to xmlns="http://purl.org/syndication/thread/1.0" ref="thrId" />\
           </entry>\
         </item>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <first index="1" />\
           <count>2</count>\
         </set>\
       </query>\
     </iq>',
  }
};

describe('Search by metadata and content', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should not allow searching without type', function(done) {
      var options = {
        path: '/search?q=q',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(400);
        done();
      }).on('error', done);
    });

    it('should not allow searching without query', function(done) {
      var options = {
        path: '/search?type=type',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(400);
        done();
      }).on('error', done);
    });
    
    it('should return a single metadata result', function(done) {
      var options = {
        path: '/search?type=metadata&q=query',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var channels = JSON.parse(body);
        channels.should.eql({'items': [{
          'jid': 'jid',
          'title': 'title',
          'description': 'desc',
          'creationDate': 'created',
          'channelType': 'channel_type',
          'defaultAffiliation': 'affiliation'
          }], 
          'rsm': {'count': 1, 'index': 0}
        });
        done();
      }).on('error', done);
    });
    
    it('should return a paged metadata result', function(done) {
      var options = {
        path: '/search?type=metadata&q=query&max=1&index=1',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var channels = JSON.parse(body);
        channels.should.eql({'items': [{
          'jid': 'jid',
          'title': 'title',
          'description': 'desc',
          'creationDate': 'created',
          'channelType': 'channel_type',
          'defaultAffiliation': 'affiliation'
          }], 
          'rsm': {'count': 2, 'index': 1}
        });
        done();
      }).on('error', done);
    });
    
    it('should return a metadata result with missing fields', function(done) {
      var options = {
        path: '/search?type=metadata&q=query-missing',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var channels = JSON.parse(body);
        channels.should.eql({'items': [{
          'jid': 'jid',
          'title': null,
          'creationDate': 'created',
          'channelType': 'channel_type',
          'defaultAffiliation': 'affiliation'
          }], 
          'rsm': {'count': 1, 'index': 0}
        });
        done();
      }).on('error', done);
    });
    
    it('should return a single content result', function(done) {
      var options = {
        path: '/search?type=content&q=query',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var items = JSON.parse(body);
        items.should.eql({'items': [{
          'id': 'id123',
          'author': 'author',
          'content': 'content',
          'updated': 'updated',
          'published': 'published',
          'parent_fullid': 'fullid',
          'parent_simpleid': 'simpleid',
          'in_reply_to': 'thrId'
          }], 
          'rsm': {'count': 1, 'index': 0}
        });
        done();
      }).on('error', done);
    });

    it('should return a paged content result', function(done) {
      var options = {
        path: '/search?type=content&q=query&max=1&index=1',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var items = JSON.parse(body);
        items.should.eql({'items': [{
          'id': 'id123',
          'author': 'author',
          'content': 'content',
          'updated': 'updated',
          'published': 'published',
          'parent_fullid': 'fullid',
          'parent_simpleid': 'simpleid',
          'in_reply_to': 'thrId'
          }], 
          'rsm': {'count': 2, 'index': 1}
        });
        done();
      }).on('error', done);
    });

  });

  after(function() {
    tutil.end();
  });

});