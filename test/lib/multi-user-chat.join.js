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
                if (typeof id !== 'object')
                    throw new Error('Stanza ID spoofing protection not implemented')
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
    
    describe('MUC history', function() {
    
        it('Sends expected stanza with history', function(done) {
            var request = {
                room: 'fire@coven.witches.lit',
                nick: 'caldron',
                history: {
                    maxchars: '6550',
                    maxstanzas: '37',
                    seconds: '3600',
                    since: '2014-05-03T22:09:00.000Z'
                }
            }
            xmpp.once('stanza', function(stanza) {
                var history = stanza.getChild('x', muc.NS).getChild('history')
                history.attrs.maxchars.should.equal(request.history.maxchars)
                history.attrs.maxstanzas.should.equal(request.history.maxstanzas)
                history.attrs.seconds.should.equal(request.history.seconds)
                history.attrs.since.should.equal(request.history.since)
                done()
            })
            socket.send('xmpp.muc.join', request)
        })
    })

})