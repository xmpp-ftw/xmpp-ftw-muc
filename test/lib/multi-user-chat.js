var should  = require('should')
  , MultiUserChat   = require('../../lib/multi-user-chat')
  , ltx     = require('ltx')
  , helper  = require('../helper')

describe('MultiUserChat', function() {

    var muc, socket, xmpp, manager

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

        it('Shoudn\'t handle packets from other sources', function() {
            var room = 'fire@coven.witches.lit'
            muc.handles(ltx.parse('<iq from="' + room + '" />')).should.be.false
        })
    })
})
