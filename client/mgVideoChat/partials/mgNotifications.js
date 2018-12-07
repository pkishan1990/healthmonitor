
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


