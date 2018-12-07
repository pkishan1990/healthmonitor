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

//mgRtc - file helper

(function( $, window, document, undefined ){
    
    $.fn.mgFileHelper = function(rtc){
        var fileHelper = {
            getDesc: function(file){
                if(!file.id){
                    file.id = (Math.random() * new Date().getTime()).toString(36).toUpperCase().replace( /\./g , '-');
                }
                return {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    id: file.id,
                    connectionId: file.connectionId,
                    firefox: rtc.firefox,
                    transfered: 0
                };
            },
            send: function(file, channel, options) {
                var packetSize = 16384,
                    fileData;
                var reader = new window.FileReader();
                
                var loadAndSend = function(event, offset) {
                    //only once event is sent
                    if (event) {
                        offset = 0;
                        fileData = event.target.result;
                    }
                    var last = fileData.byteLength <= (offset + packetSize);
                    var dataToSend = fileData.slice(offset, packetSize + offset);
                    rtc.debug('Sending file packet of bytes:' + dataToSend.byteLength + ', offset was: ' + offset + ', of total file size: ' + fileData.byteLength);
                    //send over rtc
                    channel.send(dataToSend);
                    var progress = {
                        transfered: dataToSend.byteLength,
                        fileId: file.id
                    };
                    //progress event
                    if (options.onFileProgress){
                        options.onFileProgress(progress, file);
                    }
                    //sent event
                    if(last && options.onFileSent){
                        options.onFileSent(progress);
                    }
                    //next text
                    var timeout = 0;
                    if(options.calcTimeout){
                        timeout = options.calcTimeout(progress);
                        //if to less 0 this is signal to stop sending
                        if(timeout < 0){
                            return;
                        }
                    }
                    //schedule next transmission
                    if (!last) {
                        setTimeout(function() { loadAndSend(null, offset + packetSize); }, timeout);
                    }
                };
                
                reader.onload = loadAndSend;
                //read actual file
                reader.readAsArrayBuffer(file);
            },
            recContent: {},
            recNumberOfBytes: {},        
            receive: function(fileDesc, data, options) {            
                var id = fileDesc.id;
                
                if (!fileHelper.recNumberOfBytes[id]){
                    fileHelper.recNumberOfBytes[id] = 0;
                }
                
                fileHelper.recNumberOfBytes[id] += data.byteLength;

                if (options.onFileProgress){
                    options.onFileProgress({
                        transfered: data.byteLength,
                        fileId: id
                    }, id);
                }
                
                rtc.debug('received file packet, file name: [' + fileDesc.name + '], bytes: [' + data.byteLength + ']');

                if (!fileHelper.recContent[id]){
                    fileHelper.recContent[id] = [];
                }
                fileHelper.recContent[id].push(data);
                // if it is last packet
                if (fileHelper.recNumberOfBytes[id] === fileDesc.size) {
                    var blob = new window.Blob(fileHelper.recContent[id], {type : fileDesc.type});
                    var virtualURL = (window.URL || window.webkitURL).createObjectURL(blob);

                    // if you don't want to auto-save to disk:
                    // channel.autoSaveToDisk=false;
                    if (options.autoSaveToDisk){
                        fileHelper.saveToDisk(virtualURL, fileDesc.name);
                    }                    
                    // channel.onFileReceived = function(fileName, file) {}
                    // file.blob || file.dataURL || file.url || file.uuid
                    if (options.onFileReceived){
                        options.onFileReceived(fileDesc.name, {
                            blob: blob,
                            dataURL: virtualURL,
                            url: virtualURL,
                            fileId: id
                        });               
                    }
                    delete fileHelper.recContent[id];
                }
            },
            saveToDisk: function(fileUrl, fileName) {
                var hyperlink = document.createElement('a');
                hyperlink.href = fileUrl;
                hyperlink.target = '_blank';
                hyperlink.download = fileName || fileUrl;

                var mouseEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                
                hyperlink.dispatchEvent(mouseEvent);
                
                setTimeout(function() {                    
                    (window.URL || window.webkitURL).revokeObjectURL(hyperlink.href);
                }, 500);
            },
            dataUrlToBlob: function(dataURL) {
                var binary = atob(dataURL.substr(dataURL.indexOf(',') + 1));
                var array = [];
                for (var i = 0; i < binary.length; i++) {
                    array.push(binary.charCodeAt(i));
                }

                var type;

                try {
                    type = dataURL.substr(dataURL.indexOf(':') + 1).split(';')[0];
                } catch (e) {
                    type = 'text/plain';
                }
                return new Blob([new Uint8Array(array)], {type: type});
            }
        };        
        return fileHelper;
    }

})( jQuery, window , document );   // pass the jQuery object to this function



//mgNotifications - notifications helper

(function( $, window, document, undefined ){
    
    $.fn.mgNotifications = function(rtc){
        var notificationsHelper = {
            grant: function(cb){
                if(this.checkActive()){
                    return true;
                }
                // Otherwise, we need to ask the user for permission
                window.Notification.requestPermission(function (permission) {
                    if(cb){
                        cb(permission);
                    }
                });                
            },
            
            checkActive: function(){
                // Let's check if the browser supports notifications
                if (!("Notification" in window)) {
                    return false;
                }
                // granted already
                if (window.Notification.permission === "granted") {                    
                    return true;
                }
                //deniend already
                if (window.Notification.permission === 'denied') {
                    return false;
                }           
            },
            notify: function(title, options, showOnVisible) {                
                if(!showOnVisible && !document.hidden){
                    return false;
                }
                console.log('notify', title, showOnVisible,  document.hidden);
                if(!this.checkActive()){
                    return false;
                }
                var notification = new Notification(title, options);
                //open window on click
                notification.onclick = function(event) {
                    event.preventDefault();
                    window.focus();
                    this.close();
                };
            }           
        };        
        return notificationsHelper;
    };

})( jQuery, window , document );   // pass the jQuery object to this function



//mgRtc - Desktop share

(function( $, window, document, undefined ){
    
    $.fn.mgDesktopShare = function(rtc){
        var desktopShareHelper = {
            extensionAvailable: null,
            screenCallback: null,
            
            /**
           * Is chrome extension loaded
           */
            isExtensionAvailable: function (callback) {
                var self = this;
                if (this.extensionAvailable !== null){
                    return callback(this.extensionAvailable);
                }
                //send question message
                window.postMessage({message: 'mgIsLoaded'}, '*');

                //wait for back message
                setTimeout(function() {
                    if (self.extensionAvailable == null){
                        self.extensionAvailable = false;
                    }
                    callback(self.extensionAvailable);
                }, 200);
            },

            /**
           * Get screen source id
           */
            getSourceId: function (callback) {
                var self = this;
                this.isExtensionAvailable(function(available){
                    if(!available){
                        callback(false, 'no-extension');
                    }
                    self.screenCallback = callback;
                    //ask for source id
                    window.postMessage({message: 'mgGetSourceId'}, '*');        
                });
            }
        };
        
        //listen to messages from extension content script
        window.addEventListener('message', function(event) {
            if (event.origin != window.location.origin) {
                return;
            }
            //console.log('page event received',event.data);
            switch(event.data.message){
                case 'mgIsLoadedResult':
                    desktopShareHelper.extensionAvailable = true;
                    break;
                case 'mgGetSourceIdResult':
                    if(event.data.success){
                        desktopShareHelper.screenCallback(event.data.sourceId);
                    } else {
                        if (desktopShareHelper.screenCallback){
                            desktopShareHelper.screenCallback(false, 'no-permission');
                        }
                    }
                    break;
                default:
                    return;
            }   
        });        
        
        return desktopShareHelper;
    }

})( jQuery, window , document );



//mgVideoChat Utils

(function( $, window, document, undefined ){

    
    $.fn.mgVideoChatUtils = function(mgVideoChat, rtc){
        /**
        * Fix relative paths
        */
        mgVideoChat.prototype.fixPath = function(){
            if(this.config.dir != '{rel}'){
                return ;
            }
            var self = this;
            //get relative path
            $('script').each(function(){
                var src = $(this).attr('src');
                var suffix = "mgVideoChat-";
                if(src && src.indexOf(suffix, this.length - suffix.length) !== -1){
                    self.config.dir = src.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '');
                    //try non min version
                    var regex = /mgVideoChat\-(\d*\.\d*\.\d*)\.js/gi;
                    var match = regex.exec(src);
                    if(match && match[1]){
                        self.version = match[1];
                    }
                    else{
                        regex = /mgVideoChat\-(\d*\.\d*\.\d*)\-min\.js/gi;
                        match = regex.exec(src);
                        if(match && match[1]){
                            self.version = match[1];
                        }
                        else{
                            self.version = 1
                        }
                    }                
                }
                else{
                    suffix = "mgVideoChat";
                    if(src && src.indexOf(suffix, this.length - suffix.length) !== -1){
                        self.config.dir = src.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '');
                        self.version = 1;
                    }
                }
            });
        }
        
        /**
        * Write to console if config.debug
        * @param {string} message
        *
        */
        mgVideoChat.prototype.debug = function(message){
            if(this.config.debug){
                console.log(message);
            }
        };

        /**
        * Read Stream error human readable text
        *
        */
        mgVideoChat.prototype.getErrorText = function(e){
            var message = [];
            if(e.code){
                message.push(e.code);
            }
            if(e.name){
                message.push(e.name);
            }
            if(e.message){
                message.push(e.message);
            }
            if(message.length == 0){
                message.push(e);
            }
            if(message[0] == 'PermissionDeniedError' || message[0] == 'PERMISSION_DENIED'){
                if(rtc.firefox){
                    message.push(this._('Please enable requested media devices'));
                }
                else{
                    message.push(this._('Please enable requested media devices by clicking on the right hand icon in the address bar.'));
                }            
            }
            return message.join(".\n");
        };    

        /**
        * Get human readable file size
        */
        mgVideoChat.prototype.getReadableFileSizeString = function(fileSizeInBytes) {
            var i = -1;
            var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
            do {
                fileSizeInBytes = fileSizeInBytes / 1024;
                i++;
            } while (fileSizeInBytes > 1024);
            return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
        }
        
        /**
        * Process chat message
        */
        mgVideoChat.prototype.parseChatMessageText = function(messageText){
            function nl2br (str, is_xhtml) {
                var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
                return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
            }
            function replaceURLWithHTMLLinks(text) {
                var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
                return text.replace(exp,"<a target=\"_blank\" href='$1'>$1</a>");
            }
            function linkify(inputText) {
                var replacedText, replacePattern1, replacePattern2, replacePattern3;
                //URLs starting with http://, https://, or ftp://
                replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
                replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');
                //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
                replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
                replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');
                //Change email addresses to mailto:: links.
                replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
                replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');
                return replacedText;
            }        

            return nl2br(linkify($.fn.mgVideoChat.htmlspecialchars(messageText)),false);
        }
        
        var cache = {};

        /**
        * Simple JavaScript Templating
        * John Resig - http://ejohn.org/ - MIT Licensed
        *
        */
        mgVideoChat.prototype.tmpl = function (str, data){
            try {
                // Figure out if we're getting a template, or if we need to
                // load the template - and be sure to cache the result.
                var fn = !/\W/.test(str) ?
                cache[str] = cache[str] ||
                tmpl(document.getElementById(str).innerHTML) :

                // Generate a reusable function that will serve as a template
                // generator (and which will be cached).
                new Function("obj",
                    "var p=[],print=function(){p.push.apply(p,arguments);};" +

                    // Introduce the data as local variables using with(){}
                    "with(obj){p.push('" +

                    // Convert the template into pure JavaScript
                    str
                    .replace(/[\r\t\n]/g, " ")
                    .split("<%").join("\t")
                    .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                    .replace(/\t=(.*?)%>/g, "',$1,'")
                    .split("\t").join("');")
                    .split("%>").join("p.push('")
                    .split("\r").join("\\'")
                    + "');}return p.join('');");

                // Provide some basic currying to the user
                return data ? fn( data ) : fn;            
            }
            catch(err) {
                throw new Error("Error parsing template [" + str.substr(0, 100) + '...]');
                this.debug(err);
            }
        };

        var tpls = {};

        /**
        * Load template by name
        */
        mgVideoChat.prototype.loadTplByName = function(tplName, callback){
            return this.loadTpl(this.config.dir + this.config[tplName] + '?v=' + this.version, callback);
        };

        /**
        * Load template
        */
        mgVideoChat.prototype.loadTpl = function(url,callback){
            if(tpls[url] == null){
                $.get(url, function(data){
                    tpls[url] = data;
                    if(callback){
                        callback(data);
                    }
                }, 'html');
            }
            else{
                if(callback){
                    callback(tpls[url]);
                }
            }
            return tpls[url];
        };

        /**
        * attach event handlers
        * 
        * @param {string} eventName
        * @param {function} callback
        * @returns {undefined}
        */
        mgVideoChat.prototype.on = function(eventName, callback) {
            this.events[eventName] = this.events[eventName] || [];
            this.events[eventName].push(callback);
        };

        /**
        * fire event handler
        *  
        * @param {string} eventName
        * @param {mixed} _
        * @returns {mixed}
        */
        mgVideoChat.prototype.fire = function(eventName, _) {
            this.debug("mgVideoChat fired [" + eventName + "]");
            var events = this.events[eventName];
            var args = Array.prototype.slice.call(arguments, 1);

            if (!events) {
                return;
            }
            //fire all handlers for this event
            for (var i = 0, len = events.length; i < len; i++) {
                events[i].apply(null, args);
            }
        };
        
        var messageTimeout = null;
        /**
        * Show alter message on top
        *
        * @param {string} messageText is empty hieds message
        * @param {string} messageType success, warning, danger
        * @param {int} expire in seconds
        */
        mgVideoChat.prototype.message = function(messageText, messageType, expire) {
            if(messageTimeout){
                window.clearTimeout(messageTimeout);
            }
            var self = this;
            var $alert = self.$messagePanel.find(".alert");
            var currType = self.$messagePanel.data("type");
            if (!messageText) {
                self.$messagePanel.hide();
                return;
            }
            $alert.removeClass("alert-" + currType).addClass("alert-" + messageType);
            $alert.find("div.text").html(messageText);
            self.$messagePanel.data("type", messageType);
            self.$messagePanel.show();
            if(expire){
                messageTimeout = window.setTimeout(function(){
                    self.$messagePanel.hide();
                    messageTimeout = null;
                }, expire * 1000);
            }
        };

        mgVideoChat.prototype.setCookie = function( cookieName, cookieValue, days, domain){
            var domainString = (domain && domain != 'localhost')? ("; domain=" + domain) : '';
            document.cookie = cookieName + "=" + encodeURIComponent(cookieValue) + "; max-age=" + (60 * 60 * 24 * days) + "; path=/" + domainString;
        };

        /**
        * Translate function
        *  
        * @param {string} key
        * @param {array} find
        * @param {array} replace
        * @returns {string}
        */
        mgVideoChat.prototype._ = function(key, find, replace) {
            return $.fn.mgVideoChat._(key, find, replace);
        };
        
        

    }

})( jQuery, window , document );   // pass the jQuery object to this function



//mgVideoChat - rtc event handlers

;
(function( $, window, document, undefined ){
    $.fn.mgVideoChatRtcEvents = function(mgVideoChat, rtc, fileHelper, notificationHelper){
        /**
        * Init RTC
        *
        */
        mgVideoChat.prototype.initRtc = function(){
            var self = this;
            //rtc events
            rtc.on('connected', function(){
                //connected now login
                rtc.login(self.loginParams);
                self.onConnected();
            });
            //received local id
            rtc.on('connectionId', function(data) {
                self.connectionId = data.connectionId;
                self.userData = data.data.data.userData;
                self.roomOptions = data.room;
                self.usersCount = data.users_count;
                self.onRoomOptions();
                self.renderYouInfo();
            });        
            //logged in
            rtc.on('logged', function(){
                //fire event
                self.fire('logged');
                
                self.onLogged();
            });

            //system message
            rtc.on('message', function(data) {
                self.message(data.text,data.type);
            });

            //chat
            rtc.on('chat_message', function(data) {
                //fire event
                self.fire('chat_message', data);
                
                var chatId = self.roomOptions.group? 0:data.connectionId;
                self.renderChatMessage(chatId, data.connectionId, data.message);
                //pending message
                if(self.chatId != data.connectionId){
                    if(!rtc.connections[data.connectionId]['data'].unread){
                        rtc.connections[data.connectionId]['data'].unread = 0;
                    }
                    rtc.connections[data.connectionId]['data'].unread ++;
                    self.renderConnection(data.connectionId);
                    self.notifySound();
                }
                notificationHelper.notify(self._('New chat message arrived'));
            });

            var rouletteNextRounds = 0;
            //chat
            rtc.on('call_busy', function(data) {
                if(self.roomOptions.roulette && rouletteNextRounds < 5){
                    self.debug('Callee is busy, try again ' + rouletteNextRounds);
                    rouletteNextRounds++ ;
                    self.rouletteNext();
                    return;
                }
                self.message(self._('Callee is busy at the moment, please try later :('),'danger',3);
            });

            rtc.on('call_drop', function(data) {
                //if roulette do NOT close stream
                rtc.stop(data.connectionId, false, self.roomOptions.roulette);
                //if roulette than we lost peer, we need to re-render
                if(self.roomOptions.roulette){
                    rtc.connections = {};
                    self.renderConnections();
                }
            });

            //media
            rtc.on('media_ready', function(data) {
                for(var i in data.data.connectionIds){
                    rtc.connections[data.data.connectionIds[i]]['media_ready'] = true;
                    if(self.localStream && !rtc.connections[data.data.connectionIds[i]]['stream']){
                        rtc.connections[data.data.connectionIds[i]]['stream'] = self.localStream;
                    }
                }
                self.debug(rtc.connections);
            });

            rtc.on('connections', function(data){
                self.renderConnections();
            });

            var rouletteNextData = {};

            rtc.on('roulette_next', function(data) {
                if(!data || !data.connections){
                    self.message(self._('No partner found at the moment. Please try later.'),'warning',3);
                    return false;
                }
                self.usersCount = data.users_count;
                rtc.connections = {};
                //just remember this selection and wait for roulette_accept
                rouletteNextData = data;
            });

            rtc.on('roulette_accept', function(data) {
                rtc.connections = rouletteNextData.connections;
                rtc.connectionsLoaded = true;
                rouletteNextData = {};
                //assign local stream
                for(var id in rtc.connections){
                    self.localVideoOpen(self.localStream, id);
                }
                self.connectAllMediaReady();
                self.renderConnections();
                self.notifySound();
            });

            rtc.on('roulette_invitation', function(data) {
                self.usersCount = data.users_count;
                //already in call?
                if(self.videoId){
                    //get connection id from data
                    for(var id in data.connections){}
                    self.debug('Busy for invitation from ' + id);
                    //send busy signal
                    rtc.busy(id);
                    //drop call
                    rtc.drop(id);
                    return false;
                }
                rtc.connections = data.connections;
                rtc.connectionsLoaded = true;
                //assign local stream
                for(var id in rtc.connections){
                    rtc.connections[id].stream = self.localStream;
                }
                //accept invitation
                rtc.rouletteAccept(id);
                self.localVideoOpen(self.localStream, id);
                self.renderConnections();
                self.notifySound();
            });

            rtc.on('connection_add', function(data) {
                self.usersCount = data.users_count;
                self.renderConnection(data.connectionId);
            });

            rtc.on('connection_remove', function(data) {
                self.usersCount = data.users_count;
                self.onConnectionClose(data.connectionId);
            });

            rtc.on('rstream_added', function(stream, connectionId){
                rtc.connections[connectionId].rstream = stream;
                if(!self.roomOptions.group){
                    self.remoteVideoOpen(stream);
                    self.onVideoOpen(connectionId);
                }
                else{
                    self.remoteVideoGroupSelect();
                }
            });

            rtc.on('stream_added', function(stream, connectionId){
                //set local stream
                self.localStream = stream;
                self.localVideoOpen(stream, connectionId);
            });

            rtc.on('media_request_start',function(){
                self.$elem.find('#requestDialog').modal('show');
            });

            rtc.on('media_request_end',function(){
                self.$elem.find('#requestDialog').modal('hide');
            });

            rtc.on('status',function(connectionId,status){
                //fire event
                self.fire('call_status', connectionId, status);
                
                switch (status) {
                    case 'call_inviting':
                        self.callRing(false);
                        break;
                    case 'call_invited':
                        //already in call?
                        if(self.videoId){
                            //send busy signal
                            rtc.busy(connectionId);
                            //drop call
                            rtc.drop(connectionId);
                        }
                        else{
                            self.inviteStart(connectionId);
                            notificationHelper.notify(self._('New call invitation'));
                        }
                        break;
                    case 'call_accepting':
                    case 'call_accepted':
                        self.$videoPanel.data('call_id',connectionId);
                        self.inviteStop();
                        break;
                    case 'idle':
                        self.callRing(true);
                        if(self.videoId == connectionId){
                            self.onVideoClose();
                        }
                        if(self.videoInvitedId == connectionId){
                            self.inviteStop();
                        }
                        break;
                    default:
                        break;
                }
                self.renderConnection(connectionId);
            });

            rtc.on('socket_error',function(e){
                self.message(self._('Error connecting to media server: {error_name} {error_message}',['{error_name}','{error_message}'],[e.name,e.message]),'danger');
                self.onDisconnected();
            });

            rtc.on('socket_closed',function(e){
                self.message(self._('Websocket closed, please try reloading page later.'),'danger');
                self.onDisconnected();
            });

            rtc.on('stream_error',function(e){
                self.message(self._('Error getting local media stream: {error_message}',['{error_message}'],[self.getErrorText(e)]),'danger');
            });

            rtc.on('pc_error',function(e){
                self.message(self._('Error creating peer connection: {error_name} {error_message}', ['{error_name}','{error_message}'],[e.name,e.message]),'danger');
            });

            rtc.on('sdp_offer', function(data) {
                if(rtc.refuseIdleState(data.connectionId)){
                    return false;
                }
                rtc.connections[data.connectionId].offerSdp = data.sdp;
                rtc.setStatus(data.connectionId, 'sdp_offered');
                if(!self.loginParams.noPc && !self.loginParams.noMedia){
                    rtc.sdpAnswer(data.connectionId);
                }            
            });

            rtc.on('sdp_answer', function(data) {
                if(rtc.refuseIdleState(data.connectionId)){
                    return false;
                }
                var pc = rtc.connections[data.connectionId].pc;
                rtc.remoteSDReceive(pc, data.sdp);

                rtc.setStatus(data.connectionId, 'sdp_answered');
            }); 

            //received ice candidate
            rtc.on('ice_candidate', function(data) {
                if(rtc.refuseIdleState(data.connectionId)){
                    return false;
                }
                if(self.loginParams.noPc || self.loginParams.noMedia){
                    return false;
                }             
                var pc = rtc.connections[data.connectionId].pc;
                rtc.debug('Adding ice candidate:');
                rtc.debug({sdpMLineIndex:data.label, candidate:data.candidate});
                
                pc.addIceCandidate(new RTCIceCandidate({sdpMLineIndex:data.label, candidate:data.candidate}))
                .then(function(){
                    rtc.debug('Remote candidate added successfully.');
                })
                .catch (function (error) {
                    rtc.debug('Failed to add remote candidate: ' + error.toString());
                });
            });        

            rtc.on('file_offer', function(data) {            
                var connectionId = data.connectionId;
                var userData = rtc.connections[connectionId].data.userData;
                self.files[data.fileDesc.id] = {
                    desc: data.fileDesc,
                    'connectionId': connectionId,
                    pending: true
                };
                /*if(data.fileDesc.firefox != rtc.firefox){
                    self.message(self._('You and your peer are not using the same browser. File transfer between different browser most likely will not work.'), 'warning');
                }*/
                self.renderFiles();
                self.$fileAcceptDialog.data('file_desc',data.fileDesc);
                self.$fileAcceptDialog.data('connection_id',connectionId);
                self.$fileAcceptDialog.find('.username').text(userData['name']);
                if(userData.image){
                    self.$fileAcceptDialog.find('.desc').html('<img src="' + userData.image + '" alt="' + userData['name'] + '"/>');
                }
                self.$fileAcceptDialog.find('.fileName').text(data.fileDesc.name);
                self.$fileAcceptDialog.find('.fileSize').text(self.getReadableFileSizeString(data.fileDesc.size));
                self.$fileAcceptDialog.modal('show');
                self.notifySound();
                notificationHelper.notify(self._('New file offer'));
            });

            rtc.on('file_accept', function(data) {
                /*if(data.fileDesc.firefox != rtc.firefox){
                    self.message(self._('You and your peer are not using the same browser. File transfer between different browser most likely will not work.'), 'warning');
                }*/
                //send sdp offer
                rtc.fileSdpOffer(data.connectionId, data.fileDesc, {
                    channelOnOpen: function(){
                        self.debug('channelOnOpen connId: '  + data.connectionId);
                        self.debug(data);
                        var channel = rtc.connections[data.connectionId].sendChannel;
                        var fileId = data.fileDesc.id;
                        var file = self.files[fileId].file;
                        fileHelper.send(file, channel, {
                            onFileProgress: function(param){
                                self.debug('onFileProgress ' + fileId + ' connId: '  + data.connectionId);
                                self.debug(param);
                                if(self.files[param.fileId]){
                                    self.files[param.fileId].desc.transfered += param.transfered;
                                    self.renderFileProgress(param.fileId);
                                }
                            },
                            onFileSent: function(param){
                                self.debug('onFileSent ' + fileId + ' connId: '  + data.connectionId);
                                self.debug(param);
                                delete self.files[param.fileId];
                                self.renderFiles();
                            },
                            calcTimeout: function(param){
                                if(!self.files[param.fileId]){
                                    //means file is canceled
                                    return -1;
                                }
                                return (rtc.firefox)? 5: 500;
                            }
                        });
                    }
                });
            });

            rtc.on('file_receive_progress', function(data) {
                if(!self.files[data.fileId]){
                    return;
                }
                self.files[data.fileId].packetsConfirmed = data.packets;            
            });

            rtc.on('file_sdp_offer', function(data) {
                var connectionId = data.connectionId;
                var fileId = data.fileDesc.id, fileDesc = data.fileDesc;
                rtc.connections[data.connectionId].fileOfferSdp = data.sdp;
                rtc.fileSdpAnswer(data.connectionId, data.fileDesc, {
                    channelOnMessage: function(param){                    
                        var fileData = param.data;
                        self.debug('channelOnMessage connId: '  + connectionId);
                        fileHelper.receive(fileDesc, fileData, {
                            onFileProgress: function(param){
                                self.debug('onFileProgress ' + fileId + ' connId: '  + connectionId);
                                self.debug(param);
                                if(self.files[param.fileId]){
                                    //rtc.fileReceiveProgress(connectionId, fileId, param.received);
                                    self.files[param.fileId].desc.transfered += param.transfered;
                                    self.renderFileProgress(param.fileId);
                                }
                            },
                            autoSaveToDisk: true,
                            onFileReceived: function(name, param){
                                self.debug('onFileReceived file: ' + name + ', file id: ' + fileId + ' connId: '  + connectionId);
                                self.debug(param);
                                delete self.files[param.fileId];
                                self.renderFiles();
                                notificationHelper.notify(self._('New file received'));
                            }
                        });
                    }
                });
            });

            rtc.on('file_sdp_answer', function(data) {
                var pc = rtc.connections[data.connectionId].dpc;
                pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            });

            rtc.on('file_cancel', function(data) {
                delete self.files[data.fileDesc.id];
                self.renderFiles();
            });
        };
        
    }
        
})( jQuery, window , document );   // pass the jQuery object to this function

//mgVideoChat UI

(function( $, window, document, undefined ){

    
    $.fn.mgVideoChatUI = function(mgVideoChat, rtc, fileHelper, desktopShare){

        mgVideoChat.prototype.updateLayout = function(){
            var mainVisible = this.$callPanel.is(":visible") || this.$chatPanel.is(":visible");
            var $mainContent = this.$elem.find('#mainContent');
            var $sideMenu = this.$elem.find('#sideMenu');
            if($mainContent.data('is_visible')  === mainVisible){
                return false;
            }
            if(mainVisible){
                $mainContent.removeClass().addClass($mainContent.data('chat_class'));
                $sideMenu.removeClass().addClass($sideMenu.data('chat_class'));
                $('#offcanvasButton').show();
            }
            else{
                $mainContent.removeClass().addClass($mainContent.data('no_chat_class'));
                $sideMenu.removeClass().addClass($sideMenu.data('no_chat_class'));
            }
            $mainContent.data('is_visible',mainVisible);
        };

        /**
        * Render Connections (Peers)
        */
        mgVideoChat.prototype.renderConnections = function(){
            var self = this;
            self.debug('connections');self.debug(rtc.connections);
            //load and parse templetes - first conns tpl
            this.loadTplByName('tplConnections', function(connTpl){
                var content = self.tmpl(connTpl, {
                    rows:rtc.connections,
                    roomOptions: self.roomOptions,
                    usersCount: self.usersCount
                });
                self.$connectionsPanel.html(content);
                for ( var id in rtc.connections){
                    self.renderConnection(id);
                }
                if(!rtc.connections.length){
                    self.$connectionsPanel.find('#lonely').show();
                }
                //fire event
                self.fire('connections',rtc.connections);
            });
        };

        /**
        * Render/Update an connection
        */
        mgVideoChat.prototype.renderConnection = function(connectionId){
            var self = this;
            this.getConnectionElement(connectionId, function($connEl){
                //conn exists
                var $existing = self.$connectionsPanel.find("#connection_" + connectionId);
                if($existing.length){
                    //keep active
                    if($existing.hasClass('active')){
                        $connEl.addClass('active');
                    }
                    $existing.replaceWith($connEl);
                }
                //new conn
                else{
                    self.$connectionsPanel.find('#connections').append($connEl);
                }
                self.$connectionsPanel.find('#lonely').hide();
                //fire event
                self.fire('connections',rtc.connections);
            });        
        };

        /**
        * Generate and return on callback a connection DOM
        */
        mgVideoChat.prototype.getConnectionElement = function(connectionId, callback){
            var self = this;
            if(!rtc.connections[connectionId]){
                return false;
            }
            //load and parse templete
            this.loadTplByName('tplConnection', function(connTpl){
                var connection = rtc.connections[connectionId],
                    status = connection.status?connection.status:'idle';
                var connLoginParams = connection['data']['loginParams'];
                var hasWebrtc =   !self.loginParams['noPc'] && !self.loginParams['noMedia'] &&
                                !connLoginParams['noPc'] && !connLoginParams['noMedia'];
                var data = {
                    id: connectionId,
                    status: status,
                    userData: connection['data']['userData'],
                    loginParams: connection['data']['loginParams'],
                    videoId: self.videoId,
                    chatId: self.chatId,
                    unread: (connection['data'].unread)?connection['data'].unread:0,
                    'connection': connection,
                    roomOptions: self.roomOptions,
                    'hasWebrtc': hasWebrtc,
                    selfLoginParams: self.loginParams
                };

                function itemSelect($item){
                    self.$connectionsPanel.find(".connectionItem").removeClass('active');
                    $item.addClass('active');
                }

                var $content = $(self.tmpl(connTpl, data));
                //group call
                if (self.roomOptions.group && connection.rstream){
                    self.videoSetStream($content.find('video'), connection.rstream);
                }
                if (self.roomOptions.group){
                    //DOM
                    $content.click(function(){
                        itemSelect($(this));
                        var connectionId = $(this).data('connection_id');
                        if(rtc.connections[connectionId].rstream){
                            self.remoteVideoOpen(rtc.connections[connectionId].rstream, connectionId);
                        }                    
                    });
                }
                else{
                    //DOM
                    $content.click(function(){
                        itemSelect($(this));
                        self.setChat($(this).data('connection_id'));
                    });
                }
                //button call
                $content.find(".call.cmdBtn").click(function(){
                    rtc.invite($(this).data("id"), self.getMediaOptions({
                        audio:true,
                        video:true
                    }));
                });
                
                //button share desktop
                $content.find(".callDesktop.cmdBtn").click(function(){
                    var btn = this;                    
                    self.getDesktopShareMedia(function(mediaOptions){
                        if(!mediaOptions){
                            return false;
                        }
                        rtc.invite($(btn).data("id"), mediaOptions);                        
                    });
                });
                
                $content.find(".callAudio.cmdBtn").click(function(){
                    rtc.invite($(this).data("id"), self.getMediaOptions({
                        audio:true,
                        video:false
                    }));
                });
                //button answer
                $content.find(".answer.cmdBtn").click(function(){
                    self.debug("Clicked to answer the connectionId: " + $(this).data("id"));
                    rtc.accept($(this).data("id"), self.getMediaOptions({
                        audio:true,
                        video:true
                    }));
                });
                //button drop
                $content.find(".drop.cmdBtn").click(function(){
                    self.debug("Clicked to drop the connectionId: " + $(this).data("id"));
                    //keep stream if roulette
                    rtc.drop($(this).data("id"), false, self.roomOptions.roulette);
                });
                //button senf file
                $content.find(".fileSend.cmdBtn").click(function(){
                    var sendConnId = $(this).data("id");
                    self.debug("Clicked to send file to the connectionId: " + sendConnId);
                    $('#fileDialog').off('change'); //reset change event
                    $('#fileDialog').val('');//clean old file path
                    $('#fileDialog').on('change',function(evt){
                        var files = evt.target.files;
                        for (var i = 0, f; f = files[i]; i++) {
                            f.connectionId = sendConnId;
                            var fileDesc = fileHelper.getDesc(f);
                            if(self.config.fileMaxSize && fileDesc.size > self.config.fileMaxSize){
                                self.message(self._('This file size of over maximum defined of {max_size}',['{max_size}'],[self.getReadableFileSizeString(self.config.fileMaxSize)]) , 'danger');
                                continue;
                            }
                            rtc.fileOffer(sendConnId, fileDesc);
                            self.files[f.id] ={
                                file: f,
                                desc: fileDesc,
                                connectionId: sendConnId
                            };
                            self.renderFiles();
                        }
                    });                
                    $('#fileDialog').trigger('click');
                });

                if(self.chatId == connectionId){
                    $content.addClass('active');
                }
                callback($content);
            });
        };

        /**
        * Render Files
        */
        mgVideoChat.prototype.renderFiles = function(){
            var self = this;
            self.debug('files');self.debug(self.files);
            //load and parse templetes
            this.loadTplByName('tplFile', function(fileTpl){
                var filesContent = '';
                for ( var fileId in self.files){
                    var fileContent = self.tmpl(fileTpl, {
                        file: self.files[fileId],
                        'fileId': fileId,
                        fileSize: self.getReadableFileSizeString(self.files[fileId].desc.size),
                        roomOptions: self.roomOptions
                    });
                    filesContent += fileContent;
                }
                self.$filesPanel.find('#files').html(filesContent);
                self.$filesPanel.find('a.fileAccept').click(function(){
                    var fileId = $(this).data('file_id');
                    var fileDesc = self.files[fileId].desc;
                    var connectionId = self.files[fileId].connectionId;
                    self.fileAccept(fileDesc, connectionId);
                    return false;
                });
                self.$filesPanel.find('a.fileCancel').click(function(){
                    var fileId = $(this).data('file_id');
                    var fileDesc = self.files[fileId].desc;
                    var connectionId = self.files[fileId].connectionId;
                    self.fileCancel(fileDesc, connectionId);
                    return false;
                });
                if(filesContent == ''){
                    self.$filesPanel.hide();
                }
                else{
                    self.$filesPanel.show();
                }
            });
        };

        /**
        * Render Info about logged in user
        */
        mgVideoChat.prototype.renderYouInfo = function(){
            var self = this;
            self.debug(self.userData);
            //load and parse templetes
            this.loadTplByName('tplYou', function(youTpl){
                self.$youInfoPanel.find('#youInfo').html(self.tmpl(youTpl,{userData: self.userData}));
                if(!self.userData){
                    self.$youInfoPanel.hide();
                }
                else{
                    self.$youInfoPanel.show();
                }
            });
        };


        /**
        * Render File Progress
        */
        mgVideoChat.prototype.renderFileProgress = function(fileId){
            var fileDesc = this.files[fileId].desc;
            if(!fileDesc){
                return false;
            }
            var progress = 0;
            if(fileDesc.size){
                progress = (fileDesc.transfered / fileDesc.size) * 100;
            }
            var $file = this.$filesPanel.find('#file_' + fileId);
            $file.find('.progress-bar').css('width',progress + '%');
            $file.find('.progressText').text(progress + '%');
        };


        /**
        * Render new message
        * 
        * @param {int} chatId
        * @param {int} fromId
        * @param {string} messageText
        * @returns {undefined}
        */
        mgVideoChat.prototype.renderChatMessage = function(chatId, fromId, messageText){
            var self = this;
            var chat = this.getChatDiv(chatId);
            this.loadTplByName('tplChat',function(tpl){
                var data = {
                    "message": self.parseChatMessageText(messageText),
                    "me": false
                };
                if(fromId === self.connectionId){
                    data.me = true;
                    data.userData = self.userData;
                }
                else{
                    data.userData = rtc.connections[fromId]['data']['userData'];
                }
                var message = self.tmpl(tpl, data);
                var messages = chat.find('.messages');
                messages.append(message).scrollTop(messages.get(0).scrollHeight);
            });
        };

        /**
        * get chat dom
        *
        * @param {int} chatId
        * @returns {undefined}
        */
        mgVideoChat.prototype.getChatDiv = function(chatId){
            var self = this;
            //get active chat
            var chat = this.$chatPanel.find('#chat_' + chatId);
            if(!chat.length){
                var tpl = this.loadTplByName('tplChatInput');
                chat = $(self.tmpl(tpl, {"chatId": chatId}));
                chat.appendTo(self.$chatPanel.find('#chats'));
                chat.find('textarea').keypress(function(e){
                    var ta = $(this);
                    if (e.keyCode === 13 && e.shiftKey) {
                        ta.val(ta.val() + "\n");
                        return false;
                    }
                    if (e.keyCode === 13) {
                        rtc.chatMessage(chatId,ta.val());
                        self.renderChatMessage(chatId, self.connectionId, ta.val());
                        ta.val('');
                        return false;
                    }
                });
            }
            return chat;
        };    
        

    }

})( jQuery, window , document );   // pass the jQuery object to this function



//mgVideoChat - main plugin controller

;

(function( $, window, document, undefined ){
    /**
     * Default optons values
     */
    /**
     * default options
     */
    var defaults =
    {
        wsURL: 'ws://localhost:8080',
        dir: '{rel}',
        tplMain:'/tpls/main.html',
        tplConnections:'/tpls/connections.html',
        tplConnection:'/tpls/connection.html',
        tplChat: '/tpls/chat.html',
        tplChatInput: '/tpls/chat_input.html',
        tplRoulette: '/tpls/roulette.html',
        tplFile: '/tpls/file.html',
        tplYou: '/tpls/you.html',
        sound: {
            mp3: '/sounds/ring.mp3',
            ogg: '/sounds/ring.ogg'
        },
        notifySound: {
            mp3: '/sounds/notify.mp3',
            ogg: '/sounds/notify.ogg'
        },
        debug: false,
        login: null,
        rtc: {
            // Holds the STUN server to use for PeerConnections.
            pcConfig: {
                iceServers: [
                    {urls: "stun:stun.l.google.com:19302"}
                ]
            },
            pcConstraints: {"optional": [{"DtlsSrtpKeyAgreement": true}]},
            offerConstraints: {
                'offerToReceiveAudio':1,
                'offerToReceiveVideo':1
            },
            mediaConstraints: {"audio": true, "video": true},
            sdpConstraints: {
                'mandatory':{
                    'OfferToReceiveAudio':true,
                    'OfferToReceiveVideo':true
                },
                'optional':[{'VoiceActivityDetection':false}]
            },
            audio_receive_codec: 'opus/48000'
        },
        fileMaxSize: 512000,
        chromeExtensionId: 'jfepeciommhoefhfacjdpcmnclekenag',
        enableNotifications: true
    },
    rtc = null,
    fileHelper = null,
    desktopShare = null,
    notificationsHelper = null;

    /**
     * mgVideoChat constructor
     *
     * @param {object} elem
     * @param {object} options
     * @return {mgVideoChat}
     */
    var mgVideoChat = function( elem, options ){
        this.version = '1';
        this.elem = elem;
        this.$elem = $(elem);
        this.$connectionsPanel = null;
        this.options = options;
        this.metadata = this.$elem.data("mgVideoChat-options" );
        this.config = $.extend({}, defaults, this.options);
        rtc = $.fn.mgRtc(this.config);
        fileHelper = $.fn.mgFileHelper(rtc);
        desktopShare = $.fn.mgDesktopShare(rtc);
        notificationsHelper = $.fn.mgNotifications(rtc);
        $.fn.mgVideoChatUtils(mgVideoChat, rtc);
        $.fn.mgVideoChatUI(mgVideoChat, rtc, fileHelper, desktopShare);
        $.fn.mgVideoChatRtcEvents(mgVideoChat, rtc, fileHelper, notificationsHelper);
        rtc.init(this.config);
        this.fixPath();
        this.init();
        this.$elem.data("mgVideoChat-instance",this);
        this.chatId = null;
        this.videoId = null;
        this.videoInvitedId = null;
        this.connectionId = null;
        this.userData = {};
        this.roomOptions = {};
        this.localStream = null;        
        this.loginParams = {};
        this.files = {};
        this.isMuted = {
            'audio': false,
            'video': false
        };
        //event handlers
        this.events = {};
    };


    /**
     * Init plugin - update dom, set properties
     */
    mgVideoChat.prototype.init = function(){
        var self = this;              
        //load and parse templetes - first conns tpl
        this.loadTplByName('tplConnections', function(connTpl){
            //load main tpl
            self.loadTplByName('tplMain', function(mainTpl){                 
                self.$elem.html(self.tmpl(mainTpl,{config:self.config}));
                self.$connectionsPanel = self.$elem.find('#connectionsPanel');
                self.$messagePanel = self.$elem.find('#messagePanel');
                self.$loginPanel = self.$elem.find('#loginPanel');
                self.$videoPanel = self.$elem.find('#videoPanel');
                self.$loginDialog = self.$elem.find('#loginDialog');
                self.$callPanel = self.$elem.find('#callPanel');
                self.$answerDialog = self.$elem.find('#answerDialog');
                self.$shareDialog = self.$elem.find('#shareDialog');
                self.$fileAcceptDialog = self.$elem.find('#fileAcceptDialog');
                self.$chatPanel = self.$elem.find('#chatPanel');
                self.$filesPanel = self.$elem.find('#filesPanel');
                self.$youInfoPanel = self.$elem.find('#youInfoPanel');
                self.loginParams = {};
                //now check compatibility
                var errors = {}, warnings = {},  errorMessages = {
                    'websocket': self._('Your browser does not support websocket.'),
                    'peerconnection': self._('Your browser does not support PeerConnections.'),
                    'usermedia': self._('Your browser does not support user media.')
                };
                if(!rtc.checkCompatibility(errors, warnings, 'chat')){
                    self.debug(errors);
                    var errorMessage = [];
                    for(var error in errors){
                        errorMessage.push(errorMessages[error]);
                    }
                    errorMessage.push(self._('Please try <a href="http://www.google.com/chrome" target="_blank">Google Chrome</a> or <a href="http://www.mozilla.org/en-US/firefox" target="_blank">Mozilla Firefox</a>'));
                    self.message(errorMessage.join('<br>'),'danger');
                }
                else{
                    //load devices
                    rtc.loadDevices(function(devices){
                        self.devices = devices;
                        self.loginParams.hasAudioDevice = self.devices.audio.length > 0;
                        self.loginParams.hasVideoDevice = self.devices.video.length > 0;
                        if(!self.loginParams.hasAudioDevice){
                            self.$answerDialog.find("#answerAudio").hide();
                        }
                        if(!self.loginParams.hasVideoDevice){
                            self.$answerDialog.find("#answer").hide();
                        }                        
                    });                     
                    if(!$.isEmptyObject(warnings)){
                        var errorMessage = [];
                        for(var error in warnings){
                            errorMessage.push(errorMessages[error]);
                        }
                        errorMessage.push(self._('You will not be able to make video calls.'));
                        errorMessage.push(self._('Please try <a href="http://www.google.com/chrome" target="_blank">Google Chrome</a> or <a href="http://www.mozilla.org/en-US/firefox" target="_blank">Mozilla Firefox</a>'));
                        self.message(errorMessage.join('<br>'),'warning',5);                        
                    }
                    if(warnings.peerconnection){
                        self.loginParams.noPc = true;
                    }
                    if(warnings.usermedia){
                        self.loginParams.noMedia = true;
                    }                    
                    //try to connect to WS
                    rtc.connect(self.config.wsURL);
                }
                self.initDom();
                self.initRtc();
                //init notifications
                if(self.config.enableNotifications){
                    notificationsHelper.grant();
                }                
            });
            //preload chat input
            self.loadTplByName('tplChatInput',function(tpl){});
        });        
    };
    
    /**
     * Init DOM
     */
    mgVideoChat.prototype.initDom = function(){
        var self = this;        
        //login button
        self.$loginPanel.find('#loginButton').click(function(){
            if(self.config.login){
                self.config.login(function(){
                    rtc.login(self.loginParams);
                });
            }
            else{                
                self.$loginDialog.modal('show');                
            }
        });
        self.$loginDialog.on('shown.bs.modal',function(){
            self.$loginDialog.find('#userName').focus();
        });
        var onLogin = function(){
            if(self.$loginDialog.find('#userName').val()){
                //set cookie for the server
                self.setCookie('mgVideoChatSimple', self.$loginDialog.find('#userName').val(), 30, window.location.hostname);
                self.$loginDialog.modal('hide');
                //reload to use new cookie
                window.location.reload();
            }
        };
        self.$loginDialog.find('#userName').keypress(function(e){
            if (e.keyCode === 13) {
                onLogin();
                return false;
            }
        });
        self.$loginDialog.find('button.login').click(onLogin);
        //video buttons
        self.$videoPanel.find('#videoFullScreen').click(function(){
            var el = self.$videoPanel.get(0),
                rfs = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen;
            rfs.call(el);
        });
        self.$videoPanel.find('#videoExitFullScreen').click(function(){
            var rfs = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen;
            rfs.call(document);
        });
        self.$videoPanel.find('#callHangup').click(function(){
            rtc.drop(self.videoId);
        });
        //mute buttons
        var muteClick = function($button, context){
            if(!self.localStream){
                return false;
            }
            var tracks = (context == 'audio')? self.localStream.getAudioTracks(): self.localStream.getVideoTracks();
            if(tracks.length === 0){
                return false;
            }
            var i;
            for(i=0; i < tracks.length; i++){
                tracks[i].enabled = self.isMuted[context];
            }
            self.isMuted[context] = !self.isMuted[context];
            var status = (self.isMuted[context])? 'off':'on';
            $button.attr('title',$button.data('title-' + status));
            $button.find('span')    .removeClass($button.data('icon-on'))
                                          .removeClass($button.data('icon-off'))
                                          .addClass($button.data('icon-' + status));
        };
        self.$videoPanel.find('#videoMute').click(function(){
            muteClick($(this),'video');
        });
        self.$videoPanel.find('#audioMute').click(function(){
            muteClick($(this),'audio');
        });        
        //answer dialog
        self.$answerDialog.find("#answer").click(function(){
            rtc.accept(self.$answerDialog.data('caller_id'), self.getMediaOptions({
                audio:true,
                video:true
            }));
            self.$answerDialog.modal('hide');
        });
        self.$answerDialog.find("#answerAudio").click(function(){
            rtc.accept(self.$answerDialog.data('caller_id'), self.getMediaOptions({
                audio:true,
                video:false
            }));
            self.$answerDialog.modal('hide');
        });
        self.$answerDialog.find("#cancelCall").click(function(){
            rtc.drop(self.$answerDialog.data('caller_id'));
            self.$answerDialog.modal('hide');
        });
        //share dialog
        self.$shareDialog.find("#shareCam").click(function(){
            self.createGroupStream();
            self.$shareDialog.modal('hide');
        });
        self.$shareDialog.find("#shareDesktop").click(function(){
            self.getDesktopShareMedia(function(mediaOptions){
                if(!mediaOptions){
                    return false;
                }
                self.createGroupStream(mediaOptions);
            });
            self.$shareDialog.modal('hide');
        });         
        //file accept dialog
        self.$fileAcceptDialog.find("#fileAccept").click(function(){
            var fileDesc = self.$fileAcceptDialog.data('file_desc');
            var connectionId = self.$fileAcceptDialog.data('connection_id');
            self.$fileAcceptDialog.modal('hide');
            fileDesc.firefox = rtc.firefox;
            self.fileAccept(fileDesc, connectionId);
        });
        self.$fileAcceptDialog.find("#fileCancel").click(function(){
            var fileDesc = self.$fileAcceptDialog.data('file_desc');
            var connectionId = self.$fileAcceptDialog.data('connection_id');
            self.fileCancel(fileDesc, connectionId);
            self.$fileAcceptDialog.modal('hide');
        });
        //roulette
        $('#connectionsPanel').on('click', "#rouletteNext", function(){
            self.rouletteNext();
        });
        
        $('#offcanvasButton').click(function() {
            $('.row-offcanvas').toggleClass('active');
            event.stopPropagation();
        });

        $('body').click(function(){
            $('.row-offcanvas').removeClass('active');
        });
        
        $('#sideMenu').click(function(event){
            event.stopPropagation();
        });        
    };
        

    mgVideoChat.prototype.fileAccept = function(fileDesc, connectionId){
        //update pending
        this.files[fileDesc.id].pending = false;
        this.renderFiles();
        rtc.fileAccept(connectionId, fileDesc);
    };

    mgVideoChat.prototype.fileCancel = function(fileDesc, connectionId){
        delete this.files[fileDesc.id];
        this.renderFiles();
        rtc.fileCancel(connectionId, fileDesc);
    };


    mgVideoChat.prototype.onConnected = function(){
        this.$loginPanel.show();
    };

    mgVideoChat.prototype.onDisconnected = function(){
        this.disableChat();
    };

    mgVideoChat.prototype.onLogged = function(){
        this.$loginPanel.hide();        
    };

    mgVideoChat.prototype.onConnectionClose = function(connectionId){
        this.$connectionsPanel.find("#connection_" + connectionId).remove();
        this.disableChat(connectionId);
        if(this.videoId == connectionId){
            this.onVideoClose();
        }
        if(this.videoInvitedId == connectionId){
            this.inviteStop();
        }
        delete rtc.connections[connectionId];
        //fire event
        this.fire('connections',rtc.connections);
    };

    mgVideoChat.prototype.onVideoOpen = function(connectionId){
        this.videoId = connectionId;
        if(connectionId){
            this.$callPanel.find('.panel-title').text(this._('Call with {username}',['{username}'],[rtc.connections[connectionId]['data']['userData']['name']]));
        }
        this.$callPanel.show();
        this.updateLayout();
        if(!this.roomOptions.group){
            //re-render all connections
            this.renderConnections();
        }
    };

    mgVideoChat.prototype.onVideoClose = function(){
        var self = this;
        this.videoId = null;
        if(!this.roomOptions.group){
            self.$elem.find("#localVideo").attr("src","");
        }
        self.$elem.find("#remoteVideo").attr("src","");
        self.$callPanel.hide();
        self.inviteStop();
        //re-render all connections
        this.renderConnections();
        this.remoteVideoGroupSelect();
    };

    mgVideoChat.prototype.inviteStart = function(connectionId){
        this.videoAnswerDialog(connectionId);
        this.videoInvitedId = connectionId;
        this.callRing(false);
    };

    mgVideoChat.prototype.inviteStop = function(){
        this.$answerDialog.modal('hide');
        this.videoInvitedId = null;
        this.callRing(true);
    };

    mgVideoChat.prototype.videoAnswerDialog = function(connectionId){
        var self = this;
        var userData = rtc.connections[connectionId].data.userData;
        self.$answerDialog.data('caller_id',connectionId);
        self.$answerDialog.find('.username').text(userData['name']);
        if(userData.image){
            self.$answerDialog.find('.desc').html('<img src="' + userData.image + '" alt="' + userData['name'] + '"/>');
        }
        self.$answerDialog.modal('show');
    };

    mgVideoChat.prototype.callRing = function(stop){
        var audio = this.$elem.find("#ringSound").get(0);
        if(stop){
            audio.pause();
        }
        else{
            audio.play();
        }
    };

    mgVideoChat.prototype.notifySound = function(){
        this.$elem.find("#notifySound").get(0).play();
    };

    mgVideoChat.prototype.rouletteNext = function(){
        if(this.videoId){
            //drop curent call but leave stream opened
            rtc.drop(this.videoId, false, true);
        }
        rtc.rouletteNext();
    };
    
    mgVideoChat.prototype.hasMedia = function(stream, context){
        try {
            var tracks = (context == 'audio')? stream.getAudioTracks(): stream.getVideoTracks();
            return tracks.length > 0;
        }
        catch(err) {
            return false;
        }        

    };
    
    mgVideoChat.prototype.videoSetStream = function($videoEl, stream){
        $videoEl.get(0).srcObject = stream;
    };    
    
    mgVideoChat.prototype.localVideoOpen = function(stream, connectionId){
        if(stream){
            this.videoSetStream(this.$elem.find("#localVideo"), stream);
            this.$elem.find("#localVideo").show();
            this.isMuted = {
                'audio': false,
                'video': false
            };
            if(!this.hasMedia(stream, 'video')){
                this.$elem.find("#videoMute");
            }
            if(!this.hasMedia(stream, 'audio')){
                this.$elem.find("#audioMute");
            }            
        }
        else{
            this.$elem.find("#localVideo").hide();
        }
        this.onVideoOpen(connectionId);
    };

    mgVideoChat.prototype.remoteVideoOpen = function(stream, connectionId){
        if(stream){
            this.videoSetStream(this.$elem.find("#remoteVideo"), stream);
            this.$elem.find("#remoteVideo").show();
        }
        else{
            this.$elem.find("#remoteVideo").hide();
        }
        if(connectionId){
            this.onVideoOpen(connectionId);
        }
    };    

    mgVideoChat.prototype.remoteVideoGroupSelect = function(){
        //select first in a group
        if(!this.roomOptions.group || this.videoId){
            return;
        }
        for(var connectionId in rtc.connections){
            if(rtc.connections[connectionId].rstream){
                var $connectionItem = this.$connectionsPanel.find('#connection_' + connectionId + '.connectionItem');
                $connectionItem.click();
            }
        }
        
    };
    
    /**
     * Calculate Media options
     * 
     * @param {object} mediaOptions
     * @returns {object}
     */
    mgVideoChat.prototype.getMediaOptions = function(mediaOptions){
        mediaOptions.video  = mediaOptions.video && !this.roomOptions.disableVideo;
        mediaOptions.audio  = mediaOptions.audio && !this.roomOptions.disableAudio;
        return mediaOptions;
    };    
    
    /**
     * Change behaviour based on room options
     * 
     */
    mgVideoChat.prototype.onRoomOptions = function(){
        var self = this;
        //share desktop
        var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
        this.roomOptions.desktopShare =  this.roomOptions.desktopShare && isChrome; //only on chrome for now
        //group chat
        if(this.roomOptions.group || this.roomOptions.roulette){
            if(this.roomOptions.group){
                this.debug('This chat is group/conference chat');
                //hide drop call button
                this.$videoPanel.find("#callHangup").remove();
            }
            else{
                this.config.tplConnections = this.config.tplRoulette;
                this.debug('This chat is roulette chat');
            }
            //create local media stream
            rtc.debug('creating local media stream');
                        
            //no webrtc
            if(self.loginParams.noPc || self.loginParams.noMedia || (this.roomOptions.disableVideo && this.roomOptions.disableAudio)){
                rtc.debug('no webrtc support');
                self.localStream = null;
                self.onMediaStreamGroup(true);
            } else {
                //share desktop?
                if(this.roomOptions.desktopShare){
                    rtc.debug('sharing desktop dialog option');
                    this.$shareDialog.modal('show');
                } else {
                    //create stream
                    self.createGroupStream();                    
                }                
            }
        }
        if(this.roomOptions.disableVideo){
            this.$answerDialog.find("#answer").hide();
            var $localBg = this.$elem.find("#localVideoBg"), $remoteBg = this.$elem.find("#remoteVideoBg");
            $localBg.addClass('localAudio').show();
            $remoteBg.addClass('remoteAudio').show();
            this.$elem.find("#localVideo").hide();
            this.$elem.find("#remoteVideo").hide();            
        }
        if(this.roomOptions.disableAudio){
            this.$answerDialog.find("#answerAudio").hide();
        }         
    };
    
    /**
     * Create stream in group/roulette
     *
     */
    mgVideoChat.prototype.createGroupStream = function(mediaOptions){
        var self = this;
        mediaOptions = mediaOptions ? mediaOptions :  this.getMediaOptions({
            audio: self.loginParams.hasAudioDevice,
            video: self.loginParams.hasVideoDevice
        });
        rtc.createStream(null, mediaOptions
            ,function onSuccess(stream){                
            rtc.debug('local stream added');
            self.onMediaStreamGroup(true);
        },function onFail(error){
            self.localStream = null;
            rtc.debug('local stream rejected');
            self.onMediaStreamGroup(true);
        });         
    };    
    
    /**
     * Received stream in group/roulette
     *
     */
    mgVideoChat.prototype.onMediaStreamGroup = function(success){
        var self = this;
        rtc.mediaReady();
        if(self.roomOptions.group){
            //if I'm new, then I invite
            self.connectAllMediaReady();
            //run text chat
            self.setChat(0);
        }
        if(self.roomOptions.roulette){
            self.rouletteNext();
        }         
    };    

    /**
     * Invite all new media ready connections
     *
     */
    mgVideoChat.prototype.connectAllMediaReady = function(){
        var self = this;
        rtc.debug('connecting all media ready connections');
        //postpone this if connections are not loaded yet
        if(!rtc.connectionsLoaded){
            rtc.debug('connections not loaded, wait 1s more...');
            setTimeout(function(){ self.connectAllMediaReady(); }, 1000);
            return;
        }        
        //group chat
        if(!this.roomOptions.group && !this.roomOptions.roulette){
            return false;
        }
        for(var connectionId in rtc.connections){
            if(!rtc.connections[connectionId].rstream && rtc.connections[connectionId].media_ready){
                if(!rtc.connections[connectionId].stream){
                    rtc.connections[connectionId].stream = self.localStream;
                }
                if(rtc.refuseIdleState(connectionId)){
                    return false;
                }
                rtc.sdpOffer(connectionId);
            }                
        }
    };
    
    /**
     * Ask for desktop share
     *
     */
    mgVideoChat.prototype.getDesktopShareMedia = function(callback){
        var self = this;
        desktopShare.getSourceId(function(sourceId, error){
            if(!sourceId){
                if(error == 'no-permission' && location.protocol != 'https:'){
                    self.message(self._('Desktop can be shared only over https secure connection.') , 'danger');
                }
                if(error == 'no-extension'){
                    self.message(self._('Please <a href="#" class="btn btn-success extensionInstall">install</a> this chrome extension in order to use desktop sharing and reload this page.') , 'danger');
                    self.$elem.find(".extensionInstall").click(function(){
                        try {
                            chrome.webstore.install(
                                'https://chrome.google.com/webstore/detail/' + self.config.chromeExtensionId, 
                                function successCallback() {
                                    location.reload();
                                },
                                function failureCallback(error) {
                                    self.message(error, 'danger');
                                }
                            );
                        }
                        catch(err) {
                            window.open('https://chrome.google.com/webstore/detail/' + self.config.chromeExtensionId, 'install');
                        }                                    
                        return false;
                    })
                }                            
                return callback(false);
            }
            var mediaOptions = {
                audio: false,
                video: {
                    mandatory: {                                
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId,
                        maxWidth: window.screen.width,
                        maxHeight: window.screen.height,
                        maxFrameRate: 3                                
                    }  
                }
            };
            //flag here that audio track must be appended
            if(!self.roomOptions.disableAudio){
                mediaOptions.audioAppend = true;
            }
            rtc.debug('mediaOptions');
            rtc.debug(mediaOptions);
            return callback(mediaOptions);
        });      
    };    
 
    /**
     * get chat dom
     * 
     * @param {int} chatId
     * @returns {undefined}
     */
    mgVideoChat.prototype.disableChat = function(chatId){
        //disable all
        if(!chatId){
            this.$chatPanel.find('.form-control').attr('disabled','disabled');
        }
        else{
            this.$chatPanel.find('#chat_' + chatId + ' .form-control').attr('disabled','disabled');
        }
    };    
    
    /**
     * Set active chat
     * 
     * @param {int} chatId
     * @returns {undefined}
     */
    mgVideoChat.prototype.setChat = function(chatId){
        this.chatId = chatId;      
        //hide all chats
        this.$chatPanel.find('.chat').hide();
        //get active chat
        this.getChatDiv(chatId).show();
        if(chatId > 0){
            this.$chatPanel.find('.panel-title').text(this._('Chat with {username}',['{username}'],[rtc.connections[chatId]['data']['userData']['name']]));
        }
        else{
            this.$chatPanel.find('.panel-title').text(this._('Group chat'));
        }
        
        this.$chatPanel.show();
        this.updateLayout();
        //reset unread
        if(chatId && rtc.connections[chatId]['data'].unread){
            rtc.connections[chatId]['data'].unread = 0;
            this.renderConnection(chatId);
        }  
    };
    
    /**
     * Get RTC object
     * 
     * @returns {mgRtc}
     */
    mgVideoChat.prototype.getRtc = function(){
        return rtc;
    };    
          
    /**
     * Jquery entry function
     * 
     * @param {object} options
     * @param {object} params
     * @return {jQuery}
     */
    $.fn.mgVideoChat = function(options, params1, params2) {
        //just call existing instance
        if(options === 'on'){
            var instance = $(this).data("mgVideoChat-instance");
            if(instance){
                return instance.on(params1, params2);
            }
        }        
        else{
            var instances = [];
            this.each(function() {
                instances.push(new mgVideoChat(this, options));
            });
            //return created instances
            if(instances.length === 1){
                return instances[0];
            }
            return instances;
        }
    };
    
    /**
     * Translate function
     *  
     * @param {string} key
     * @param {array} find
     * @param {array} replace
     * @returns {string}
     */
    $.fn.mgVideoChat._ = function(key, find, replace) {
        var result = key;
        if($.fn.mgVideoChat.translate && $.fn.mgVideoChat.translate[key]){
            result = $.fn.mgVideoChat.translate[key];
        }
        //replace part
        if(!find || !find.length){
            return result;
        }
        var regex;        
        for (var i = 0; i < find.length; i++) {
            regex = new RegExp(find[i], "g");
            result = result.replace(regex, replace[i]);
        }        
        return result;
    };
    
    $.fn.mgVideoChat.htmlspecialchars = function(string, quote_style, charset, double_encode) {
        var optTemp = 0,
        i = 0,
        noquotes = false;
        if (typeof quote_style === 'undefined' || quote_style === null) {
            quote_style = 2;
        }
        string = string.toString();
        if (double_encode !== false) {
            // Put this first to avoid double-encoding
            string = string.replace(/&/g, '&amp;');
        }
        string = string.replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

        var OPTS = {
            'ENT_NOQUOTES': 0,
            'ENT_HTML_QUOTE_SINGLE': 1,
            'ENT_HTML_QUOTE_DOUBLE': 2,
            'ENT_COMPAT': 2,
            'ENT_QUOTES': 3,
            'ENT_IGNORE': 4
        };
        if (quote_style === 0) {
            noquotes = true;
        }
        if (typeof quote_style !== 'number') {
            // Allow for a single string or an array of string flags
            quote_style = [].concat(quote_style);
            for (i = 0; i < quote_style.length; i++) {
                // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
                if (OPTS[quote_style[i]] === 0) {
                    noquotes = true;
                } else if (OPTS[quote_style[i]]) {
                    optTemp = optTemp | OPTS[quote_style[i]];
                }
            }
            quote_style = optTemp;
        }
        if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
            string = string.replace(/'/g, '&#039;');
        }
        if (!noquotes) {
            string = string.replace(/"/g, '&quot;');
        }

        return string;
    }    
        
})( jQuery, window , document );   // pass the jQuery object to this function
