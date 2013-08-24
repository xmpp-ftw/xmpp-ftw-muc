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
