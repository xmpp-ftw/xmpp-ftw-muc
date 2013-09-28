var should        = require('should')
  , MultiUserChat = require('../../lib/multi-user-chat')
  , helper        = require('../helper')
  , dataForm      = require('xmpp-ftw/lib/utils/xep-0004')

describe('MUC Rooms', function() {

    var muc, socket, xmpp, manager

    before(function() {
        socket = new helper.Eventer()
        xmpp = new helper.Eventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            }
        }
        muc = new MultiUserChat()
        muc.init(manager)
    })
    
    describe('Destroy a room', function() {
        
        it('Errors when no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing callback")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.muc.destroy', {})
        })

        it('Errors when non-function callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing callback")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.muc.destroy', {}, true)
        })

        it('Errors if \'room\' key missing', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing 'room' key")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit('xmpp.muc.destroy', {}, callback)
        })
        
        it('Sends expected stanza', function(done) {
            var room = 'fire@coven.witches.lit'
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.type.should.equal('set')
                stanza.attrs.id.should.exist
                stanza.attrs.to.should.equal(room)
                var query = stanza.getChild('query', muc.NS_OWNER)
                query.should.exist
                query.getChild('destroy').should.exist
                done()
            })
            socket.emit(
                'xmpp.muc.destroy',
                { room: room },
                function() {}
            )
        })
        
        it('Sends expected stanza with reason/alternative', function(done) {
            var request = {
                room: 'fire@coven.witches.lit',
                reason: 'Fire has gone out',
                alternative: 'kettle@coven.witches.lit'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.type.should.equal('set')
                stanza.attrs.id.should.exist
                stanza.attrs.to.should.equal(request.room)
                var query = stanza.getChild('query', muc.NS_OWNER)
                query.should.exist
                query.getChild('destroy').attrs.jid
                    .should.equal(request.alternative)
                query.getChildText('destroy').should.equal(request.reason)
                done()
            })
            socket.emit(
                'xmpp.muc.destroy',
                request,
                function() {}
            )
        })

        it('Handles error response stanza', function(done) {
            var room = 'fire@coven.witches.lit'
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('iq-error'))
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.should.eql({
                    type: 'cancel',
                    condition: 'error-condition'
                })
                done()
            }
            socket.emit(
                'xmpp.muc.destroy',
                { room: room },
                callback
            )
        })
        
        it('Handles success response', function(done) {
            var room = 'fire@coven.witches.lit'
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('iq-result'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.should.be.true
                done()
            }
            socket.emit(
                'xmpp.muc.destroy',
                { room: room },
                callback
            )
        })
        
    })
    
    describe.only('Create a room', function() {
        
        it('Errors when no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing callback")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.muc.create', {})
        })

        it('Errors when non-function callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing callback")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.muc.create', {}, true)
        })
        

        it('Errors if \'room\' key missing', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing 'room' key")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.emit('xmpp.muc.create', {}, callback)
        })
        
        it('Errors if \'form\' provided and not valid', function(done) {
            done('Not implemented yet')
        })
        
        it('Sends expected stanza', function(done) {
            var request = { room: 'fire@coven.witches.lit' }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.id.should.exist
                stanza.attrs.type.should.equal('set')
                stanza.attrs.to.should.equal(request.room)
                var x = stanza
                    .getChild('query', muc.NS_OWNER)
                    .getChild('x', dataForm.NS)
                x.should.exist
                x.attrs.type.should.equal('submit')
                x.children.length.should.equal(0)
                done()
            })
            socket.emit('xmpp.muc.create', request, function() {}) 
        })
        
        it('Sends expected stanza with data form', function(done) {
            done('Not implemented yet')
        })
        
        it('Handles error response', function(done) {
            var request = { room: 'fire@coven.witches.lit' }
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('iq-error'))
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.should.eql({
                    type: 'cancel',
                    condition: 'error-condition'
                })
                done()
            }
            socket.emit('xmpp.muc.create', request, callback)
        })
        
        it('Handes success response', function(done) {
            var request = { room: 'fire@coven.witches.lit' }
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('iq-result'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.should.be.true
                done()
            }
            socket.emit('xmpp.muc.create', request, callback)
        })
        
    })

})