'use strict';

/* jshint -W030 */

var should        = require('should')
  , MultiUserChat = require('../../index')
  , helper        = require('../helper')
  , dataForm      = require('xmpp-ftw').utils['xep-0004']

describe('Roles', function() {

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

    describe('Set role', function() {

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
            socket.send('xmpp.muc.role.set', {})
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
            socket.send('xmpp.muc.role.set', {}, true)
        })

        it('Errors if \'room\' key not provided', function(done) {
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
            socket.send('xmpp.muc.role.set', request, callback)
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
                error.description.should.equal('Missing \'nick\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            socket.send('xmpp.muc.role.set', request, callback)
        })

        it('Errors if \'role\' key not provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'role\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            var request = {
                room: 'fire@witches.coven.lit',
                nick: 'notofwomanborn'
            }
            socket.send('xmpp.muc.role.set', request, callback)
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
            socket.send(
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
            socket.send(
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
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.send('xmpp.muc.role.get', {})
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
            socket.send('xmpp.muc.role.get', {}, true)
        })

        it('Errors if \'room\' key not provided', function(done) {
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
            socket.send('xmpp.muc.role.get', request, callback)
        })

        it('Errors if \'role\' key not provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'role\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            }
            var request = {
                room: 'fire@witches.coven.lit'
            }
            socket.send('xmpp.muc.role.get', request, callback)
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
            socket.send(
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
            socket.send(
                'xmpp.muc.role.get',
                request,
                callback
            )
        })

    })

    describe('Request voice', function() {

        it('Returns error if \'room\' key not provided', function(done) {
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'room\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            })
            var request = {}
            socket.send('xmpp.muc.voice', request)
        })

        it('Errors if \'role\' not provided', function(done) {
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing \'role\' key')
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            })
            var request = { room: 'fire@witches.coven.lit' }
            socket.send('xmpp.muc.voice', request)
        })

        it('Sends expected stanza', function(done) {
            xmpp.once('stanza', function(stanza) {
                stanza.is('message').should.be.true
                stanza.attrs.to.should.equal(request.room)
                stanza.attrs.id.should.exist

                var x = stanza.getChild('x', dataForm.NS)
                x.attrs.type.should.equal('submit')

                x.children.length.should.equal(2)

                x.children[0].getName().should.equal('field')
                x.children[0].attrs.var.should.equal('FORM_TYPE')
                x.children[0].getChildText('value')
                    .should.equal(muc.NS_REQUEST)

                x.children[1].getName().should.equal('field')
                x.children[1].attrs.var.should.equal('muc#role')
                x.children[1].attrs.type.should.equal('text-single')
                x.children[1].attrs.label.should.equal('Requested role')
                x.children[1].getChildText('value')
                    .should.equal(request.role)

                done()
            })
            var request = {
                room: 'fire@coven@witches.lit',
                role: 'participant'
            }
            socket.send('xmpp.muc.voice', request)
        })

    })

})