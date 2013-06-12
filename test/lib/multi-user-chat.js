var should  = require('should')
  , MultiUserChat   = require('../../lib/multi-user-chat')
  , ltx     = require('ltx')
  , helper  = require('../helper')

describe('MultiUserChat', function() {

    var muc, socket, xmpp, manager

    var removeAllListeners = function() {
        socket.removeAllListeners('xmpp.muc.room.config')
        socket.removeAllListeners('xmpp.muc.error')
        socket.removeAllListeners('xmpp.muc.message')
    }

    beforeEach(function() {
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

    describe('Can handle incoming requests', function() {

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
            muc.handles(ltx.parse('<iq from="' + room + '" />')).should.be.false
        })

        describe('Incoming message stanzas', function() {

            beforeEach(function() {
                removeAllListeners()
            })

            it('<message /> of type error', function(done) {
                socket.once('xmpp.muc.message', function() {
                    done('Unexpected event on \'xmpp.muc.message\'')
                })
                socket.once('xmpp.muc.room.config', function() {
                    done('Unexpected event on \'xmpp.muc.room.config\'')
                })
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
                socket.once('xmpp.muc.error', function() {
                    done('Unexpected event on \'xmpp.muc.error\'')
                })
                socket.once('xmpp.muc.room.config', function() {
                    done('Unexpected event on \'xmpp.muc.room.config\'')
                })
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
                socket.once('xmpp.muc.error', function() {
                    done('Unexpected event on \'xmpp.muc.error\'')
                })
                socket.once('xmpp.muc.room.config', function() {
                    done('Unexpected event on \'xmpp.muc.room.config\'')
                })
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
                socket.once('xmpp.muc.error', function() {
                    done('Unexpected event on \'xmpp.muc.error\'')
                })
                socket.once('xmpp.muc.room.config', function() {
                    done('Unexpected event on \'xmpp.muc.room.config\'')
                })
                socket.once('xmpp.muc.message', function(message) {
                    message.content.should
                        .equal('<p>Are you of <strong>woman </strong>born?</p>')
                    done()
                })
                var stanza = helper.getStanza('message-xhtml')
                muc.handle(stanza).should.be.true
            })

            it('Incoming delayed message', function(done) {
                socket.once('xmpp.muc.error', function() {
                    done('Unexpected event on \'xmpp.muc.error\'')
                })
                socket.once('xmpp.muc.room.config', function() {
                    done('Unexpected event on \'xmpp.muc.room.config\'')
                })
                socket.once('xmpp.muc.message', function(message) {
                    message.delay.should.equal('2002-09-10T23:08:25Z')
                    done()
                })
                var stanza = helper.getStanza('message-delay')
                muc.handle(stanza).should.be.true
            })

            it('Incoming room status updates', function(done) {
                socket.once('xmpp.muc.error', function() {
                    done('Unexpected event on \'xmpp.muc.error\'')
                })
                socket.once('xmpp.muc.message', function() {
                    done('Unexpected event on \'xmpp.muc.message\'')
                })
                socket.once('xmpp.muc.room.config', function(message) {
                    message.room.should.equal('fire@coven.witches.lit')
                    message.status.length.should.equal(2)
                    message.status.should.eql([ 170, 666])
                    done()
                })
                var stanza = helper.getStanza('message-config')
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
    })
})
