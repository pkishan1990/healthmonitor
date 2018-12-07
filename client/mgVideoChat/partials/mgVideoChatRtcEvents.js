
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
