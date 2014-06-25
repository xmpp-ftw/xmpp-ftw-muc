'use strict';

/* jshint -W030 */

var should        = require('should')
  , MultiUserChat = require('../../index')
  , helper        = require('../helper')
  , dataForm      = require('xmpp-ftw').utils['xep-0004']

describe('MUC Rooms', function() {

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

    describe('Destroy a room', function() {

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
            socket.send('xmpp.muc.destroy', {})
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
            socket.send('xmpp.muc.destroy', {}, true)
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
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.muc.destroy', {}, callback)
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
            socket.send(
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
            socket.send(
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
            socket.send(
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
            socket.send(
                'xmpp.muc.destroy',
                { room: room },
                callback
            )
        })

    })

    describe('Create a room', function() {

        it('Errors if \'room\' key missing', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(data) {
                data.type.should.equal('modify')
                data.condition.should.equal('client-error')
                data.description.should.equal('Missing \'room\' key')
                data.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.send('xmpp.muc.create', {})
        })
        
        it('Errors if \'nick\' key missing', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(data) {
                data.type.should.equal('modify')
                data.condition.should.equal('client-error')
                data.description.should.equal('Missing \'nick\' key')
                data.request.should.eql({ room: 'room@chat.example.com' })
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.send('xmpp.muc.create', { room: 'room@chat.example.com' })
        })
        
        it('Adds the room to the room list', function(done) {
            var roomCreateError = helper.getStanza('presence-room-create-error')
            muc.handles(roomCreateError)
                .should.be.false
            var request = {
                room: 'coven@chat.shakespeare.lit',
                nick: 'firstwitch',
                instant: true
            }
            socket.send('xmpp.muc.create', request)
            muc.handles(roomCreateError)
                .should.be.true
            done()
        })

        it('Sends expected stanza', function(done) {
            var request = {
                room: 'fire@coven.witches.lit',
                nick: 'firstwitch'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('presence').should.be.true
                stanza.attrs.to.should.equal(request.room + '/' + request.nick)
                var x = stanza
                    .getChild('x', muc.NS)
                x.should.exist
                x.children.length.should.equal(0)
                done()
            })
            socket.send('xmpp.muc.create', request, function() {})
        })

        it('Sends expected stanza for instant room', function(done) {
            var request = {
                room: 'fire@coven.witches.lit',
                nick: 'firstwitch',
                instant: true
            }
            xmpp.once('stanza', function(stanza) {
                var x = stanza.getChild('x', dataForm.NS)

                x.should.exist
                x.attrs.type.should.equal('submit')
                done()
            })
            socket.send('xmpp.muc.create', request)
        })
        
        it('Handles error creating a room', function(done) {
            
            socket.once('xmpp.muc.error', function(error) {
                error.type.should.equal('presence')
                error.room.should.equal('coven@chat.shakespeare.lit')
                error.error.type.should.equal('cancel')
                error.error.by.should.equal('coven@chat.shakespeare.lit')
                error.error.condition.should.equal('not-allowed')
                done()
            })
            muc.handle(helper.getStanza('presence-room-create-error'))
        })

    })

})