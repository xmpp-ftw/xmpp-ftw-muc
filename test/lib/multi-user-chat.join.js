'use strict';

/* jshint -W030 */

var MultiUserChat = require('../../index')
  , helper        = require('../helper')

describe('Can join a MUC room', function() {

    var muc, socket, xmpp, manager

    before(function() {
        socket = new helper.SocketEventer()
        xmpp = new helper.XmppEventer()
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

    beforeEach(function() {
        socket.removeAllListeners()
        xmpp.removeAllListeners()
        muc.init(manager)
    })

    it('Returns error if \'room\' key not provided', function(done) {
        xmpp.once('stanza', function() {
            done('Unexpected outgoing stanza')
        })
        socket.once('xmpp.error.client', function(error) {
            error.type.should.equal('modify')
            error.condition.should.equal('client-error')
            error.description.should.equal('Missing \'room\' key')
            error.request.should.eql({})
            xmpp.removeAllListeners('stanza')
            done()
        })
        socket.send('xmpp.muc.join', {})
    })

    it('Returns error if \'nick\' key not provided', function(done) {
        xmpp.once('stanza', function() {
            done('Unexpected outgoing stanza')
        })
        socket.once('xmpp.error.client', function(error) {
            error.type.should.equal('modify')
            error.condition.should.equal('client-error')
            error.description.should.equal('Missing \'nick\' key')
            error.request.should.eql(request)
            xmpp.removeAllListeners('stanza')
            done()
        })
        var request = { room: 'fire@coven@witches.lit' }
        socket.send('xmpp.muc.join', request)
    })

    it('Sends the expected stanza', function(done) {
        var request = { room: 'fire@coven.witches.lit', nick: 'caldron' }
        xmpp.once('stanza', function(stanza) {
            stanza.is('presence').should.be.true
            stanza.attrs.to.should.equal(request.room + '/' + request.nick)
            stanza.getChild('x', muc.NS).should.exist
            muc.rooms.indexOf(request.room).should.be.above(-1)
            done()
        })
        socket.send('xmpp.muc.join', request)
    })

})