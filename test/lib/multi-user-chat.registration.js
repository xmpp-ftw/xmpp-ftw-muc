var should        = require('should')
  , MultiUserChat = require('../../index')
  , ltx           = require('ltx')
  , helper        = require('../helper')
  , xhtmlIm       = require('xmpp-ftw').utils['xep-0071']
  , chatState     = require('xmpp-ftw').utils['xep-0085']

describe('Register with a room', function() {

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