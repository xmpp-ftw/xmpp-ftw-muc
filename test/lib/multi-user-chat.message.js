'use strict';

/* jshint -W030 */

var should        = require('should')
  , MultiUserChat = require('../../index')
  , helper        = require('../helper')
  , xhtmlIm       = require('xmpp-ftw').utils['xep-0071']
  , chatState     = require('xmpp-ftw').utils['xep-0085']

describe('Sending a message', function() {

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
            error.description.should.equal('Missing \'room\' key')
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
            error.description.should.equal('Not registered with this room')
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
                room: 'fire@witches.coven.lit'
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
            stanza.attrs.type.should.equal('groupchat')
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
            stanza.attrs.type.should.equal('groupchat')
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
            stanza.attrs.type.should.equal('groupchat')
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