<?php
$version = array(
    'main'  => '1.15.0',
    'build' => '$LastChangedRevision: 282 $'
);

use Ratchet\Server\IpBlackList;
use Ratchet\Http\HttpServer;
use Ratchet\Http\OriginCheck;
use Ratchet\WebSocket\WsServer;
use MgRTC\Chat;
use MgRTC\Daemon;
use MgRTC\Session\SessionProvider;
use MgRTC\Router;

$autoLoad = dirname(__DIR__) . '/vendor/autoload.php';
if(!file_exists($autoLoad)){
    echo "\nThe system is not properly installed.\nPlease run [composer install] from [server] folder.\n";
    exit(1);
}
require $autoLoad;
require __DIR__ . '/config.php';

/**
 * Create WS server
 * 
 * @global Ratchet\Server\IoServer $server
 * @global array $config
 */
function createServer(){
    global $server, $config;

    $app = new Chat($config);
    //ip blacklist
    if(isset ($config['IpBlackList']) && is_array($config['IpBlackList'])){
        $app = new IpBlackList($app);
        foreach ($config['IpBlackList'] as $ipBlackList) {
            $app->blockAddress($ipBlackList);
        }
    }
    //session
    $session = new SessionProvider($app, $config);
    //websocket
    $wsServer = new WsServer($session);
    //limit origins
    if(isset ($config['allowedOrigins']) && is_array($config['allowedOrigins'])){
        $wsServer = new OriginCheck($wsServer, $config['allowedOrigins']);
    }
    //router
    $router = getRouter($wsServer, $app);
    try {
        $server = MgRTC\Server::factory(new HttpServer($router), $config['port']);
    } catch (\Exception $exc) {
        echo sprintf("\nServer was not able to start with error message [%s]\n"
                . "\nMost likely the port [%d] you are trying to run the system is already taken by some other service.\n"
                . "Please find available free port and configure it in [config.php] and restart.\n\n", $exc->getMessage(), $config['port']);
        exit(1);
    }    
}

/**
 * 
 * @global array $config
 * @param WsServer $wsServer
 * @param Chat $app
 * @return HttpServerInterface
 */
function getRouter(WsServer $wsServer, Chat $app)
{
    global $config;
    
    //no routes defined
    if(!isset($config['routes']) || !is_array($config['routes']) || !count($config['routes'])){
        return $wsServer;
    }
    //create router and setup routes
    $router = new Router();
    $router->route('/', $wsServer);
    foreach ($config['routes'] as $route) {
        echo "\nadding route [{$route['path']}] for server class [{$route['server_class']}]\n";
        $router->route($route['path'], new $route['server_class']($app));
    }
    return $router;
}

/**
 * Start server
 * 
 * @global Ratchet\Server\IoServer $server
 */
function onRun(){
    global $server, $config, $version;
    
    preg_match('/\d+/', $version['build'], $match);
    $build = $match[0];
    
    createServer();
    echo sprintf("\nServer version: %s.%s, listening on port: %d\n", $version['main'], $build, $config['port']);
    $server->run();
}

/**
 * Stop server
 * 
 * @global Ratchet\Server\IoServer $server
 */
function onStop(){
    global $server;
    try {
        $server->socket->shutdown();
    }catch (Exception $exc) {
        //echo $exc->getMessage();
    }
    $server->loop->stop();

}

//get command
$command = isset ($argv[1])? $argv[1] : 'execute';

//Deamon igniter
Daemon::getInstance()->run(array(
    'daemon_name'   => 'mg-chat-server',
    'run'           => 'onRun',
    'stop'          => 'onStop',
    'pid_file'      => __DIR__ . '/mg-chat-server.pid'
),$command);