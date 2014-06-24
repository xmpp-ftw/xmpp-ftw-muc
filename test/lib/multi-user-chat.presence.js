'use strict';

/* jshint -W030 */

var MultiUserChat = require('../../index')
  , helper        = require('../helper')

describe('Presence', function() {

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
    
    it('Handles a user going offline', function(done) {
        socket.on('xmpp.muc.roster', function(data) {
            data.room.should.equal('wiccarocks@shakespeare.lit')
            data.nick.should.equal('laptop')
            data.status.should.equal('unavailable')
            done()
        })
        muc.handle(helper.getStanza('presence-offline')).should.be.true
    })

})