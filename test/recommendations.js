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

// test/recommendations.js:
// Tests requests related to the recommendation endpoint.

var should = require('should');
var tutil = require('./support/testutil');

var mockConfig = {
  users: {
    'alice': 'alice'
  },
  stanzas: {
    // Search for metadata 
    '<iq type="get">\
       <query xmlns="http://buddycloud.com/channel_directory/recommendation_query">\
         <user-jid>alice@localhost</user-jid>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/channel_directory/recommendation_query">\
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
       <query xmlns="http://buddycloud.com/channel_directory/recommendation_query">\
         <user-jid>alice@localhost</user-jid>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <max>1</max>\
           <index>1</index>\
         </set>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/channel_directory/recommendation_query">\
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
     
     // Search for metadata with no results 
    '<iq type="get">\
       <query xmlns="http://buddycloud.com/channel_directory/recommendation_query">\
         <user-jid>alice-no-similar@localhost</user-jid>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/channel_directory/recommendation_query">\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <count>0</count>\
         </set>\
       </query>\
     </iq>',
     
  }
};

describe('Get recommended channels', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should return a single recommended channel', function(done) {
      var options = {
        path: '/recommendations?user=alice@localhost',
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
    
    it('should return a paged recommended channel', function(done) {
      var options = {
        path: '/recommendations?user=alice@localhost&max=1&index=1',
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
    
    it('should return no recommended channels', function(done) {
      var options = {
        path: '/recommendations?user=alice-no-similar@localhost',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var channels = JSON.parse(body);
        channels.should.eql({
          'items': [], 
          'rsm': {'count': 0, 'index': 0}
        });
        done();
      }).on('error', done);
    });
    
  });

  after(function() {
    tutil.end();
  });

});