'use strict';

/* jshint -W030 */

var should        = require('should')
  , MultiUserChat = require('../../index')
  , ltx           = require('ltx')
  , helper        = require('../helper')

describe('Incoming stanzas', function() {

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

    it('Should handle packets from a joined room', function() {
        var room = 'fire@coven.witches.lit'
        muc.rooms.push(room)
        muc.handles(ltx.parse('<iq from="' + room + '" />')).should.be.true
    })

    it('Should ignore response on incoming messages', function() {
        var room = 'fire@coven.witches.lit'
        muc.rooms.push(room)
        muc.handles(ltx.parse('<message from="' + room + '/cauldron" />'))
            .should.be.true
    })

    it('Shoudn\'t handle packets from other sources', function() {
        var room = 'fire@coven.witches.lit'
        muc.rooms = []
        muc.handles(ltx.parse('<iq from="' + room + '" />')).should.be.false
    })

    describe('Incoming message stanzas', function() {

        it('<message /> of type error', function(done) {
            socket.once('xmpp.muc.error', function(error) {
                error.type.should.equal('message')
                error.error.should.eql(
                    { type: 'modify', condition: 'bad-request' }
                )
                error.room.should.equal('fire@coven.witches.lit')
                error.content.should.equal('Are you of woman born?')
                done()
            })
            var stanza = helper.getStanza('message-error')
            muc.handle(stanza).should.be.true
        })

        it('Incoming room message', function(done) {
            socket.once('xmpp.muc.message', function(message) {
                should.not.exist(message.error)
                should.not.exist(message.delay)
                message.private.should.be.false
                message.format.should.equal('plain')
                message.room.should.equal('fire@coven.witches.lit')
                message.nick.should.equal('cauldron')
                message.content.should.equal('Are you of woman born?')
                done()
            })
            var stanza = helper.getStanza('message-groupchat')
            muc.handle(stanza).should.be.true
        })

        it('Incoming private message', function(done) {
            socket.once('xmpp.muc.message', function(message) {
                message.private.should.be.true
                message.content.should.equal('Are you of woman born?')
                done()
            })
            var stanza = helper.getStanza('message-groupchat')
            stanza.attrs.type = 'chat'
            muc.handle(stanza).should.be.true
        })

        it('Incoming XHTML message', function(done) {
            socket.once('xmpp.muc.message', function(message) {
                message.content.should
                    .equal('<p>Are you of <strong>woman </strong>born?</p>')
                done()
            })
            var stanza = helper.getStanza('message-xhtml')
            muc.handle(stanza).should.be.true
        })

        it('Incoming delayed message', function(done) {
            socket.once('xmpp.muc.message', function(message) {
                message.delay.when.should.equal('2002-09-10T23:08:25Z')
                done()
            })
            var stanza = helper.getStanza('message-delay')
            muc.handle(stanza).should.be.true
        })

        it('Incoming XHTML message with chat state', function(done) {
            socket.once('xmpp.muc.message', function(message) {
                message.content.should
                    .equal('<p>Are you of <strong>woman </strong>born?</p>')
                message.state.should.equal('active')
                done()
            })
            var stanza = helper.getStanza('message-xhtml-with-chat-state')
            muc.handle(stanza).should.be.true
        })

        it('Incoming message with chat state', function(done) {
            socket.once('xmpp.muc.message', function(message) {
                should.not.exist(message.content)
                message.state.should.equal('active')
                done()
            })
            var stanza = helper.getStanza('message-chat-state')
            muc.handle(stanza).should.be.true
        })

        it('Incoming room status updates', function(done) {
            socket.once('xmpp.muc.room.config', function(message) {
                message.room.should.equal('fire@coven.witches.lit')
                message.status.length.should.equal(2)
                message.status.should.eql([ 170, 666])
                done()
            })
            var stanza = helper.getStanza('message-config')
            muc.handle(stanza).should.be.true
        })

        it('Incoming user nickname updates', function(done) {
            socket.once('xmpp.muc.roster', function(message) {
                message.room.should.equal('fire@coven.witches.lit')
                message.jid.domain.should.equal('coven.witches.lit')
                message.jid.user.should.equal('fire')
                message.jid.resource.should.equal('lovesick-puppy')
                message.nick.should.equal('lonely-singleton')
                message.role.should.equal('participant')
                message.status.length.should.equal(1)
                message.status.should.eql([ 303 ])
                done()
            })
            var stanza = helper.getStanza('nickname-change')
            muc.handle(stanza).should.be.true
        })

        it('Incoming room subject update', function(done) {
            socket.once('xmpp.muc.subject', function(message) {
                message.room.should.equal('fire@coven.witches.lit')
                message.subject.should.equal('Gathering around the fire')
                done()
            })
            var stanza = helper.getStanza('message-subject')
            muc.handle(stanza).should.be.true
        })

        it('Incoming empty room subject update', function(done) {
            socket.once('xmpp.muc.subject', function(message) {
                message.room.should.equal('fire@coven.witches.lit')
                message.subject.should.be.false
                done()
            })
            var stanza = helper.getStanza('message-subject-empty')
            muc.handle(stanza).should.be.true
        })

        it('Handles a subject setting error', function(done) {
            socket.once('xmpp.muc.error', function(error) {
                error.type.should.equal('message')
                error.error.condition.should.equal('forbidden')
                error.error.type.should.equal('auth')
                error.room.should.equal('fire@coven.witches.lit')
                error.subject.should.equal('Gathering around the fire')
                done()
            })
            var stanza = helper.getStanza('message-subject-error')
            muc.handle(stanza).should.be.true
        })

    })

    it('Handles incoming presence stanzas', function(done) {
        socket.once('xmpp.muc.roster', function(presence) {
            should.not.exist(presence.error)
            presence.room.should.equal('fire@coven.witches.lit')
            presence.nick.should.equal('cauldron')
            presence.affiliation.should.equal('owner')
            presence.role.should.equal('moderator')
            done()
        })
        var stanza = helper.getStanza('presence-join')
        muc.handle(stanza).should.be.true
    })

    it('Handles destroy a room presence updates', function(done) {
        var stanza = helper.getStanza('presence-destroy')
        socket.on('xmpp.muc.destroy', function(data) {
            data.room.should.equal('fire@coven.witches.lit')
            data.alternative.should.equal('chamber@chat.shakespeare.lit')
            data.reason.should.equal('The act is done')
            done()
        })
        muc.handle(stanza).should.be.true
    })

})