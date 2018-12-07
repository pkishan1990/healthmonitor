var wsDomain = '';
if(!wsDomain){
    wsDomain = document.domain;
}
wsPort = 8080;
wsProtocol = 'ws';
wsPath = '';
/*
var themes = {
    'Amelia':'../common/css/amelia.css',
    'Cerulean':'../common/css/cerulean.css',
    'Cosmo':'../common/css/cosmo.css',
    'Cyborg':'../common/css/cyborg.css',
    'Flatly':'../common/css/flatly.css',
    'Journal':'../common/css/journal.css',
    'Readable':'../common/css/readable.css',
    'Simplex':'../common/css/simplex.css',
    'Slate':'../common/css/slate.css',
    'Spacelab':'../common/css/spacelab.css',
    'United':'../common/css/united.css',
    'Yeti':'../common/css/yeti.css'
};*/
var themes = {
     'Yeti':'../common/css/yeti.css'
};

var examples = {
    'Simple Auth': 'simple',
    'Private rooms': 'private',
    'Group chat': 'group',
    'Group private chat': 'private_group',
    'Invite group': 'invite',   
    'Desktop sharing': 'desktop_capture',
};

var forceHttpsDirs = ['desktop_capture'];

var navTpl = ' \
            <nav class="navbar navbar-default" role="navigation"> \
                <div class="container-fluid"> \
                    <div class="navbar-header"> \
                        <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1"> \
                            <span class="sr-only">Toggle navigation</span> \
                            <span class="icon-bar"></span> \
                            <span class="icon-bar"></span> \
                            <span class="icon-bar"></span> \
                        </button> \
                        <a class="navbar-brand" href="#">Video Chat</a> \
                    </div> \
                    <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1"> \
                        <ul class="nav navbar-nav"> \
                            <li class="dropdown"> \
                                <a href="#" class="dropdown-toggle" data-toggle="dropdown">Examples <b class="caret"></b></a> \
                                <ul class="dropdown-menu" id="examples"> \
                                </ul> \
                            </li> \
                            <li class="dropdown"> \
                                <a href="#" class="dropdown-toggle" data-toggle="dropdown">Themes <b class="caret"></b></a> \
                                <ul class="dropdown-menu" id="themes"> \
                                </ul> \
                            </li> \
                        </ul> \
                    </div> \
                </div> \
            </nav>';

$(document).ready(function(){
    //check https
    var loc = window.location.pathname;
    var dir = loc.substring(loc.lastIndexOf('/') + 1);
    if(!dir){
        loc = loc.substring(0, loc.length - 1);
        dir = loc.substring(loc.lastIndexOf('/') + 1);
    }
    var forceHttps = forceHttpsDirs.indexOf(dir) > -1;
    if (forceHttps && window.location.protocol != "https:"){
        window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);   
    }
    //https traffic
    if(window.location.protocol == "https:"){
        wsProtocol = 'wss';
        wsPort = (window.location.port)? window.location.port: '443';
        wsPath = '/wss/';
    }
    wsUrlDefault = wsProtocol + '://' + wsDomain + ':' + wsPort + wsPath;
    var $menu = $(navTpl);
    $menu.find('a.navbar-brand').html($('h1').html());    
    $(".container").prepend($menu);
    $('h1').remove();
    //render themes
    var themesHtml = '';
    var defaultTheme = localStorage.exampleTheme;
   
    for(var theme in themes){
        if(!defaultTheme){
            defaultTheme = theme;
        }
        themesHtml += '<li><a href="' + themes[theme] + '" data-theme="' + theme + '">' + theme +'</a></li>';
    }
    $menu.find('#themes').html(themesHtml);
    $menu.find('#themes li a').click(function(){
        localStorage.exampleTheme = $(this).data('theme');
        $('#themeCss').attr('href',$(this).attr('href'));
        return false;
    });
    //apend css
    $('head').append('<link rel="stylesheet" id="themeCss" type="text/css" href="' + themes[defaultTheme] + '">');
     console.log(defaultTheme);
    //render examples
    var examplesHtml = '';
    var target = '_self';
    var exLink = '';
    for(var example in examples){
        target = '_self';
        exLink = './../' + examples[example];
        if(examples[example].indexOf('http') == 0){
            target = '_blank';
            exLink = examples[example]; 
        }
        examplesHtml += '<li><a href="' + exLink + '" target="' + target + '">' + example +'</a></li>';
    }
    $menu.find('#examples').html(examplesHtml);   
});