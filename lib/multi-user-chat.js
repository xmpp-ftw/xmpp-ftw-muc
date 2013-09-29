var builder   = require('ltx'),
    Base      = require('xmpp-ftw/lib/base'),
    dataForm  = require('xmpp-ftw/lib/utils/xep-0004'),
    xhtmlIm   = require('xmpp-ftw/lib/utils/xep-0071'),
    chatState = require('xmpp-ftw/lib/utils/xep-0085'),
    delay     = require('xmpp-ftw/lib/utils/xep-0203')

var MultiUserChat = function() {
    this.rooms = []
}

MultiUserChat.prototype = new Base()

MultiUserChat.prototype.NS          = "http://jabber.org/protocol/muc"
MultiUserChat.prototype.NS_USER     = "http://jabber.org/protocol/muc#user"
MultiUserChat.prototype.NS_ADMIN    = "http://jabber.org/protocol/muc#admin"
MultiUserChat.prototype.NS_OWNER    = 'http://jabber.org/protocol/muc#owner'
MultiUserChat.prototype.NS_CONFIG   = 'http://jabber.org/protocol/muc#roomconfig'
MultiUserChat.prototype.NS_REQUEST  = 'http://jabber.org/protocol/muc#request'

MultiUserChat.prototype.roles = [
    'outcast', 'visitor', 'participant',
    'member', 'moderator', 'admin', 'owner'
]

MultiUserChat.prototype.PLAIN = 'plain'
MultiUserChat.prototype.XHTML = 'xhtml'

MultiUserChat.prototype._events = {
    'xmpp.muc.join': 'join',
    'xmpp.muc.create': 'create',
    'xmpp.muc.message': 'sendMessage',
    'xmpp.muc.leave': 'leave',
    'xmpp.muc.role.set': 'setRole',
    'xmpp.muc.role.get': 'getRole',
    'xmpp.muc.affiliation': 'setAffiliation',
    'xmpp.muc.register.info': 'registerGet',
    'xmpp.muc.register': 'registerSet',
    'xmpp.muc.room.config.get': 'getRoomInformation',
    'xmpp.muc.room.config.set': 'setRoomInformation',
    'xmpp.muc.cancel': 'cancelChange',
    'xmpp.muc.subject': 'setSubject',
    'xmpp.muc.destroy': 'destroyRoom',
    'xmpp.muc.voice': 'requestVoice',
    'xmpp.muc.invite': 'inviteUser'
}

MultiUserChat.prototype.registerSet = function(data, callback) {
    this.register(data, callback, 'set')
}
    
MultiUserChat.prototype.registerGet = function(data, callback) {
    this.register(data, callback, 'get')
}

MultiUserChat.prototype.handles = function(stanza) {
    if (stanza.attrs.from &&
        (-1 !== this.rooms.indexOf(stanza.attrs.from.split('/')[0])))
        return true
    var x
    if (stanza.is('message') &&
        !!(x = stanza.getChild('x', this.NS_USER)) &&
        x.getChild('invite')) return true
    return false
}

MultiUserChat.prototype.handle = function(stanza) {
    var x
    if (stanza.is('message')) {
        if ('error' == stanza.attrs.type)
            return this.handleErrorMessage(stanza)
        if (!!(x = stanza.getChild('x', this.NS_USER))) {
            if (x.getChild('invite')) return this._handleInvite(stanza)
            return this._handleRoomStatusUpdate(stanza)
        }
        if (stanza.getChild('subject'))
            return this._handleRoomSubject(stanza)
        return this.handleMessage(stanza)
    }
    return this.handlePresence(stanza)
}

MultiUserChat.prototype.handleMessage = function(stanza) {

    var isPrivate = false
    if ('chat' === stanza.attrs.type) isPrivate = true
    
    var message = {
        room:    stanza.attrs.from.split('/')[0],
        nick:    stanza.attrs.from.split('/')[1],
        private: isPrivate
    }
    var html, body, state
    delay.parse(stanza, message)
    if (!!(state = stanza.getChildByAttr('xmlns', chatState.NS)))
        message.state = state.getName()
    if (!!(html = stanza.getChild('html', xhtmlIm.NS_XHTML_IM))) {
       message.format  = this.XHTML
       message.content = html.getChild('body').children.join('').toString()
    } else if (!!(body = stanza.getChild('body'))) {
        message.content = body.getText()
        message.format  = this.PLAIN
    }
    this.socket.emit('xmpp.muc.message', message)
    return true
}

MultiUserChat.prototype._handleRoomStatusUpdate = function(stanza) {
     var updates = { room: stanza.attrs.from, status: [] }
     stanza.getChild('x').getChildren('status').forEach(function(status) {
         updates.status.push(parseInt(status.attrs.code, 10))
     })
     this.socket.emit('xmpp.muc.room.config', updates)
     return true
}

MultiUserChat.prototype._handleInvite = function(stanza) {
    var data = { room: stanza.attrs.to }
    var invite = stanza.getChild('x').getChild('invite')
    data.from = this._getJid(invite.attrs.from)
    var reason, password
    if (!!(reason = invite.getChildText('reason')))
        data.reason = reason
    if (!!(password = stanza.getChild('x').getChildText('password')))
        data.password = password
    this.socket.emit('xmpp.muc.invite', data)
    return true
}

MultiUserChat.prototype._handleRoomSubject = function(stanza) {
    var element = stanza.getChild('subject')
    var subject = element.getText() || false
    this.socket.emit(
        'xmpp.muc.subject',
        { room: stanza.attrs.from, subject: subject }
    )
    return true
}

MultiUserChat.prototype.handleErrorMessage = function(stanza) {
    var error = {
        type: stanza.root().getName(),
        error: this._parseError(stanza),
        room: stanza.attrs.from.split('/')[0]
    }
    var body = stanza.getChild('body')
    if (body) error.content = body.getText()
    if (stanza.getChild('subject')) {
        error.subject = stanza.getChildText('subject') || false
    }
    this.socket.emit('xmpp.muc.error', error)
    return true
}

MultiUserChat.prototype.handlePresence = function(stanza) {
    var event = 'xmpp.muc.roster'
    var presence = {
        room: stanza.attrs.from.split('/')[0],
        nick: stanza.attrs.from.split('/')[1],
        status: stanza.attrs.type
    }
    var item = stanza.getChild('x', this.NS_USER).getChild('item')
    if (item) {
        if (item.attrs.affiliation)
            presence.affiliation = item.attrs.affiliation
        if (item.attrs.role)
            presence.role = item.attrs.role
        if (item.attrs.jid)
            presence.jid = this._getJid(item.attrs.jid)
        if (item.attrs.nick)
            presence.nick = item.attrs.nick
        
    }
    var statusUpdates = stanza.getChild('x').getChildren('status')
    if (statusUpdates.length > 0) {
        presence.status = []
        statusUpdates.forEach(function(status) {
            presence.status.push(parseInt(status.attrs.code, 10))
        })
    }
    var destroy, reason
    if (!!(destroy = stanza.getChild('x').getChild('destroy'))) {
        if (destroy.attrs.jid) presence.alternative = destroy.attrs.jid
        if (!!(reason = destroy.getChildText('reason')))
            presence.reason = reason
        event = 'xmpp.muc.destroy'
    }
    this.socket.emit(event, presence)
    return true
}

MultiUserChat.prototype.sendMessage = function(data) {
    if (!data.room) return this._clientError("Missing 'room' key", data)
    if (this.rooms.indexOf(data.room) == -1)
        return this._clientError("Not registered with this room", data)
    var to     = data.room
    var type   = 'groupchat'

    if (data.to) {
        to   = to + '/' + data.to
        type = 'chat'
    }
    if (!data.content && !data.state)
        return this._clientError(
            'Message content or chat state not provided', data
        )
    var stanza = xhtmlIm.builder(data, {to: to, type: type}, this)
    if (false === stanza) return
    if (data.state)
        chatState.build(stanza.root(), data.state)
    this.client.send(stanza)
}

MultiUserChat.prototype.join = function(data) {
    if (!data.room) return this._clientError("Missing 'room' key", data)
    if (!data.nick) return this._clientError("Missing 'nick' key", data)
    this.rooms.push(data.room)
    this.client.send(new builder.Element(
        'presence',
        { to: data.room + '/' + data.nick }
    ).c('x', { xmlns: this.NS })
    )
}

MultiUserChat.prototype.leave = function(data) {
    if (!data.room) return this._clientError("Missing 'room' key", data)
    if (this.rooms.indexOf(data.room) == -1)
        return this._clientError("Not registered with this room", data)
    var roomIndex = this.rooms.indexOf(data.room)
    if (-1 !== roomIndex) this.rooms.splice(roomIndex, 1)
    var stanza = new builder.Element('presence',
        { to: data.room, type: 'unavailable' })
    if (data.reason) stanza.c('status').t(data.reason)
    this.client.send(stanza)
}

MultiUserChat.prototype.create = function(data, callback) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)
    var stanza = new builder.Element(
        'iq',
        { type: 'set', id: this._getId(), to: data.room }
    ).c('query', { xmlns: this.NS_OWNER })
    if (data.form) {
        try {
            dataForm.addForm(stanza, data.form, this.NS_CONFIG)
        } catch(e) {
            return this._clientError('Badly formatted data form', data, callback)
        }
    } else {
        stanza.c('x', { xmlns: dataForm.NS, type: 'submit' })
    }
    var self = this
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if ('error' === stanza.attrs.type)
            return callback(self._parseError(stanza))
        callback(null, true)
    })
    this.client.send(stanza)
}

MultiUserChat.prototype.destroyRoom = function(data, callback) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)
    var attrs = {}
    if (data.alternative) attrs.jid = data.alternative
    var stanza = new builder.Element(
        'iq',
        { type: 'set', id: this._getId(), to: data.room }
    ).c('query', { xmlns: this.NS_OWNER })
        .c('destroy', attrs)
    if (data.reason)
        stanza.t(data.reason)
    var self = this
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if ('error' === stanza.attrs.type)
            return callback(self._parseError(stanza))
        callback(null, true)
    })
    this.client.send(stanza)
}

MultiUserChat.prototype.setRole = function(data, callback) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)
    if (!data.nick)
        return this._clientError("Missing 'nick' key", data, callback)
    if (!data.role)
        return this._clientError("Missing 'role' key", data, callback)

    var stanza = new builder.Element(
        'iq',
        {type: 'set', id: this._getId(), to: data.room }
    ).c('query', { xmlns: this.NS_ADMIN })
        .c('item', { nick: data.nick, role: data.role})
    if (data.reason) stanza.c('reason').t(data.reason)
    this._sendMembershipUpdate(stanza, callback)
}

MultiUserChat.prototype.getRole = function(data, callback) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)
    if (!data.role)
        return this._clientError("Missing 'role' key", data, callback)
    var stanza = new builder.Element(
        'iq',
        {type: 'get', id: this._getId(), to: data.room}
    ).c('query', { xmlns: this.NS_ADMIN })
        .c('item', { role: data.role })
    var self = this
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if (!callback) return self.manager._getLogger().error('No callback provided')
        if (stanza.attrs.type == 'error')
            return callback(self._parseError(stanza), null)
        var items = stanza.getChild('query', this.NS_ADMIN)
            .getChildren('item')
        var results = []
        items.forEach(function(item) {
            results.push({
                affiliation: item.attrs.affiliation,
                jid: self._getJid(item.attrs.jid),
                nick: item.attrs.nick,
                role: item.attrs.role
            })
        })
        callback(null, results)
    })
    this.client.send(stanza)

}

MultiUserChat.prototype.setAffiliation = function(data, callback) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)
    if (!data.jid)
        return this._clientError("Missing 'jid' key", data, callback)
    if (!data.affiliation)
        return this._clientError("Missing 'affiliation' key", data, callback)
    var stanza = new builder.Element(
        'iq',
        {type: 'set', id: this._getId(), to: data.room }
    )
    .c('query', { xmlns: this.NS_ADMIN })
    .c('item', { jid: data.jid, affiliation: data.affiliation})
    if (data.reason) stanza.c('reason').t(data.reason)
    this._sendMembershipUpdate(stanza, callback)
}

MultiUserChat.prototype._sendMembershipUpdate = function(stanza, callback) {
    var self = this
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if (!callback) return self.manager._getLogger().error('No callback provided')
        if (stanza.attrs.type == 'error')
            return callback(self._parseError(stanza), null)
        callback(null, true)
    })
    this.client.send(stanza)
}

MultiUserChat.prototype.register = function(data, callback, type) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)

    var self   = this
    var stanza = new builder.Element(
        'iq',
        {type: type, id: this._getId(), to: data.room }
    ).c('query', { xmlns: this.NS_REGISTER }).up()
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if (typeof(callback) != 'function')
            return self.manager._getLogger().error('No callback provided')
        if (stanza.attrs.type == 'error')
            return callback(self._parseError(stanza), null)
        var title, instructions, registered, nick
        var query = stanza.getChild('query')
        var data = {}
 
        if (!!(registered = query.getChild('registered'))) {
            data.registered = true
            if (!!(nick = query.getChild('username')))
                data.nick = nick.getText()
            return callback(null, data)
        }
        if (!!(title = query.getChild('title')))
            data.title = title.getText()
        if (!!(instructions = query.getChild('instructions')))
            data.instructions = instructions.getText()
        data.form = dataForm.parseFields(stanza.getChild('query').getChild('x'))
        callback(null, data)
    })
    this.client.send(stanza)
}

MultiUserChat.prototype.getRoomInformation = function(data, callback) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)

    var self   = this
    var stanza = new builder.Element(
        'iq',
        {type: 'get', id: this._getId(), to: data.room }
    ).c('query', { xmlns: this.NS_OWNER }).up()
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if (typeof(callback) != 'function')
            return self.manager._getLogger().error('No callback provided')
        if (stanza.attrs.type == 'error')
            return callback(self._parseError(stanza), null)
        var data = dataForm.parseFields(stanza.getChild('query').getChild('x'))
        callback(null, data)
    })
    this.client.send(stanza)
}

MultiUserChat.prototype.setRoomInformation = function(data, callback) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)
    if (!data.form)
        return this._clientError("Missing 'form' key", data, callback)

    var self   = this
    var stanza = new builder.Element(
        'iq',
        {type: 'set', id: this._getId(), to: data.room }
    ).c('query', { xmlns: this.NS_OWNER })
    try {
        dataForm.addForm(stanza, data.form, this.NS_CONFIG)
    } catch(e) {
        return this._clientError('Badly formatted data form', data, callback)
    }
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if (typeof(callback) != 'function')
            return self.manager._getLogger().error('No callback provided')
        if (stanza.attrs.type == 'error')
            return callback(self._parseError(stanza), null)
        callback(null, true)
    })
    this.client.send(stanza)
}


MultiUserChat.prototype.cancelChange = function(data, callback) {
    if (typeof callback !== 'function')
        return this._clientError('Missing callback', data)
    if (!data.room)
        return this._clientError("Missing 'room' key", data, callback)
    var stanza = new builder.Element(
        'iq',
        { type: 'set', id: this._getId(), to: data.room }
    ).c('query', { xmlns: this.NS_OWNER })
        .c('x', { xmlns: dataForm.NS, type: 'cancel' })
    var self = this
    this.manager.trackId(stanza.root().attr('id'), function(stanza) {
        if ('error' === stanza.attrs.type)
            return callback(self._parseError(stanza))
        callback(null, true)
    })
    this.client.send(stanza)
}

MultiUserChat.prototype.setSubject = function(data) {
    if (!data.room)
        return this._clientError("Missing 'room' key", data)
    var stanza = new builder.Element(
        'message',
        { type: 'groupchat', id: this._getId(), to: data.room }
    ).c('subject')
    if (data.subject) stanza.t(data.subject)
    this.client.send(stanza)
}

MultiUserChat.prototype.requestVoice = function(data) {
    if (!data.room)
        return this._clientError('Missing \'room\' key', data)
    if (!data.role)
        return this._clientError('Missing \'role\' key', data)
    var stanza = new builder.Element(
        'message',
        { to: data.room, id: this._getId() }
    )
    var form = [{
        var: 'muc#role',
        type: 'text-single',
        label: 'Requested role',
        value: data.role
    }]
    dataForm.addForm(stanza, form, this.NS_REQUEST)
    this.client.send(stanza)
}

MultiUserChat.prototype.inviteUser = function(data) {
    if (!data.room)
        return this._clientError('Missing \'room\' key', data)
    if (!data.to)
        return this._clientError('Missing \'to\' key', data)
    var stanza = new builder.Element(
        'message',
        { id: this._getId(), to: data.room }
    ).c('x', { xmlns: this.NS_USER })
     .c('invite', { to: data.to })
    if (data.reason)
        stanza.c('reason').t(data.reason)
    this.client.send(stanza)
}

module.exports = MultiUserChat