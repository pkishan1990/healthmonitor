
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
