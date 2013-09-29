var MultiUserChat = require('../../lib/multi-user-chat')
  , helper        = require('../helper')

require('should')

describe('Can invite a user to a MUC room', function() {

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
    
    describe('Can send invites', function() {

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
            socket.emit('xmpp.muc.invite', {})
        })
    
        it('Returns error if \'to\' key not provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal("Missing 'to' key")
                error.request.should.eql(request)
                xmpp.removeAllListeners('stanza')
                done()
            })
            var request = { room: 'fire@coven@witches.lit' }
            socket.emit('xmpp.muc.invite', request)
        })
    
        it('Sends the expected stanza', function(done) {
            var request = {
                room: 'fire@coven.witches.lit',
                to: 'macbeth@shakespeare.lit'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('message').should.be.true
                stanza.attrs.to.should.equal(request.room)
                stanza.attrs.id.should.exist
                
                var invite = stanza.getChild('x', muc.NS_USER)
                    .getChild('invite')
                invite.should.exist
                invite.attrs.to.should.equal(request.to)
                done()
            })
            socket.emit('xmpp.muc.invite', request)
        })
        
        it('Sends expected stanza with reason', function(done) {
            var request = {
                room: 'fire@coven.witches.lit',
                to: 'macbeth@shakespeare.lit',
                reason: 'Doth one wish to be King?'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('message').should.be.true
                stanza.attrs.to.should.equal(request.room)
                stanza.attrs.id.should.exist
                
                stanza.getChild('x', muc.NS_USER)
                    .getChild('invite')
                    .getChildText('reason')
                    .should.equal(request.reason)
    
                done()
            })
            socket.emit('xmpp.muc.invite', request)
        })
        
    })
    
    describe('Handles invites', function() {
        
      it('Handles invites', function() {
          muc.handles(helper.getStanza('invite')).should.be.true
      })
          
      it('Sends event to user', function(done) {
          socket.once('xmpp.muc.invite', function(data) {
              data.room.should.equal('fire@coven.witches.lit')
              data.from.should.eql({
                  domain: 'witches.lit',
                  user: 'witch1'
              })
              done()
          })
          muc.handle(helper.getStanza('invite')).should.be.true
      })
      
      it('Sends event to user with reason & password', function(done) {
          socket.once('xmpp.muc.invite', function(data) {
              data.reason.should.equal('Doth one wish to be King?')
              data.password.should.equal('blood')
              done()
          })
          muc.handle(helper.getStanza('invite-with-reason-and-password'))
              .should.be.true
      })
      
    })

})