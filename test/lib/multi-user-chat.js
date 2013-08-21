var should        = require('should')
  , MultiUserChat = require('../../lib/multi-user-chat')
  , ltx           = require('ltx')
  , helper        = require('../helper')
  , xhtmlIm       = require('xmpp-ftw/lib/utils/xep-0071')
  , chatState     = require('xmpp-ftw/lib/utils/xep-0085')

describe('MultiUserChat', function() {

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
                    message.delay.should.equal('2002-09-10T23:08:25Z')
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

    describe('Can join a MUC room', function() {

        it('Returns error if \'room\' key not provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing 'room' key")
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.emit('xmpp.muc.join', {})
        })

        it('Returns error if \'nick\' key not provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing 'nick' key")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            })
            var request = { room: 'fire@coven@witches.lit' }
            socket.emit('xmpp.muc.join', request)
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
            socket.emit('xmpp.muc.join', request)
        })
    })

    describe('Can leave a room', function() {

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

    describe('Sending a message', function() {

        beforeEach(function() {
            // Somewhere I'm not clearing a stanza listener
            // sadly this addition is required, until located
            xmpp.removeAllListeners('stanza')
        })

        it('Returns error if \'room\' key not provided', function(done) {
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
            socket.emit('xmpp.muc.message', request)
        })

        it('Should return error if not registered with room', function(done) {
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
            var request = { room: 'fire@coven.witches.lit' }
            socket.emit('xmpp.muc.message', request)
        })

        it('Errors if \'content\' and chat state not provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description
                    .should.equal('Message content or chat state not provided')
                var expectedErrorRequest = {
                    room: "fire@witches.coven.lit"
                }
                error.request.should.eql(expectedErrorRequest)
                xmpp.removeAllListeners('stanza')
                done()
            })
            var request = { room: 'fire@witches.coven.lit' }
            muc.rooms.push(request.room)
            socket.emit('xmpp.muc.message', request)
        })

        it('Sends expected stanza', function(done) {
            xmpp.once('stanza', function(stanza) {
                stanza.attrs.to.should.equal(request.room)
                stanza.attrs.type.should.equal("groupchat")
                stanza.getChild('body').getText().should.equal('some content')
                done()
            })
            var request = {
                room: 'fire@coven@witches.lit',
                content: 'some content'
            }
            muc.rooms.push(request.room)
            socket.emit('xmpp.muc.message', request)
        })

        it('Sends expected stanza with chat state', function(done) {
            xmpp.once('stanza', function(stanza) {
                stanza.attrs.to.should.equal(request.room)
                stanza.attrs.type.should.equal("groupchat")
                stanza.getChild('body').getText().should.equal('some content')
                stanza.getChild('active', chatState.NS).should.exist
                done()
            })
            var request = {
                room: 'fire@coven@witches.lit',
                content: 'some content',
                state: 'active'
            }
            muc.rooms.push(request.room)
            socket.emit('xmpp.muc.message', request)
        })
        
        it('Sends expected stanza with chat state only', function(done) {
            xmpp.once('stanza', function(stanza) {
                stanza.attrs.to.should.equal(request.room)
                stanza.attrs.type.should.equal("groupchat")
                should.not.exist(stanza.getChild('body'))
                stanza.getChild('active', chatState.NS).should.exist
                done()
            })
            var request = {
                room: 'fire@coven@witches.lit',
                state: 'active'
            }
            muc.rooms.push(request.room)
            socket.emit('xmpp.muc.message', request)
        })
        
        it('Sends expected direct message', function(done) {
            xmpp.once('stanza', function(stanza) {
                stanza.attrs.to.should.equal(request.room + '/' + request.to)
                stanza.attrs.type.should.equal('chat')
                done()
            })
            var request = {
                room: 'fire@coven@witches.lit',
                content: 'some direct content',
                to: 'caldron'
            }
            muc.rooms.push(request.room)
            socket.emit('xmpp.muc.message', request)
        })

        it('Can send XHTML message', function(done) {
            xmpp.once('stanza', function(stanza) {
                stanza.attrs.to.should.equal(request.room)
                stanza.getChild('body').getText()
                    .should.equal('some XHTML content')
                stanza.getChild('html', xhtmlIm.NS_XHTML_IM)
                    .getChild('body', xhtmlIm.NS_XHTML)
                    .children.join('').should.equal(request.content)
                done()
            })
            var request = {
                room: 'fire@coven@witches.lit',
                content: '<p>some <strong>XHTML</strong> content</p>',
                format: 'xhtml'
            }
            muc.rooms.push(request.room)
            socket.emit('xmpp.muc.message', request)
        })

    })

    describe('Room configuration', function() {

        describe('Get configuration', function() {

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
                socket.emit('xmpp.muc.room.config.get', {})
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
                socket.emit('xmpp.muc.room.config.get', {}, true)
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
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = {}
                socket.emit('xmpp.muc.room.config.get', request, callback)
            })

            it('Handles error response stanza', function(done) {
                var room = 'fire@coven.witches.lit'
                xmpp.once('stanza', function(stanza) {
                     stanza.is('iq').should.be.true
                     stanza.attrs.type.should.equal('get')
                     stanza.attrs.to.should.equal(room)
                     should.exist(stanza.attrs.id)
                     stanza.getChild('query', muc.NS_OWNER).should.exist
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
                    'xmpp.muc.room.config.get',
                    { room: room },
                    callback
                )
            })

            it('Returns room configuration', function(done) {
                var room = 'fire@coven.witches.lit'
                xmpp.once('stanza', function(stanza) {
                     stanza.is('iq').should.be.true
                     stanza.attrs.type.should.equal('get')
                     stanza.attrs.to.should.equal(room)
                     should.exist(stanza.attrs.id)
                     stanza.getChild('query', muc.NS_OWNER).should.exist
                     manager.makeCallback(helper.getStanza('config-get-result'))
                })
                var callback = function(error, data) {
                    should.not.exist(error)
                    data.title.should.equal('Configuration for "fire" Room')
                    data.instructions.should.equal(
                        'Use this form to update room configuration'
                    )
                    data.fields.length.should.equal(1)
                    data.fields[0].label
                        .should.equal('Short Description of Room')
                    data.fields[0].type = 'text-single'
                    data.fields[0].var = 'muc#roomconfig_roomdesc'
                    data.fields[0].value = 'Come chat around the fire'
                    data.fields[0].required.should.equal.false
                    done()
                }
                socket.emit(
                    'xmpp.muc.room.config.get',
                    { room: room },
                    callback
                )
            })
        })

        describe('Set configuration', function() {

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
                socket.emit('xmpp.muc.room.config.set', {})
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
                socket.emit('xmpp.muc.room.config.set', {}, true)
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
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = {}
                socket.emit('xmpp.muc.room.config.set', request, callback)
            })

            it('Errors if \'form\' key missing', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'form' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = { room: 'fire@witches.coven.lit' }
                socket.emit('xmpp.muc.room.config.set', request, callback)
            })

            it('Handles invalid data form', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Badly formatted data form")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = { room: 'fire@witches.coven.lit', form: true }
                socket.emit('xmpp.muc.room.config.set', request, callback)
            })

            it('Handles error response stanza', function(done) {
                var room = 'fire@coven.witches.lit'
                xmpp.once('stanza', function(stanza) {
                     stanza.is('iq').should.be.true
                     stanza.attrs.type.should.equal('set')
                     stanza.attrs.to.should.equal(room)
                     should.exist(stanza.attrs.id)
                     stanza.getChild('query', muc.NS_OWNER).should.exist
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
                    'xmpp.muc.room.config.set',
                    { room: room, form: [] },
                    callback
                )
            })

            it('Allows setting of room configuration', function(done) {
                var request = {
                    room: 'fire@coven.witches.lit',
                    form: []
                }
                xmpp.once('stanza', function(stanza) {
                     stanza.is('iq').should.be.true
                     stanza.attrs.type.should.equal('set')
                     stanza.attrs.to.should.equal(request.room)
                     should.exist(stanza.attrs.id)
                     stanza.getChild('query', muc.NS_OWNER).should.exist
                     var x = stanza.getChild('query').getChild('x')
                     x.attrs.xmlns.should.equal('jabber:x:data')
                     x.attrs.type.should.equal('submit')
                     x.children.length.should.equal(1)
                     x.children[0].attrs.var.should.equal('FORM_TYPE')
                     x.children[0].getChild('value').getText()
                         .should.equal(muc.NS_CONFIG)
                     manager.makeCallback(helper.getStanza('iq-result'))
                })
                var callback = function(error, data) {
                    should.not.exist(error)
                    data.should.be.true
                    done()
                }
                socket.emit(
                    'xmpp.muc.room.config.set',
                    request,
                    callback
                )
            })

        })

        describe('Register with room', function() {

            describe('Get Registration information', function() {

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
                    socket.emit('xmpp.muc.register.info', {})
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
                    socket.emit('xmpp.muc.register.info', {}, true)
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
                    socket.emit('xmpp.muc.register.info', {}, callback)
                })

                it('Handles error response stanza', function(done) {
                    var room = 'fire@coven.witches.lit'
                    xmpp.once('stanza', function(stanza) {
                        stanza.is('iq').should.be.true
                        stanza.attrs.type.should.equal('get')
                        stanza.attrs.to.should.equal(room)
                        should.exist(stanza.attrs.id)
                        stanza.getChild('query', muc.NS_REGISTER).should.exist
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
                        'xmpp.muc.register.info',
                        { room: room },
                        callback
                    )
                })

                it('Handles already registered', function(done) {
                    var room = 'fire@coven.witches.lit'
                    xmpp.once('stanza', function(stanza) {
                         stanza.is('iq').should.be.true
                         stanza.attrs.type.should.equal('get')
                         stanza.attrs.to.should.equal(room)
                         should.exist(stanza.attrs.id)
                         stanza.getChild('query', muc.NS_REGISTER).should.exist
                         manager.makeCallback(
                             helper.getStanza('registration-registered')
                         )
                    })
                    var callback = function(error, success) {
                        should.not.exist(error)
                        success.registered.should.be.true
                        success.nick.should.equal('notofwomanborn')
                        done()
                    }
                    socket.emit(
                        'xmpp.muc.register.info',
                        { room: room },
                        callback
                    )
                })

                it('Returns registration information', function(done) {
                    var room = 'fire@coven.witches.lit'
                    xmpp.once('stanza', function(stanza) {
                         stanza.is('iq').should.be.true
                         stanza.attrs.type.should.equal('get')
                         stanza.attrs.to.should.equal(room)
                         should.exist(stanza.attrs.id)
                         stanza.getChild('query', muc.NS_REGISTER).should.exist
                         manager.makeCallback(
                             helper.getStanza('registration-info')
                         )
                    })
                    var callback = function(error, success) {
                        should.not.exist(error)
                        success.instructions.should.equal(
                            'To register online visit http://witches.lit'
                        )
                        success.form.instructions.should.equal(
                            'Please return the following information'
                        )
                        success.form.title
                            .should.equal('Fire Chat Registration')
                        success.form.fields.length.should.equal(2)
                        success.form.fields[0].should.eql({
                           var: 'muc#register_name',
                           type: 'text-single',
                           required: true,
                           label: 'Name'
                        })
                        success.form.fields[1].label.should.equal('Nickname')
                        done()
                    }
                    socket.emit(
                        'xmpp.muc.register.info',
                        { room: room, form: [] },
                        callback
                    )
                })

            })

            it('Handles direct registration', function(done) {
                var room = 'fire@coven.witches.lit'
                xmpp.once('stanza', function(stanza) {
                     stanza.is('iq').should.be.true
                     stanza.attrs.type.should.equal('set')
                     stanza.attrs.to.should.equal(room)
                     should.exist(stanza.attrs.id)
                     stanza.getChild('query', muc.NS_REGISTER).should.exist
                     manager.makeCallback(
                         helper.getStanza('registration-registered')
                     )
                })
                var callback = function(error, success) {
                    should.not.exist(error)
                    success.registered.should.be.true
                    success.nick.should.equal('notofwomanborn')
                    done()
                }
                socket.emit(
                    'xmpp.muc.register',
                    { room: room, form: [] },
                    callback
                )
            })

        })

    })

    describe('Roles', function() {

        describe('Set role', function() {

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
                socket.emit('xmpp.muc.role.set', {})
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
                socket.emit('xmpp.muc.role.set', {}, true)
            })

            it('Errors if \'room\' key not provided', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'room' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = {}
                socket.emit('xmpp.muc.role.set', request, callback)
            })

            it('Errors if \'nick\' key not provided', function(done) {
                var request = { room: 'fire@witches.coven.lit' }
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'nick' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                socket.emit('xmpp.muc.role.set', request, callback)
            })

            it('Errors if \'role\' key not provided', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'role' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = {
                    room: 'fire@witches.coven.lit',
                    nick: 'notofwomanborn'
                }
                socket.emit('xmpp.muc.role.set', request, callback)
            })

            it('Handles error response stanza', function(done) {
                xmpp.once('stanza', function(stanza) {
                    stanza.is('iq').should.be.true
                    stanza.attrs.type.should.equal('set')
                    stanza.attrs.to.should.equal(request.room)
                    should.exist(stanza.attrs.id)
                    stanza.getChild('query', muc.NS_ADMIN).should.exist
                    var item = stanza.getChild('query').getChild('item')
                    item.attrs.role.should.equal(request.role)
                    item.attrs.nick.should.equal(request.nick)
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
                var request = {
                    room: 'fire@witches.coven.lit',
                    nick: 'notofwomanborn',
                    role: 'participant'
                }
                socket.emit(
                    'xmpp.muc.role.set',
                    request,
                    callback
                )
            })

            it('Handles successful role set', function(done) {
                xmpp.once('stanza', function(stanza) {
                    stanza.getChild('query')
                        .getChild('item')
                        .getChild('reason')
                        .getText()
                        .should.equal(request.reason)
                    manager.makeCallback(helper.getStanza('iq-result'))
                })
                var callback = function(error, success) {
                    should.not.exist(error)
                    success.should.be.true
                    done()
                }
                var request = {
                    room: 'fire@witches.coven.lit',
                    nick: 'notofwomanborn',
                    role: 'participant',
                    reason: 'Great nick!'
                }
                socket.emit(
                    'xmpp.muc.role.set',
                    request,
                    callback
                )
            })

        })

        describe('Get current roles', function() {

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
                socket.emit('xmpp.muc.role.get', {})
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
                socket.emit('xmpp.muc.role.get', {}, true)
            })

            it('Errors if \'room\' key not provided', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'room' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = {}
                socket.emit('xmpp.muc.role.get', request, callback)
            })

            it('Errors if \'role\' key not provided', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'role' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = {
                    room: 'fire@witches.coven.lit'
                }
                socket.emit('xmpp.muc.role.get', request, callback)
            })

            it('Handles error response stanza', function(done) {
                xmpp.once('stanza', function(stanza) {
                    stanza.is('iq').should.be.true
                    stanza.attrs.type.should.equal('get')
                    stanza.attrs.to.should.equal(request.room)
                    should.exist(stanza.attrs.id)
                    stanza.getChild('query', muc.NS_ADMIN).should.exist
                    var item = stanza.getChild('query').getChild('item')
                    item.attrs.role.should.equal(request.role)
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
                var request = {
                    room: 'fire@witches.coven.lit',
                    role: 'participant'
                }
                socket.emit(
                    'xmpp.muc.role.get',
                    request,
                    callback
                )
            })
 
            it('Returns users with specified role', function(done) {
                xmpp.once('stanza', function() {
                    manager.makeCallback(helper.getStanza('iq-role-result'))
                })
                var callback = function(error, data) {
                    should.not.exist(error)
                    data.length.should.equal(3)
                    data[0].affiliation.should.equal('none')
                    data[0].jid.should.eql({
                        domain: 'midsummer.lit',
                        user: 'fairyqueen',
                        resource: 'in-love'
                    })
                    data[0].nick.should.equal('Titania')
                    data[0].role.should.equal('participant')
                    data[1].nick.should.equal('Oberon')
                    data[1].affiliation.should.equal('member')
                    data[2].jid.should.eql({
                        domain: 'midsummer.lit',
                        user: 'bottom',
                        resource: 'potion'
                    })
                    data[2].role.should.equal('participant')
                    done()
                }
                var request = {
                    room: 'fire@witches.coven.lit',
                    role: 'participant'
                }
                socket.emit(
                    'xmpp.muc.role.get',
                    request,
                    callback
                )
            })

        })

    })

    describe('Affiliation updates', function() {

        describe('Set affilition', function() {

            beforeEach(function() {
                // Somewhere I'm not clearing a stanza listener
                // sadly this addition is required, until located
                xmpp.removeAllListeners('stanza')
            })


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
                socket.emit('xmpp.muc.affiliation', {})
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
                socket.emit('xmpp.muc.affiliation', {}, true)
            })

            it('Errors if \'room\' key not provided', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'room' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = {}
                socket.emit('xmpp.muc.affiliation', request, callback)
            })

            it('Errors if \'jid\' key not provided', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'jid' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = { room: 'fire@witches.coven.lit' }
                socket.emit('xmpp.muc.affiliation', request, callback)
            })

            it('Errors if \'affiliation\' key not provided', function(done) {
                xmpp.once('stanza', function() {
                    done('Unexpected outgoing stanza')
                })
                var callback = function(error, success) {
                    should.not.exist(success)
                    error.type.should.equal('modify')
                    error.condition.should.equal('client-error')
                    error.description.should.equal("Missing 'affiliation' key")
                    error.request.should.eql(request)
                    xmpp.removeAllListeners('stanza')
                    done()
                }
                var request = {
                    room: 'fire@witches.coven.lit',
                    jid: 'bottom@midsummer.lit'
                }
                socket.emit('xmpp.muc.affiliation', request, callback)
            })

            it('Handles error response stanza', function(done) {
                xmpp.once('stanza', function(stanza) {
                    stanza.is('iq').should.be.true
                    stanza.attrs.type.should.equal('set')
                    stanza.attrs.to.should.equal(request.room)
                    should.exist(stanza.attrs.id)
                    stanza.getChild('query', muc.NS_ADMIN).should.exist
                    var item = stanza.getChild('query').getChild('item')
                    item.attrs.affiliation.should.equal(request.affiliation)
                    item.attrs.jid.should.equal(request.jid)
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
                var request = {
                    room: 'fire@witches.coven.lit',
                    jid: 'bottom@midsummer.lit',
                    affiliation: 'outcast'
                }
                socket.emit(
                    'xmpp.muc.affiliation',
                    request,
                    callback
                )
            })

            it('Returns true on successful affiliation change', function(done) {
                xmpp.once('stanza', function(stanza) {
                    stanza.is('iq').should.be.true
                    stanza.attrs.type.should.equal('set')
                    stanza.attrs.to.should.equal(request.room)
                    should.exist(stanza.attrs.id)
                    stanza.getChild('query')
                        .getChild('item')
                        .getChild('reason')
                        .getText()
                        .should.equal(request.reason)
                    manager.makeCallback(helper.getStanza('iq-result'))
                })
                var callback = function(error, success) {
                    should.not.exist(error)
                    success.should.be.true
                    done()
                }
                var request = {
                    room: 'fire@witches.coven.lit',
                    jid: 'bottom@midsummer.lit',
                    affiliation: 'outcast',
                    reason: 'Making an ass of himself'
                }
                socket.emit(
                    'xmpp.muc.affiliation',
                    request,
                    callback
                )
            })
        })

    })

})
