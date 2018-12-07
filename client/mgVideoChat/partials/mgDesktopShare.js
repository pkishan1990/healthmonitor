
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


