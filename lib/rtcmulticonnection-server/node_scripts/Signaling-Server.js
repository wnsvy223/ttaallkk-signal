// Muaz Khan      - www.MuazKhan.com
// MIT License    - www.WebRTC-Experiment.com/licence
// Documentation  - github.com/muaz-khan/RTCMultiConnection

var listOfUsers = {};
var listOfRooms = {};
var publicRooms = []; // code by https://github.com/wnsvy223 : The value to store and update the public room data in real time. 
var adminSocket;

// for scalable-broadcast demos
var ScalableBroadcast;

// pushLogs is used to write error logs into logs.json
var pushLogs = require('./pushLogs.js');

// const strings
var CONST_STRINGS = require('./CONST_STRINGS.js');

var isAdminAuthorized = require('./verify-admin.js');


// code by https://github.com/wnsvy223
// io : Instance for broadcasting to all connected clients.
module.exports = exports = function(io, socket, config) {
    config = config || {};

    onConnection(socket);

    // to secure your socket.io usage: (via: docs/tips-tricks.md)
    // io.set('origins', 'https://domain.com');

    function appendUser(socket, params) {
        try {
            var extra = params.extra;

            var params = socket.handshake.query;

            if (params.extra) {
                try {
                    if (typeof params.extra === 'string') {
                        params.extra = JSON.parse(params.extra);
                    }
                    extra = params.extra;
                } catch (e) {
                    extra = params.extra;
                }
            }

            listOfUsers[socket.userid] = {
                socket: socket,
                connectedWith: {},
                extra: extra || {},
                admininfo: {},
                socketMessageEvent: params.socketMessageEvent || '',
                socketCustomEvent: params.socketCustomEvent || ''
            };
        } catch (e) {
            pushLogs(config, 'appendUser', e);
        }

        sendToAdmin();
    }

    function sendToAdmin(all) {
        if(config.enableAdmin !== true) {
            return;
        }

        try {
            if (adminSocket) {
                var users = [];
                // temporarily disabled
                config.enableAdmin === true && Object.keys(listOfUsers).forEach(function(userid) {
                    try {
                        var item = listOfUsers[userid];
                        if (!item) return; // maybe user just left?

                        if (!item.connectedWith) {
                            item.connectedWith = {};
                        }

                        if (!item.socket) {
                            item.socket = {};
                        }

                        users.push({
                            userid: userid,
                            admininfo: item.socket.admininfo || '',
                            connectedWith: Object.keys(item.connectedWith)
                        });
                    } catch (e) {
                        pushLogs(config, 'admin.user-looper', e);
                    }
                });

                var scalableBroadcastUsers = 0;
                if(ScalableBroadcast && ScalableBroadcast._) {
                    scalableBroadcastUsers = ScalableBroadcast._.getUsers();
                }

                adminSocket.emit('admin', {
                    newUpdates: !all,
                    listOfRooms: !!all ? listOfRooms : [],
                    listOfUsers: Object.keys(listOfUsers).length, // users
                    scalableBroadcastUsers: scalableBroadcastUsers.length
                });
            }
        } catch (e) {
            pushLogs(config, 'admin', e);
        }
    }

    function handleAdminSocket(socket, params) {
        if(config.enableAdmin !== true || !params.adminUserName || !params.adminPassword) {
            socket.emit('admin', {
                error: 'Please pass "adminUserName" and "adminPassword" via socket.io parameters.'
            });
            
            pushLogs(config, 'invalid-admin', {
                message: CONST_STRINGS.INVALID_ADMIN_CREDENTIAL,
                stack: 'name: ' + params.adminUserName + '\n' + 'password: ' + params.adminPassword
            });

            socket.disconnect(); //disabled admin
            return;
        }

        if (!isAdminAuthorized(params, config)) {
            socket.emit('admin', {
                error: 'Invalid admin username or password.'
            });

            pushLogs(config, 'invalid-admin', {
                message: CONST_STRINGS.INVALID_ADMIN_CREDENTIAL,
                stack: 'name: ' + params.adminUserName + '\n' + 'password: ' + params.adminPassword
            });

            socket.disconnect();
            return;
        }

        socket.emit('admin', {
            connected: true
        });

        adminSocket = socket;
        socket.on('admin', function(message, callback) {
            if (!isAdminAuthorized(params, config)) {
                socket.emit('admin', {
                    error: 'Invalid admin username or password.'
                });

                pushLogs(config, 'invalid-admin', {
                    message: CONST_STRINGS.INVALID_ADMIN_CREDENTIAL,
                    stack: 'name: ' + params.adminUserName + '\n' + 'password: ' + params.adminPassword
                });

                socket.disconnect();
                return;
            }

            callback = callback || function() {};

            if (message.all === true) {
                sendToAdmin(true);
            }

            if (message.userinfo === true && message.userid) {
                try {
                    var user = listOfUsers[message.userid];
                    if (user) {
                        callback(user.socket.admininfo || {});
                    } else {
                        callback({
                            error: CONST_STRINGS.USERID_NOT_AVAILABLE
                        });
                    }
                } catch (e) {
                    pushLogs(config, 'userinfo', e);
                }
            }

            if (message.clearLogs === true) {
                // last callback parameter will force to clear logs
                pushLogs(config, '', '', callback);
            }

            if (message.deleteUser === true) {
                try {
                    var user = listOfUsers[message.userid];

                    if (user) {
                        if (user.socket.owner) {
                            // delete listOfRooms[user.socket.owner];
                        }

                        user.socket.disconnect();
                    }

                    // delete listOfUsers[message.userid];
                    callback(true);
                } catch (e) {
                    pushLogs(config, 'deleteUser', e);
                    callback(false);
                }
            }

            if (message.deleteRoom === true) {
                try {
                    var room = listOfRooms[message.roomid];

                    if (room) {
                        var participants = room.participants;
                        delete listOfRooms[message.roomid];
                        participants.forEach(function(userid) {
                            var user = listOfUsers[userid];
                            if (user) {
                                user.socket.disconnect();
                            }
                        });
                    }
                    callback(true);
                } catch (e) {
                    pushLogs(config, 'deleteRoom', e);
                    callback(false);
                }
            }
        });
    }

    function onConnection(socket) {
        var params = socket.handshake.query;

        if(!params.userid) {
            params.userid = (Math.random() * 100).toString().replace('.', '');
        }

        if(!params.sessionid) {
            params.sessionid = (Math.random() * 100).toString().replace('.', '');
        }

        if (params.extra) {
            try {
                params.extra = JSON.parse(params.extra);
            } catch (e) {
                params.extra = {};
            }
        } else {
            params.extra = {};
        }

        var socketMessageEvent = params.msgEvent || 'RTCMultiConnection-Message';

        // for admin's record
        params.socketMessageEvent = socketMessageEvent;

        var autoCloseEntireSession = params.autoCloseEntireSession === true || params.autoCloseEntireSession === 'true';
        var sessionid = params.sessionid;
        var maxParticipantsAllowed = parseInt(params.maxParticipantsAllowed || 1000) || 1000;
        var enableScalableBroadcast = params.enableScalableBroadcast === true || params.enableScalableBroadcast === 'true';

        if (params.userid === 'admin') {
            handleAdminSocket(socket, params);
            return;
        }

        if (enableScalableBroadcast === true) {
            try {
                if (!ScalableBroadcast) {
                    // path to scalable broadcast script must be accurate
                    ScalableBroadcast = require('./Scalable-Broadcast.js');
                }
                ScalableBroadcast._ = ScalableBroadcast(config, socket, params.maxRelayLimitPerUser);
            } catch (e) {
                pushLogs(config, 'ScalableBroadcast', e);
            }
        }

        // do not allow to override userid
        if (!!listOfUsers[params.userid]) {
            var useridAlreadyTaken = params.userid;
            params.userid = (Math.random() * 1000).toString().replace('.', '');
            socket.emit('userid-already-taken', useridAlreadyTaken, params.userid);
            return;
        }

        socket.userid = params.userid;
        appendUser(socket, params);

        socket.on('extra-data-updated', function(extra) {
            try {
                if (!listOfUsers[socket.userid]) return;

                if (listOfUsers[socket.userid].socket.admininfo) {
                    listOfUsers[socket.userid].socket.admininfo.extra = extra;
                }

                // todo: use "admininfo.extra" instead of below one
                listOfUsers[socket.userid].extra = extra;

                try {
                    for (var user in listOfUsers[socket.userid].connectedWith) {
                        try {
                            listOfUsers[user].socket.emit('extra-data-updated', socket.userid, extra);
                        } catch (e) {
                            pushLogs(config, 'extra-data-updated.connectedWith', e);
                        }
                    }
                } catch (e) {
                    pushLogs(config, 'extra-data-updated.connectedWith', e);
                }

                // sent alert to all room participants
                if (!socket.admininfo) {
                    sendToAdmin();
                    return;
                }

                var roomid = socket.admininfo.sessionid;
                if (roomid && listOfRooms[roomid]) {
                    if (socket.userid == listOfRooms[roomid].owner) {
                        // room's extra must match owner's extra
                        listOfRooms[roomid].extra = extra;
                    }
                    listOfRooms[roomid].participants.forEach(function(pid) {
                        try {
                            var user = listOfUsers[pid];
                            if (!user) {
                                // todo: remove this user from participants list
                                return;
                            }

                            user.socket.emit('extra-data-updated', socket.userid, extra);
                        } catch (e) {
                            pushLogs(config, 'extra-data-updated.participants', e);
                        }
                    });
                }

                sendToAdmin();
            } catch (e) {
                pushLogs(config, 'extra-data-updated', e);
            }
        });

        socket.on('get-remote-user-extra-data', function(remoteUserId, callback) {
            callback = callback || function() {};
            if (!remoteUserId || !listOfUsers[remoteUserId]) {
                callback(CONST_STRINGS.USERID_NOT_AVAILABLE);
                return;
            }
            callback(listOfUsers[remoteUserId].extra);
        });

        var dontDuplicateListeners = {};
        socket.on('set-custom-socket-event-listener', function(customEvent) {
            if (dontDuplicateListeners[customEvent]) return;
            dontDuplicateListeners[customEvent] = customEvent;

            socket.on(customEvent, function(message) {
                try {
                    socket.broadcast.emit(customEvent, message);
                } catch (e) {}
            });
        });

        socket.on('changed-uuid', function(newUserId, callback) {
            callback = callback || function() {};

            try {
                if (listOfUsers[socket.userid] && listOfUsers[socket.userid].socket.userid == socket.userid) {
                    if (newUserId === socket.userid) return;

                    var oldUserId = socket.userid;
                    listOfUsers[newUserId] = listOfUsers[oldUserId];
                    listOfUsers[newUserId].socket.userid = socket.userid = newUserId;
                    delete listOfUsers[oldUserId];

                    callback();
                    return;
                }

                socket.userid = newUserId;
                appendUser(socket, params);

                callback();
            } catch (e) {
                pushLogs(config, 'changed-uuid', e);
            }
        });

        socket.on('set-password', function(password, callback) {
            try {
                callback = callback || function() {};

                if (!socket.admininfo) {
                    callback(null, null, CONST_STRINGS.DID_NOT_JOIN_ANY_ROOM);
                    return;
                }

                var roomid = socket.admininfo.sessionid;

                if (listOfRooms[roomid] && listOfRooms[roomid].owner == socket.userid) {
                    listOfRooms[roomid].password = password;
                    callback(true, roomid, null);
                }
                else {
                    callback(false, roomid, CONST_STRINGS.ROOM_PERMISSION_DENIED);
                }
            } catch (e) {
                pushLogs(config, 'set-password', e);
            }
        });

        socket.on('disconnect-with', function(remoteUserId, callback) {
            try {
                if (listOfUsers[socket.userid] && listOfUsers[socket.userid].connectedWith[remoteUserId]) {
                    delete listOfUsers[socket.userid].connectedWith[remoteUserId];
                    socket.emit('user-disconnected', remoteUserId);
                    sendToAdmin();
                }

                if (!listOfUsers[remoteUserId]) return callback();

                if (listOfUsers[remoteUserId].connectedWith[socket.userid]) {
                    delete listOfUsers[remoteUserId].connectedWith[socket.userid];
                    listOfUsers[remoteUserId].socket.emit('user-disconnected', socket.userid);
                    sendToAdmin();
                }
                callback();
            } catch (e) {
                pushLogs(config, 'disconnect-with', e);
            }
        });

        socket.on('close-entire-session', function(callback) {
            try {
                if(!callback || typeof callback !== 'function') {
                    callback = function() {};
                }

                var user = listOfUsers[socket.userid];

                if(!user) return callback(false, CONST_STRINGS.USERID_NOT_AVAILABLE);
                if(!user.roomid) return callback(false, CONST_STRINGS.ROOM_NOT_AVAILABLE);
                if(!socket.admininfo) return callback(false, CONST_STRINGS.INVALID_SOCKET);

                var room = listOfRooms[user.roomid];
                if(!room) return callback(false, CONST_STRINGS.ROOM_NOT_AVAILABLE);
                if(room.owner !== user.userid) return callback(false, CONST_STRINGS.ROOM_PERMISSION_DENIED);
                
                autoCloseEntireSession = true;
                closeOrShiftRoom();

                callback(true);
            } catch (e) {
                pushLogs(config, 'close-entire-session', e);
            }
        });

        socket.on('check-presence', function(roomid, callback) {
            try {
                if (!listOfRooms[roomid] || !listOfRooms[roomid].participants.length) {
                    callback(false, roomid, {
                        _room: {
                            isFull: false,
                            isPasswordProtected: false
                        }
                    });
                } else {
                    var extra = listOfRooms[roomid].extra;
                    if(typeof extra !== 'object' || !extra) {
                        extra = {
                            value: extra
                        };
                    }
                    extra._room = {
                        isFull: listOfRooms[roomid].participants.length >= listOfRooms[roomid].maxParticipantsAllowed,
                        isPasswordProtected: listOfRooms[roomid].password && listOfRooms[roomid].password.toString().replace(/ /g, '').length
                    };
                    callback(true, roomid, extra);
                }
            } catch (e) {
                pushLogs(config, 'check-presence', e);
            }
        });

        // code by https://github.com/wnsvy223
        // description : some participant force kick out function
        socket.on('force-kickout', function(message, callback){
            try {
                if (!socket.admininfo) {
                    return;
                }

                var roomid = socket.admininfo.sessionid;
                var originOwner = listOfRooms[roomid].owner; // original owner
                var targetUserid = message.targetUserid; // force out taget user
                var requestUserid = socket.userid; // user requesting to force kick out
                if (roomid && listOfRooms[roomid]) {
                    if (autoCloseEntireSession === false && listOfRooms[roomid].participants.length > 1) {
                        if (targetUserid && originOwner === requestUserid) {
                            listOfUsers[targetUserid].socket.emit('banished-room', roomid); // send kick out event to taget user
                            listOfUsers[targetUserid].socket.disconnect(); // target user force disconnect from server
                            listOfRooms[roomid].ipList.forEach(function(ips){ // target user's ip address push to banList
                                if(ips.userid === targetUserid){
                                    listOfRooms[roomid].banList.push(ips.ip);
                                }
                            });
                            // callback to client success force kick out
                            callback({
                                success: true,
                                userid: targetUserid
                            });
                        }else{
                            // callback to client failed force kick out. because the client doesn't have owner permission
                            callback({
                                error: "Permission Denied : You don't have owner permission to user kick out"
                            });
                        }
                    }else{
                        delete listOfRooms[roomid];
                    }
                }
            } catch (e) {
                pushLogs(config, 'force-kickout', e);
            }
        });

        // code by https://github.com/wnsvy223
        // description : transfer owner permissions to another user on live session
        socket.on('change-initiator', function(message, callback){
            try {
                if (!socket.admininfo) {
                    return;
                }

                var roomid = socket.admininfo.sessionid;
                var originOwner = listOfRooms[roomid].owner; // original owner
                var newOwner = message.targetUserid; // new owner
                var requestUserid = socket.userid; // user requesting to change room owner
                if (roomid && listOfRooms[roomid]) {
                    if (autoCloseEntireSession === false && listOfRooms[roomid].participants.length > 1) {
                        if (newOwner && originOwner === requestUserid) { // check if the person who requested the change of room owner is the original room owner
                            // reset owner priviliges
                            listOfRooms[roomid].owner = newOwner;
                            listOfUsers[newOwner].extra.owner = true;
                            // room's extra must be same owner's extra
                            listOfRooms[roomid].extra = listOfUsers[newOwner].extra;

                            // send to new owner set initiator message
                            listOfUsers[newOwner].socket.emit('set-isInitiator-true', roomid);

                            // send new room data message to all participants in the room
                            sendChangedRoomToParticipants(roomid);

                            // callback to client success change owner
                            callback({
                                isChangeOwner: true,
                                owner: listOfRooms[roomid].owner
                            });
                        } else {
                            // callback to client failed change owner. because the client doesn't have owner permission
                            callback({
                                error: "Permission Denied : You don't have owner permission"
                            });
                        }
                    }else{
                        delete listOfRooms[roomid];
                    }
                }
            } catch (e) {
                pushLogs(config, 'change-initiator', e);
            }
        });

        function onMessageCallback(message) {
            try {
                if (!listOfUsers[message.sender]) {
                    socket.emit('user-not-found', message.sender);
                    return;
                }

                // we don't need "connectedWith" anymore
                // todo: remove all these redundant codes
                // fire "onUserStatusChanged" for room-participants instead of individual users
                // rename "user-connected" to "user-status-changed"
                if (!message.message.userLeft && !listOfUsers[message.sender].connectedWith[message.remoteUserId] && !!listOfUsers[message.remoteUserId]) {
                    listOfUsers[message.sender].connectedWith[message.remoteUserId] = listOfUsers[message.remoteUserId].socket;
                    listOfUsers[message.sender].socket.emit('user-connected', message.remoteUserId);

                    if (!listOfUsers[message.remoteUserId]) {
                        listOfUsers[message.remoteUserId] = {
                            socket: null,
                            connectedWith: {},
                            extra: {},
                            admininfo: {}
                        };
                    }

                    listOfUsers[message.remoteUserId].connectedWith[message.sender] = socket;

                    if (listOfUsers[message.remoteUserId].socket) {
                        listOfUsers[message.remoteUserId].socket.emit('user-connected', message.sender);
                    }

                    sendToAdmin();
                }

                if (listOfUsers[message.sender] && listOfUsers[message.sender].connectedWith[message.remoteUserId] && listOfUsers[socket.userid]) {
                    message.extra = listOfUsers[socket.userid].extra;
                    listOfUsers[message.sender].connectedWith[message.remoteUserId].emit(socketMessageEvent, message);

                    sendToAdmin();
                }
            } catch (e) {
                pushLogs(config, 'onMessageCallback', e);
            }
        }

        function joinARoom(message) {
            try {
                if (!socket.admininfo || !socket.admininfo.sessionid) return;

                // var roomid = message.remoteUserId;
                var roomid = socket.admininfo.sessionid;

                if (!listOfRooms[roomid]) return; // find a solution?

                if (listOfRooms[roomid].participants.length >= listOfRooms[roomid].maxParticipantsAllowed && listOfRooms[roomid].participants.indexOf(socket.userid) === -1) {
                    // room is full
                    // todo: how to tell user that room is full?
                    // do not fire "room-full" event
                    // find something else
                    return;
                }

                if (listOfRooms[roomid].session && (listOfRooms[roomid].session.oneway === true || listOfRooms[roomid].session.broadcast === true)) {
                    var owner = listOfRooms[roomid].owner;
                    if (listOfUsers[owner]) {
                        message.remoteUserId = owner;

                        if (enableScalableBroadcast === false) {
                            // only send to owner i.e. only connect with room owner
                            listOfUsers[owner].socket.emit(socketMessageEvent, message);
                        }
                    }
                    return;
                }

                // redundant?
                // appendToRoom(roomid, socket.userid);

                if (enableScalableBroadcast === false) {
                    // connect with all participants
                    listOfRooms[roomid].participants.forEach(function(pid) {
                        if (pid === socket.userid || !listOfUsers[pid]) return;

                        var user = listOfUsers[pid];
                        message.remoteUserId = pid;
                        user.socket.emit(socketMessageEvent, message);
                    });
                }
            } catch (e) {
                pushLogs(config, 'joinARoom', e);
            }

            sendToAdmin();
        }

        function appendToRoom(roomid, userid) {
            try {
                if (!listOfRooms[roomid]) {
                    listOfRooms[roomid] = {
                        sessionid: roomid, // roomid
                        maxParticipantsAllowed: parseInt(params.maxParticipantsAllowed || 1000) || 1000,
                        owner: userid, // this can change if owner leaves and if control shifts
                        participants: [userid],
                        extra: {}, // usually owner's extra-data
                        socketMessageEvent: '',
                        socketCustomEvent: '',
                        identifier: '',
                        session: {
                            audio: true,
                            video: true
                        }
                    };
                    broadcastPublicRoomChanged(listOfRooms[roomid]);
                }

                if (listOfRooms[roomid].participants.indexOf(userid) !== -1) return;
                listOfRooms[roomid].participants.push(userid);
                broadcastPublicRoomChanged(listOfRooms[roomid]);
            } catch (e) {
                pushLogs(config, 'appendToRoom', e);
            }
        }

        function closeOrShiftRoom() {
            try {
                if (!socket.admininfo) {
                    return;
                }

                var roomid = socket.admininfo.sessionid;

                if (roomid && listOfRooms[roomid]) {
                    if (socket.userid === listOfRooms[roomid].owner) {
                        if (autoCloseEntireSession === false && listOfRooms[roomid].participants.length > 1) {
                            var firstParticipant;
                            listOfRooms[roomid].participants.forEach(function(pid) {
                                if (firstParticipant || pid === socket.userid) return;
                                if (!listOfUsers[pid]) return;
                                firstParticipant = listOfUsers[pid];
                            });

                            if (firstParticipant) {
                                // reset owner priviliges
                                listOfRooms[roomid].owner = firstParticipant.socket.userid;

                                // redundant?
                                firstParticipant.socket.emit('set-isInitiator-true', roomid);

                                // remove from room's participants list
                                var newParticipantsList = [];
                                listOfRooms[roomid].participants.forEach(function(pid) {
                                    if (pid != socket.userid) {
                                        newParticipantsList.push(pid);
                                    }
                                });
                                listOfRooms[roomid].participants = newParticipantsList;
                                
                                // code by https://github.com/wnsvy223
                                // description : send new room data with changed initiator message to all participants in the room
                                sendChangedRoomToParticipants(roomid);
                            } else {
                                broadcastPublicRoomClose(roomid);
                                delete listOfRooms[roomid];
                            }
                        } else {
                            broadcastPublicRoomClose(roomid);
                            delete listOfRooms[roomid];
                        }
                    } else {
                        var newParticipantsList = [];
                        listOfRooms[roomid].participants.forEach(function(pid) {
                            if (pid && pid != socket.userid && listOfUsers[pid]) {
                                newParticipantsList.push(pid);
                            }
                        });
                        listOfRooms[roomid].participants = newParticipantsList;
                    }
                    broadcastPublicRoomChanged(listOfRooms[roomid]);
                }
            } catch (e) {
                pushLogs(config, 'closeOrShiftRoom', e);
            }
        }

        // code by https://github.com/wnsvy223
        // send new room data message to all participants in the room
        function sendChangedRoomToParticipants(roomid) {
            try{
                var roomData = {
                    maxParticipantsAllowed : listOfRooms[roomid].maxParticipantsAllowed,
                    owner : listOfRooms[roomid].owner,
                    participants : listOfRooms[roomid].participants,
                    identifier : listOfRooms[roomid].identifier,
                    session : listOfRooms[roomid].session
                }
                listOfRooms[roomid].participants.forEach(function(pid){
                    listOfUsers[pid].socket.emit('set-new-initiator', roomData);
                });
            } catch (e) {
                pushLogs(config, 'set-new-initiator', e);
            }
        }

        // code by https://github.com/wnsvy223
        // add public room data and broadcast when room open 
        function broadcastPublicRoomOpen(roomid) { 
            try {
                var room = listOfRooms[roomid];
                if(room && room.identifier !== undefined && room.identifier === 'publicRoomIdentifier') {
                    publicRooms.push({
                        maxParticipantsAllowed: room.maxParticipantsAllowed,
                        owner: room.owner,
                        participants: room.participants,
                        extra: room.extra,
                        session: room.session,
                        sessionid: roomid,
                        isRoomFull: room.participants.length >= room.maxParticipantsAllowed,
                        isPasswordProtected: !!room.password && room.password.replace(/ /g, '').length > 0
                    });

                    io.emit('get-current-public-rooms', publicRooms); // broadcast public room data to all connected clients
                }
            } catch (e) {
                pushLogs(config, 'broadcastPublicRoomOpen', e);
            }
        }

        // code by https://github.com/wnsvy223
        // remove public room data and broadcast when room close
        function broadcastPublicRoomClose(roomid) {
            try {
                var room = listOfRooms[roomid];
                if(room && room.identifier !== undefined && room.identifier === 'publicRoomIdentifier') {
                    var itemToFind = publicRooms.find(function(item) {
                        return item.sessionid === roomid;
                    });
                    var idx = publicRooms.indexOf(itemToFind);
                    if(idx  > -1) publicRooms.splice(idx, 1);

                    io.emit('get-current-public-rooms', publicRooms); // broadcast public room data to all connected clients
                }
            } catch (e) {
                pushLogs(config, 'broadcastPublicRoomClose', e);
            }
        }

        // code by https://github.com/wnsvy223
        // broadcast public room data to all clients when public room data changed
        function broadcastPublicRoomChanged(room) {
            try {
                if(room && room.identifier !== undefined && room.identifier === 'publicRoomIdentifier'){
                    io.emit('public-room-changed', room); 
                }
            } catch (e) {
                pushLogs(config, 'public-room-changed', e);
            }
        }

        socket.on(socketMessageEvent, function(message, callback) {
            if (message.remoteUserId && message.remoteUserId === socket.userid) {
                // remoteUserId MUST be unique
                return;
            }

            try {
                if (message.remoteUserId && message.remoteUserId != 'system' && message.message.newParticipationRequest) {
                    if (enableScalableBroadcast === true) {
                        var user = listOfUsers[message.remoteUserId];
                        if (user) {
                            user.socket.emit(socketMessageEvent, message);
                        }

                        if (listOfUsers[socket.userid] && listOfUsers[socket.userid].extra.broadcastId) {
                            // for /admin/ page
                            appendToRoom(listOfUsers[socket.userid].extra.broadcastId, socket.userid);
                        }
                    } else if (listOfRooms[message.remoteUserId]) {
                        joinARoom(message);
                        return;
                    }
                }

                // for v3 backward compatibility; >v3.3.3 no more uses below block
                if (message.remoteUserId == 'system') {
                    if (message.message.detectPresence) {
                        if (message.message.userid === socket.userid) {
                            callback(false, socket.userid);
                            return;
                        }

                        callback(!!listOfUsers[message.message.userid], message.message.userid);
                        return;
                    }
                }

                if (!listOfUsers[message.sender]) {
                    listOfUsers[message.sender] = {
                        socket: socket,
                        connectedWith: {},
                        extra: {},
                        admininfo: {}
                    };
                }

                // if someone tries to join a person who is absent
                // -------------------------------------- DISABLED
                if (false && message.message.newParticipationRequest) {
                    var waitFor = 60 * 10; // 10 minutes
                    var invokedTimes = 0;
                    (function repeater() {
                        if (typeof socket == 'undefined' || !listOfUsers[socket.userid]) {
                            return;
                        }

                        invokedTimes++;
                        if (invokedTimes > waitFor) {
                            socket.emit('user-not-found', message.remoteUserId);
                            return;
                        }

                        // if user just come online
                        if (listOfUsers[message.remoteUserId] && listOfUsers[message.remoteUserId].socket) {
                            joinARoom(message);
                            return;
                        }

                        setTimeout(repeater, 1000);
                    })();

                    return;
                }

                onMessageCallback(message);
            } catch (e) {
                pushLogs(config, 'on-socketMessageEvent', e);
            }
        });

        socket.on('is-valid-password', function(password, roomid, callback) {
            try {
                callback = callback || function() {};
                
                if(!password || !password.toString().replace(/ /g, '').length) {
                    callback(false, roomid, 'You did not enter the password.');
                    return;
                }

                if(!roomid || !roomid.toString().replace(/ /g, '').length) {
                    callback(false, roomid, 'You did not enter the room-id.');
                    return;
                }

                if(!listOfRooms[roomid]) {
                    callback(false, roomid, CONST_STRINGS.ROOM_NOT_AVAILABLE);
                    return;
                }

                if(!listOfRooms[roomid].password) {
                    callback(false, roomid, 'This room do not have any password.');
                    return;
                }

                if(listOfRooms[roomid].password === password) {
                    callback(true, roomid, false);
                }
                else {
                    callback(false, roomid, CONST_STRINGS.INVALID_PASSWORD);
                }
            }
            catch(e) {
                pushLogs('is-valid-password', e);
            }
        });

        socket.on('get-public-rooms', function(identifier, callback) {
            try {
                if(!identifier || !identifier.toString().length || !identifier.toString().replace(/ /g, '').length) {
                    callback(null, CONST_STRINGS.PUBLIC_IDENTIFIER_MISSING);
                    return;
                }

                var rooms = [];
                Object.keys(listOfRooms).forEach(function(key) {
                    var room = listOfRooms[key];
                    if(!room || !room.identifier || !room.identifier.toString().length || room.identifier !== identifier) return;
                    rooms.push({
                        maxParticipantsAllowed: room.maxParticipantsAllowed,
                        owner: room.owner,
                        participants: room.participants,
                        extra: room.extra,
                        session: room.session,
                        sessionid: key,
                        isRoomFull: room.participants.length >= room.maxParticipantsAllowed,
                        isPasswordProtected: !!room.password && room.password.replace(/ /g, '').length > 0
                    });
                });

                callback(rooms);
            }
            catch(e) {
                pushLogs('get-public-rooms', e);
            }
        });

        socket.on('open-room', function(arg, callback) {
            callback = callback || function() {};

            try {
                // if already joined a room, either leave or close it
                closeOrShiftRoom();

                if (listOfRooms[arg.sessionid] && listOfRooms[arg.sessionid].participants.length) {
                    callback(false, CONST_STRINGS.ROOM_NOT_AVAILABLE);
                    return;
                }

                if (enableScalableBroadcast === true) {
                    arg.session.scalable = true;
                    arg.sessionid = arg.extra.broadcastId;
                }

                // maybe redundant?
                if (!listOfUsers[socket.userid]) {
                    listOfUsers[socket.userid] = {
                        socket: socket,
                        connectedWith: {},
                        extra: arg.extra,
                        admininfo: {},
                        socketMessageEvent: params.socketMessageEvent || '',
                        socketCustomEvent: params.socketCustomEvent || ''
                    };
                }
                listOfUsers[socket.userid].extra = arg.extra;

                if (arg.session && (arg.session.oneway === true || arg.session.broadcast === true)) {
                    autoCloseEntireSession = true;
                }
            } catch (e) {
                pushLogs(config, 'open-room', e);
            }

            // append this user into participants list
            appendToRoom(arg.sessionid, socket.userid);

            try {
                // override owner & session
                if (enableScalableBroadcast === true) {
                    if (Object.keys(listOfRooms[arg.sessionid]).length == 1) {
                        listOfRooms[arg.sessionid].owner = socket.userid;
                        listOfRooms[arg.sessionid].session = arg.session;
                    }
                } else {
                    // for non-scalable-broadcast demos
                    listOfRooms[arg.sessionid].owner = socket.userid;
                    listOfRooms[arg.sessionid].session = arg.session;
                    listOfRooms[arg.sessionid].extra = arg.extra || {};
                    listOfRooms[arg.sessionid].socketMessageEvent = listOfUsers[socket.userid].socketMessageEvent;
                    listOfRooms[arg.sessionid].socketCustomEvent = listOfUsers[socket.userid].socketCustomEvent;
                    listOfRooms[arg.sessionid].maxParticipantsAllowed = parseInt(arg.maxParticipantsAllowed || 1000) || 1000; // code by https://github.com/wnsvy223 description : change maxParticipantsAllowed variable from 'params' to 'arg'
                    listOfRooms[arg.sessionid].ipList = []; // code by https://github.com/wnsvy223 description : array for store participants ip address 
                    listOfRooms[arg.sessionid].banList = []; // code by https://github.com/wnsvy223 description : array for store banished user's ip address 
                    if(arg.identifier && arg.identifier.toString().length) {
                        listOfRooms[arg.sessionid].identifier = arg.identifier;
                    }

                    try {
                        if (typeof arg.password !== 'undefined' && arg.password.toString().length) {
                            // password protected room?
                            listOfRooms[arg.sessionid].password = arg.password;
                        }
                    } catch (e) {
                        pushLogs(config, 'open-room.password', e);
                    }
                }

                // admin info are shared only with /admin/
                listOfUsers[socket.userid].socket.admininfo = {
                    sessionid: arg.sessionid,
                    session: arg.session,
                    mediaConstraints: arg.mediaConstraints,
                    sdpConstraints: arg.sdpConstraints,
                    streams: arg.streams,
                    extra: arg.extra
                };
            } catch (e) {
                pushLogs(config, 'open-room', e);
            }

            broadcastPublicRoomOpen(arg.sessionid);

            sendToAdmin();

            try {
                callback(true);
            } catch (e) {
                pushLogs(config, 'open-room', e);
            }
        });

        socket.on('join-room', function(arg, callback) {
            callback = callback || function() {};

            try {
                // if already joined a room, either leave or close it
                closeOrShiftRoom();

                if (enableScalableBroadcast === true) {
                    arg.session.scalable = true;
                    arg.sessionid = arg.extra.broadcastId;
                }

                // maybe redundant?
                if (!listOfUsers[socket.userid]) {
                    listOfUsers[socket.userid] = {
                        socket: socket,
                        connectedWith: {},
                        extra: arg.extra,
                        admininfo: {},
                        socketMessageEvent: params.socketMessageEvent || '',
                        socketCustomEvent: params.socketCustomEvent || ''
                    };
                }
                listOfUsers[socket.userid].extra = arg.extra;
            } catch (e) {
                pushLogs(config, 'join-room', e);
            }

            try {
                if (!listOfRooms[arg.sessionid]) {
                    callback(false, CONST_STRINGS.ROOM_NOT_AVAILABLE);
                    return;
                }
            } catch (e) {
                pushLogs(config, 'join-room', e);
            }

            try {
                if (listOfRooms[arg.sessionid].password && listOfRooms[arg.sessionid].password != arg.password) {
                    callback(false, CONST_STRINGS.INVALID_PASSWORD);
                    return;
                }
            } catch (e) {
                pushLogs(config, 'join-room.password', e);
            }

            try {
                if (listOfRooms[arg.sessionid].participants.length >= listOfRooms[arg.sessionid].maxParticipantsAllowed) {
                    callback(false, CONST_STRINGS.ROOM_FULL);
                    return;
                }
            } catch (e) {
                pushLogs(config, 'join-room.ROOM_FULL', e);
            }

            // code by https://github.com/wnsvy223
            // description : store participants ip address value. And banished user's ip check when join room.
            try {
                if (listOfUsers[socket.userid]){
                    listOfUsers[socket.userid].socket.emit('request-ip', function(userIdentifier){
                        if(userIdentifier && userIdentifier.ip){
                            listOfRooms[arg.sessionid].banList.forEach(function(banishedIp){
                                if(banishedIp === userIdentifier.ip){
                                    listOfUsers[socket.userid].socket.emit('user-ip-banished', arg.sessionid);
                                    listOfUsers[socket.userid].socket.disconnect();
                                }
                            });
                            listOfRooms[arg.sessionid].ipList.push(userIdentifier);
                        }else{
                            listOfUsers[socket.userid].socket.emit('user-ip-omission', arg.sessionid);
                            listOfUsers[socket.userid].socket.disconnect();
                        }
                    }); 
                }  
            } catch(e) {
                pushLogs(config, 'join-room.IP_FAIL', e);
            }

            // append this user into participants list
            appendToRoom(arg.sessionid, socket.userid);

            try {
                // admin info are shared only with /admin/
                listOfUsers[socket.userid].socket.admininfo = {
                    sessionid: arg.sessionid,
                    session: arg.session,
                    mediaConstraints: arg.mediaConstraints,
                    sdpConstraints: arg.sdpConstraints,
                    streams: arg.streams,
                    extra: arg.extra
                };
            } catch (e) {
                pushLogs(config, 'join-room', e);
            }

            sendToAdmin();

            try {
                callback(true);
            } catch (e) {
                pushLogs(config, 'join-room', e);
            }
        });

        socket.on('disconnect', function() {
            try {
                if (socket && socket.namespace && socket.namespace.sockets) {
                    delete socket.namespace.sockets[this.id];
                }
            } catch (e) {
                pushLogs(config, 'disconnect', e);
            }

            try {
                // inform all connected users
                if (listOfUsers[socket.userid]) {
                    for (var s in listOfUsers[socket.userid].connectedWith) {
                        listOfUsers[socket.userid].connectedWith[s].emit('user-disconnected', socket.userid);

                        // sending duplicate message to same socket?
                        if (listOfUsers[s] && listOfUsers[s].connectedWith[socket.userid]) {
                            delete listOfUsers[s].connectedWith[socket.userid];
                            listOfUsers[s].socket.emit('user-disconnected', socket.userid);
                        }
                    }
                }
            } catch (e) {
                pushLogs(config, 'disconnect', e);
            }

            closeOrShiftRoom();

            delete listOfUsers[socket.userid];

            if (socket.ondisconnect) {
                try {
                    // scalable-broadcast.js
                    socket.ondisconnect();
                }
                catch(e) {
                    pushLogs('socket.ondisconnect', e);
                }
            }

            sendToAdmin();
        });

        // code by https://github.com/wnsvy223
        // leave room : close room without disconnect socket
        socket.on('leave-room', function() {
            closeOrShiftRoom();
        });
    }
};
