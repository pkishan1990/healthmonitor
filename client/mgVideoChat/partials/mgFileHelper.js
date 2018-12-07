
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


