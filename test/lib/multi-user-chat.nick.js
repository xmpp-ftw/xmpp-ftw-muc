'use strict';

/* jshint -W030 */

var MultiUserChat = require('../../index')
  , helper        = require('../helper')
  , should        = require('should')

describe('Discover nickname', function() {

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
    
    it('Errors when no callback provided', function(done) {
        xmpp.once('stanza', function() {
            done('Unexpected outgoing stanza')
        })
        socket.once('xmpp.error.client', function(error) {
            error.type.should.equal('modify')
            error.condition.should.equal('client-error')
            error.description.should.equal('Missing callback')
            error.request.should.eql({})
            xmpp.removeAllListeners('stanza')
            done()
        })
        socket.send('xmpp.muc.room.nick', {})
    })

    it('Errors when non-function callback provided', function(done) {
        xmpp.once('stanza', function() {
            done('Unexpected outgoing stanza')
        })
        socket.once('xmpp.error.client', function(error) {
            error.type.should.equal('modify')
            error.condition.should.equal('client-error')
            error.description.should.equal('Missing callback')
            error.request.should.eql({})
            xmpp.removeAllListeners('stanza')
            done()
        })
        socket.send('xmpp.muc.room.nick', {}, true)
    })

    it('Errors if \'room\' key missing', function(done) {
        xmpp.once('stanza', function() {
            done('Unexpected outgoing stanza')
        })
        var callback = function(error, success) {
            should.not.exist(success)
            error.type.should.equal('modify')
            error.condition.should.equal('client-error')
            error.description.should.equal('Missing \'room\' key')
            error.request.should.eql(request)
            xmpp.removeAllListeners('stanza')
            done()
        }
        var request = {}
        socket.send('xmpp.muc.room.nick', request, callback)
    })

    it('Sends expected stanza', function(done) {
        var room = 'fire@coven.witches.lit'
        xmpp.once('stanza', function(stanza) {
            stanza.is('iq').should.be.true
            stanza.attrs.type.should.equal('get')
            stanza.attrs.to.should.equal(room)
            should.exist(stanza.attrs.id)
            var query = stanza.getChild('query', muc.NS_DISCO_INFO)
            query.should.exist
            query.attrs.node.should.equal(muc.X_ROOMUSER_ITEM)
            done()
        })
        socket.send(
            'xmpp.muc.room.nick',
            { room: room },
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
        socket.send(
            'xmpp.muc.room.nick',
            { room: room },
            callback
        )
    })

    it('Reports user\'s reserved nickname if available', function(done) {
        var room = 'fire@coven.witches.lit'
        xmpp.once('stanza', function() {
            manager.makeCallback(helper.getStanza('nickname'))
        })
        var callback = function(error, success) {
            should.not.exist(error)
            success.should.eql({
                nick: 'firstwitch'
            })
            done()
        }
        socket.send(
            'xmpp.muc.room.nick',
            { room: room },
            callback
        )
    })

    it('Returns item-not-found if no nickname available', function(done) {
        var room = 'fire@coven.witches.lit'
        xmpp.once('stanza', function() {
            manager.makeCallback(helper.getStanza('no-nickname'))
        })
        var callback = function(error, success) {
            should.not.exist(success)
            error.type.should.equal('cancel')
            error.condition.should.equal('item-not-found')
            done()
        }
        socket.send(
            'xmpp.muc.room.nick',
            { room: room },
            callback
        )
    })

})