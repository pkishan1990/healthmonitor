
//mgRtc - RTC implementation part

(function( $, window, document, undefined ){

    /**
     *  RTC implementation part
     *
     */
    var rtc = {firefox:false},
    config = {};

    rtc.init = function(globalConfig){
        rtc.config = globalConfig.rtc;
        rtc.firefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        config = globalConfig;
        rtc.shim();
    };
    
    rtc.shim = function () {
        if (!('addStream' in window.RTCPeerConnection.prototype)) {
            window.RTCPeerConnection.prototype.addStream = function (stream) {
                var self = this;
                stream.getTracks().forEach(function (track) {
                    self.addTrack(track, stream);
                });
            };
        }
    };

    // Holds a connection to the server.
    rtc._socket = null;

    // Holds callbacks for certain events.
    rtc._events = {};

    //attach event handlers
    rtc.on = function(eventName, callback) {
        rtc._events[eventName] = rtc._events[eventName] || [];
        rtc._events[eventName].push(callback);
    };

    //fire event handler
    rtc.fire = function(eventName, _) {
        rtc.debug("fired [" + eventName + "]");
        var events = rtc._events[eventName];
        var args = Array.prototype.slice.call(arguments, 1);

        if (!events) {
            return;
        }
        //fire all handlers for this event
        for (var i = 0, len = events.length; i < len; i++) {
            events[i].apply(null, args);
        }
    };

    // Array of known peer socket ids
    /**

{
    id:{
        status: statuses,
        pc: PeerConnection,
        stream: localStream,
        data: customData,
        offerSdp: calledOffer
    }
}

    statuses:   statuses: idle, call_inviting, call_invited, call_accepting,
                call_accepted, sdp_offering, sdp_offered, sdp_answering,
                sdp_answered, call

    messages:   login, call_invite, call_accept, call_dropm
                sdp_offer, sdp_answer, ice_candidate
     */
    rtc.connections = {};
    
    rtc.connectionsLoaded = false;

    rtc.id = null;

    rtc.compatible = true;

    /**
     * Write to console if config.debug
     *
     */
    rtc.debug = function(message){
        if(config.debug){
            console.log(message);
        }
    };

    rtc.checkCompatibility = function (errors, warnings, checkType){
        if(!checkType){
            checkType = 'call';
        }
        rtc.compatible = true;
        if(!window.WebSocket){
            errors.websocket = true;
            rtc.compatible = false;
        }
        if(!window.RTCPeerConnection && !window.PeerConnection){
            if(checkType == 'call'){
                errors.peerconnection = true;
                rtc.compatible = false;                
            } else{
                warnings.peerconnection = true;
            }
        }
        if(!navigator.mediaDevices.getUserMedia){
            if(checkType == 'call'){
                errors.usermedia = true;
                rtc.compatible = false;
            } else{
                warnings.usermedia = true;                
            }
        }   
        return rtc.compatible;
    };
    
    /**
     * Load available video/audio devices on callback
     * @param {function} onLoad
     */
    rtc.loadDevices = function(onLoad){
        var devices = {audio: [], video: []};
        
        if(!navigator || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices){
            onLoad(devices);
            return;
        }
        navigator.mediaDevices.enumerateDevices().then(function(availableDevices) {
            availableDevices.forEach(function(device) {
                if(device.kind === 'videoinput'){
                    devices.video.push({
                        value: device.deviceId,
                        text: device.label
                    });
                } else if (device.kind === 'audioinput') {
                    devices.audio.push({
                        value: device.deviceId,
                        text: device.label
                    });
                }                
            });
            onLoad(devices);
        });
    };   

    /**
     * Connects to the websocket server.
     */
    rtc.connect = function(server) {
        rtc._socket = new WebSocket(server);
        //after socket is opened
        rtc._socket.onopen = function() {
            rtc.fire('connected');
        };
        //ws on mesessage event
        rtc._socket.onmessage = function(msg) {
            var json = JSON.parse(msg.data);
            rtc.debug("RECEIVED MESSAGE " + json.type);
            rtc.debug(json);
            //fire proper event callback
            rtc.fire(json.type, json.data);
        };
        //ws error
        rtc._socket.onerror = function(err) {
            rtc.debug('onerror');
            rtc.debug(err);
            rtc.fire('socket_error', err);
        };
        //close our socket
        rtc._socket.onclose = function(data) {
            //fire external event
            rtc.fire('socket_closed', {});
        };
    };

    //emitted from server - obtain ws connections
    rtc.on('connections', function(data) {
        rtc.connections = data;
        rtc.connectionsLoaded = true;
    });
    //received local id
    rtc.on('connectionId', function(data) {
        rtc.id = data.connectionId;
        rtc.fire('logged',data.data);
    });

    rtc.on('connection_add', function(data) {
        rtc.connections[data.connectionId]  = data.data;
    });

    rtc.on('connection_remove', function(data) {
        delete rtc.connections[data.connectionId];
    });

    rtc.on('call_invite', function(data) {
        rtc.setStatus(data.connectionId, 'call_invited');
    });

    rtc.on('call_accept', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;
        }
        rtc.setStatus(data.connectionId, 'call_accepted');
        //send sdp offer
        rtc.sdpOffer(data.connectionId);
    });

    rtc.setStatus = function (connectionId,status){
        rtc.debug("status [" + status + "] for connectionId: " + connectionId);
        rtc.connections[connectionId].status = status;
        rtc.fire('status',connectionId,status);
    };

    rtc.refuseIdleState = function(connectionId){
        var result = connectionId && rtc.connections[connectionId].status == 'idle';
        if(result){
            rtc.debug('refusing idle state of connection id: ' + connectionId);
        }
        return result;
    };

    rtc.send = function (message){
        rtc.debug("SENDING MSG " + message.type);
        rtc.debug(message);
        rtc._socket.send(JSON.stringify(message));
    };

    rtc.mediaReady = function (){
        rtc.send({
            type:"media_ready",
            data: {}
        });
    };

    rtc.rouletteNext = function(){
        rtc.send({
            type:"roulette_next",
            data: {}
        });
    };

    rtc.rouletteAccept = function(connectionId){
        rtc.send({
            type:"roulette_accept",
            data: {
                'connectionId': connectionId
            }
        });
    };
    
    rtc.chatMessage = function (connectionId,messageText){
        rtc.send({
            type:"chat_message",
            data: {
                "connectionId": connectionId,
                "message": messageText
            }           
        });        
    };

    rtc.login = function (userData){
        rtc.send({
            type:"login",
            data:userData
        });
    };

    rtc.invite = function (connectionId, opt){
        //create local media stream
        rtc.debug('creating local media stream');
        rtc.setStatus(connectionId,'call_inviting');
        rtc.createStream(connectionId, opt, function (stream){
            rtc.debug('inviting call for id: ' + connectionId);
            rtc.send({
                "type": "call_invite",
                "data": {
                    "connectionId": connectionId
                }
            });
        });
    };

    rtc.accept = function (connectionId, opt){
        //create local media stream
        rtc.debug('creating local media stream');
        rtc.createStream(connectionId, opt, function (stream){
            rtc.debug('accepting call from id: ' + connectionId);
            rtc.send({
                "type": "call_accept",
                "data": {
                    "connectionId": connectionId
                }
            });
            rtc.setStatus(connectionId,'call_accepting');
        });
    };

    rtc.drop = function (connectionId, leaveConnection, leaveStream){
        //drop call
        rtc.debug('droping call');
        rtc.send({
            "type": "call_drop",
            "data": {
                "connectionId": connectionId
            }
        });
        if(rtc.connections[connectionId]){
            rtc.stop(connectionId, leaveConnection, leaveStream);
        }
    };

    rtc.busy = function (connectionId){
        //drop call
        rtc.debug('sending busy signal');
        rtc.send({
            "type": "call_busy",
            "data": {
                "connectionId": connectionId
            }
        });
    };

    rtc.stop = function (connectionId, leaveConnection, leaveStream){
        if(!rtc.connections[connectionId]){
            return false;
        }
        if(!leaveConnection && rtc.connections[connectionId].pc){
            rtc.connections[connectionId].pc.close();
            rtc.connections[connectionId].pc = null;
        }
        if(!leaveStream && rtc.connections[connectionId].stream){
            //stop all tracks
            var tracks = rtc.connections[connectionId].stream.getTracks();
            for (var i in tracks){
                tracks[i].stop();
            }
            //depricated
            //rtc.connections[connectionId].stream.stop();
        }
        rtc.setStatus(connectionId,'idle');
    };

    rtc.mergeConstraints = function(cons1, cons2) {
        var merged = cons1;
        for (var name in cons2.mandatory) {
            merged.mandatory[name] = cons2.mandatory[name];
        }
        merged.optional.concat(cons2.optional);
        return merged;
    }

    rtc.onCreateSessionDescriptionError = function(error) {
        rtc.debug('Failed to create session description: ' + error.toString());
    }

    rtc.extractSdp = function(sdpLine, pattern) {
        var result = sdpLine.match(pattern);
        return (result && result.length == 2)? result[1]: null;
    }

    // Set the selected codec to the first in m line.
    rtc.setDefaultCodec = function(mLine, payload) {
        var elements = mLine.split(' ');
        var newLine = new Array();
        var index = 0;
        for (var i = 0; i < elements.length; i++) {
            if (index === 3) // Format of media starts from the fourth.
                newLine[index++] = payload; // Put target payload to the first.
            if (elements[i] !== payload)
                newLine[index++] = elements[i];
        }
        return newLine.join(' ');
    }

    // Strip CN from sdp before CN constraints is ready.
    rtc.removeCN = function(sdpLines, mLineIndex) {
        var mLineElements = sdpLines[mLineIndex].split(' ');
        // Scan from end for the convenience of removing an item.
        for (var i = sdpLines.length-1; i >= 0; i--) {
            var payload = rtc.extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
            if (payload) {
                var cnPos = mLineElements.indexOf(payload);
                if (cnPos !== -1) {
                    // Remove CN payload from m line.
                    mLineElements.splice(cnPos, 1);
                }
                // Remove CN line in sdp
                sdpLines.splice(i, 1);
            }
        }

        sdpLines[mLineIndex] = mLineElements.join(' ');
        return sdpLines;
    }

    // Set |codec| as the default audio codec if it's present.
    // The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
    rtc.preferAudioCodec = function(sdp) {
        if(!rtc.config.audio_receive_codec){
            return sdp;
        }
        var codec = rtc.config.audio_receive_codec;
        var fields = codec.split('/');
        //invalid
        if (fields.length != 2) {
            return sdp;
        }
        var name = fields[0];
        var rate = fields[1];
        var sdpLines = sdp.split('\r\n');

        // Search for m line.
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('m=audio') !== -1) {
                var mLineIndex = i;
                break;
            }
        }
        if (mLineIndex === null)
            return sdp;

        // If the codec is available, set it as the default in m line.
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search(name + '/' + rate) !== -1) {
                var regexp = new RegExp(':(\\d+) ' + name + '\\/' + rate, 'i');
                var payload = rtc.extractSdp(sdpLines[i], regexp);
                if (payload)
                    sdpLines[mLineIndex] = rtc.setDefaultCodec(sdpLines[mLineIndex],
                        payload);
                break;
            }
        }

        // Remove CN in m line and sdp.
        sdpLines = rtc.removeCN(sdpLines, mLineIndex);

        sdp = sdpLines.join('\r\n');
        return sdp;
    };
    
    /**
     * Set remote sessionDescription on PC  
     */
    rtc.remoteSDReceive = function (pc, sessionDescription) {
        pc.setRemoteDescription(new RTCSessionDescription(sessionDescription))
        .then(function () {
            rtc.debug('Set remote session description success.');
            if(!pc.getRemoteStreams){
                rtc.debug('getRemoteStreams does not exist on PC');
                return;
            }
            var remoteStreams = pc.getRemoteStreams();
            if(remoteStreams.length > 0 && remoteStreams[0].getVideoTracks().length > 0){
                rtc.debug('Waiting for remote video tracks');
            }            
        })
        .catch(function(e){
            rtc.debug('Set remote session description error ' + e.toString());
        });
    };  
    
    /**
     * Set local sessionDescription on PC and send WS message
     */    
    rtc.localSDSend = function (pc, connectionId, sessionDescription, messageType) {
        sessionDescription.sdp = rtc.preferAudioCodec(sessionDescription.sdp);
        rtc.debug('Setting local sessionDescription and sending msg ' + messageType);
        rtc.debug(sessionDescription);        
        pc.setLocalDescription(sessionDescription)
        .then(function(){
            rtc.debug('Set local session description success.');
        })
        .catch(function(e){
            rtc.debug('Set local session description error ' + e.toString());
        });
        rtc.send({
            "type": messageType,
            "data": {
                "connectionId": connectionId,
                "sdp": sessionDescription
            }
        });
    };    

    rtc.sdpOffer = function (connectionId) {
        var pc = rtc.createPeerConnection(connectionId);
        var constraints = rtc.config.offerConstraints;
        rtc.debug('Sending offer to peer, with constraints: \n' + '  \'' + JSON.stringify(constraints) + '\'.');        
        pc.createOffer(constraints).then(function(sessionDescription) {
            rtc.localSDSend(pc, connectionId, sessionDescription, "sdp_offer");
        })
        .catch(function(error) {
            rtc.onCreateSessionDescriptionError(error);
        });
        rtc.setStatus(connectionId,'sdp_offering');
    };

    rtc.sdpAnswer = function (connectionId) {
        rtc.debug("Answering call connectionId: " + connectionId);
        var pc = rtc.createPeerConnection(connectionId);
        rtc.remoteSDReceive(pc, rtc.connections[connectionId].offerSdp);
        rtc.debug('Sending answer to peer, with constraints: \n' + '  \'' + JSON.stringify({}) + '\'.');
        
        pc.createAnswer().then(function(sessionDescription) {
            rtc.localSDSend(pc, connectionId, sessionDescription, "sdp_answer");
        })
        .catch(rtc.onCreateSessionDescriptionError);
        rtc.setStatus(connectionId,'sdp_answering');
    };
    
    /**
     * Create local media stream
     */
    rtc.createStream = function (connectionId, opt, onSuccess, onFail) {
        onSuccess = onSuccess || function(stream) {};
        onFail = onFail || function(e) {
            rtc.debug("Could not connect stream with error:");
            rtc.debug(e);
        };

        try{
            rtc.fire('media_request_start');
            var media = $.extend({}, rtc.config.mediaConstraints, opt);
            
            navigator.mediaDevices.getUserMedia(media)
            .then(function(stream) {
                //after full media request is done
                var onMediaDone = function(success){
                    rtc.fire('media_request_end');
                    //call dropped in the meantime
                    if(rtc.refuseIdleState(connectionId)){
                        stream.stop();
                        return false;
                    }
                    if(connectionId){
                        rtc.connections[connectionId].stream = stream;
                    }
                    rtc.fire('stream_added',stream, connectionId);
                    onSuccess(stream);                                    
                };
                
                //append audio track, eg. for desktop share
                if(media.audioAppend){
                    rtc.addAudioTrack(stream, onMediaDone);
                } else {
                    onMediaDone(true);
                }
            })
            .catch(function(e) {
                rtc.fire('media_request_end');
                onFail(e);
                rtc.fire('stream_error', e);                
            });
        }
        catch(e){
            rtc.fire('media_request_end');
            rtc.fire('stream_error', e);
        }               
    };
    
    /**
     * Add audio track to existing stream
     * @param {MediaStream} stream
     */   
    rtc.addAudioTrack = function(stream, onDone){        
        navigator.mediaDevices.getUserMedia({audio: true, video: false})
        .then(function(newStream) {
            stream.addTrack(newStream.getAudioTracks()[0]);
            onDone(true);            
        })
        .catch(function(err) {
            onDone(false);
        });
    };    

    /**
     * Create new local peer connection for stream id
     */
    rtc.createPeerConnection = function (connectionId) {
        rtc.debug('createPeerConnection for id: ' + connectionId);
        try{
            rtc.connections[connectionId].pc = new window.RTCPeerConnection(rtc.config.pcConfig);
            rtc.connections[connectionId].pc.onicecandidate = function(event) {
                rtc.debug('pc.onicecandidate, event:');rtc.debug(event);
                if (event.candidate) {
                    rtc.send({
                        "type": "ice_candidate",
                        "data": {
                            "candidate": event.candidate.candidate,
                            "connectionId": connectionId,
                            "label": event.candidate.sdpMLineIndex
                        }
                    });
                }
                else{
                    rtc.debug('End of ICE candidates');
                }
            };
            rtc.debug('Created RTCPeerConnnection with:\n'+'  config: \'' + JSON.stringify(rtc.config.pcConfig) + '\';\n'+ '  constraints: \''+JSON.stringify(rtc.config.pcConstraints)+'\'.');
        } catch (e) {
            console.error(e);
            rtc.debug("Failed to create RTCPeerConnection, exception: " + e.message);
            rtc.fire('pc_error', e);
            alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
            return null;
        }
        var pc = rtc.connections[connectionId].pc;

        pc.onconnecting = function () {
            rtc.debug("Session connecting.");
        };

        pc.onopen = function() {
            rtc.debug("Session opened.");
            // TODO: Finalize this API
            rtc.fire('pc_opened',connectionId);
        };
        
        if('ontrack' in window.RTCPeerConnection.prototype){
            pc.ontrack = function(event) {
                rtc.debug("Remote stream/track added.");
                // TODO: Finalize this API
                rtc.fire('rstream_added', event.streams[0], connectionId);
                rtc.setStatus(connectionId,'call');
            };
        } else {
            pc.onaddstream = function(event) {
                rtc.debug("Remote stream added.");
                // TODO: Finalize this API
                rtc.fire('rstream_added', event.stream, connectionId);
                rtc.setStatus(connectionId,'call');
            };            
        }

        pc.onremovestream = function(){
            rtc.debug("Remote stream removed.");
        };
        
        if(rtc.connections[connectionId].stream){
            pc.addStream(rtc.connections[connectionId].stream);
        }
        
        pc.onsignalingstatechange = function(){
            rtc.debug('PC Signaling state changed to: ' + pc.signalingState);
        };
        pc.oniceconnectionstatechange = function(){
            rtc.debug('ICE connection state changed to: ' + pc.iceConnectionState);
        };        
        
        return pc;
    };

    rtc.fileOffer = function (connectionId, fileDesc){
        //create local media stream
        rtc.debug('offering file to connection ' + connectionId);
        rtc.debug(fileDesc);
        rtc.send({
            "type": "file_offer",
            "data": {
                "connectionId": connectionId,
                "fileDesc": fileDesc
            }
        });
    };

    rtc.fileAccept = function (connectionId, fileDesc){
        rtc.debug('accepting file from id: ' + connectionId);
        rtc.debug(fileDesc);
        rtc.send({
            "type": "file_accept",
            "data": {
                "connectionId": connectionId,
                "fileDesc": fileDesc
            }
        });
    };

    rtc.fileCancel = function (connectionId, fileDesc){
        //drop call
        rtc.debug('canceling file sending to ' + connectionId);
        rtc.debug(fileDesc);
        rtc.send({
            "type": "file_cancel",
            "data": {
                "connectionId": connectionId,
                "fileDesc": fileDesc
            }
        });
    };

    rtc.fileSdpOffer = function (connectionId, fileDesc, options) {
        var pc = rtc.fileGetPeerConnection(connectionId, options, true);
        var constraints = rtc.config.offerConstraints;        
        pc.createOffer(constraints).then(function(sessionDescription) {
            pc.setLocalDescription(sessionDescription);
            rtc.send({
                "type": "file_sdp_offer",
                "data": {
                    "connectionId": connectionId,
                    "sdp": sessionDescription,
                    "fileDesc": fileDesc
                }
            });
        })
        .catch(function(error) {
            rtc.debug('Failed to create session description offer: ' + error.toString());
        });
    };

    rtc.fileSdpAnswer = function (connectionId, fileDesc, options) {
        rtc.debug("Answering call connectionId: " + connectionId);
        var pc = rtc.fileGetPeerConnection(connectionId, options);
        pc.setRemoteDescription(new RTCSessionDescription(rtc.connections[connectionId].fileOfferSdp));               
        pc.createAnswer().then(function(sessionDescription) {
            pc.setLocalDescription(sessionDescription);
            rtc.send({
                "type": "file_sdp_answer",
                "data":{
                    "connectionId": connectionId,
                    "sdp": sessionDescription,
                    "fileDesc": fileDesc
                }
            });
        })
        .catch(function(error){
            rtc.debug('Failed to create session description answer: ' + error.toString());            
        });
    };

    /**
     * Create new local peer connection for data channel
     */
    rtc.fileGetPeerConnection = function(connectionId, options, sending) {
        try{
            rtc.debug('fileGetPeerConnection for id: ' + connectionId + ' does not exist, creating it');
            var params = {optional: []};
            
            rtc.connections[connectionId].dpc = new window.RTCPeerConnection(rtc.config.pcConfig,params);
            rtc.connections[connectionId].dpc.onicecandidate = function(event) {
                if (event.candidate) {
                    rtc.send({
                        "type": "file_ice_candidate",
                        "data": {
                            "candidate": event.candidate.candidate,
                            "connectionId": connectionId,
                            "label": event.candidate.sdpMLineIndex
                        }
                    });
                }
            };
        } catch (e) {
            rtc.debug("Failed to create RTCPeerConnection, exception: " + e.message);
            rtc.fire('dpc_error', e);
            alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
            return null;
        }
        var pc = rtc.connections[connectionId].dpc;
        pc.onopen = function() {
            rtc.debug("File peerconnection opened for conn id: "  + connectionId);
        };

        var assignChannelEvents = function(channel){
            if(options.channelOnMessage){
                channel.onmessage = options.channelOnMessage;
            }
            if(options.channelOnOpen){
                channel.onopen = options.channelOnOpen;
            }
            if(options.channelOnClose){
                channel.onclose = options.channelOnClose;
            }
            if(options.channelOnError){
                channel.onerror = options.channelOnError;
            }
        }

        var createSendChannel = function(){
            if(!sending){
                return false;
            }
            rtc.debug('creating send channel');
            rtc.connections[connectionId].sendChannel = rtc.connections[connectionId].dpc.createDataChannel("sendDataChannel" + connectionId);
            rtc.connections[connectionId].sendChannel.binaryType = 'arraybuffer';
            
            assignChannelEvents(rtc.connections[connectionId].sendChannel);
        }
        
        //on receive channel
        pc.ondatachannel = function(event) {
            if(!sending){
                rtc.debug('creating receive channel');
                rtc.connections[connectionId].receiveChannel = event.channel;
                rtc.connections[connectionId].receiveChannel.binaryType = 'arraybuffer';
                
                assignChannelEvents(rtc.connections[connectionId].receiveChannel);
            }
        };
        //send channel
        createSendChannel();
        return pc;
    };

    rtc.fileReceiveProgress = function (connectionId, fileId, packets){
        //create local media stream
        rtc.send({
            "type": "file_receive_progress",
            "data": {
                "connectionId": connectionId,
                "fileId": fileId,
                "packets": packets
            }
        });
    };

    //received ice candidate
    rtc.on('file_ice_candidate', function(data) {
        var pc = rtc.connections[data.connectionId].dpc;
        pc.addIceCandidate(new RTCIceCandidate({sdpMLineIndex:data.label, candidate:data.candidate}));
    });
    
    $.fn.mgRtc = function(config){
        rtc.init(config);
        return rtc;
    };

})( jQuery, window , document );   // pass the jQuery object to this function
