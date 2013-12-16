var should        = require('should')
  , MultiUserChat = require('../../index')
  , ltx           = require('ltx')
  , helper        = require('../helper')
  , xhtmlIm       = require('xmpp-ftw').utils['xep-0071']
  , chatState     = require('xmpp-ftw').utils['xep-0085']

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

})