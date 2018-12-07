
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


