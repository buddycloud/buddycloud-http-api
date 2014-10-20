var proxyquire = require('proxyquire')

require('should')

describe('lockTo', function() {
   
    it('Handles no `lockTo` configuration parameter', function() {
        var config = proxyquire(
            '../../../../src/util/config', 
            {
                '../../config.js.developer-example': {},
                '../../config': {}
            }
        )
        config.lockTo.should.be.false
    })
    
    it('Breaks `lockTo` values down as expected', function() {
        var stub = { '_': { lockTo: 'buddycloud.org,buddycloud.com' } }
        var config = proxyquire(
            '../../../../src/util/config', 
            {
                '../../config.js.developer-example': stub,
                '../../config': stub
            }
        )
        config.lockTo.should.eql([ 'buddycloud.org', 'buddycloud.com' ])
    })
        
    
})