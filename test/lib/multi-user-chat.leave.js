var should        = require('should')
  , MultiUserChat = require('../../index')
  , ltx           = require('ltx')
  , helper        = require('../helper')
  , xhtmlIm       = require('xmpp-ftw').utils['xep-0071']
  , chatState     = require('xmpp-ftw').utils['xep-0085']

describe('Can leave a room', function() {

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

    it('Returns error if \'room\' key missing', function(done) {
        xmpp.once('stanza', function() {
            done('Unexpected outgoing stanza')
        })
        socket.once('xmpp.error.client', function(error) {
            error.type.should.equal('modify')
            error.condition.should.equal('client-error')
            error.description.should.equal("Missing 'room' key")
            error.request.should.eql(request)
            xmpp.removeAllListeners('stanza')
            done()
        })
        var request = {}
        socket.emit('xmpp.muc.leave', request)
    })

    it('Returns error if user not registered to that room', function(done) {
        xmpp.once('stanza', function() {
            done('Unexpected outgoing stanza')
        })
        socket.once('xmpp.error.client', function(error) {
            error.type.should.equal('modify')
            error.condition.should.equal('client-error')
            error.description.should.equal("Not registered with this room")
            error.request.should.eql(request)
            xmpp.removeAllListeners('stanza')
            done()
        })
        var request = { room: 'fire@coven@witches.lit' }
        socket.emit('xmpp.muc.leave', request)
    })

    it('Sends expected stanza', function(done) {
        xmpp.once('stanza', function(stanza) {
            stanza.is('presence').should.be.true
            stanza.attrs.type.should.equal('unavailable')
            stanza.attrs.to.should.equal(request.room)
            done()
        })
        var request = { room: 'fire@coven@witches.lit' }
        muc.rooms.push(request.room)
        socket.emit('xmpp.muc.leave', request)
    })

    it('Sends expected stanza with \'status\' added', function(done) {
        xmpp.once('stanza', function(stanza) {
            stanza.getChild('status').getText()
                .should.equal(request.reason)
            done()
        })
        var request = {
            room: 'fire@coven@witches.lit',
            reason: 'End of act 1'
        }
        muc.rooms.push(request.room)
        socket.emit('xmpp.muc.leave', request)
    })

    it('Removes room from MUC list', function(done) {
        xmpp.once('stanza', function() {
            muc.rooms.length.should.equal(0)
            done()
        })
        var request = {
            room: 'fire@coven@witches.lit',
            reason: 'End of act 1'
        }
        muc.rooms = [ request.room ]
        socket.emit('xmpp.muc.leave', request)
    })

})