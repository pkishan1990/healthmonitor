
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


