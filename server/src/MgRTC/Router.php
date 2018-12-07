<?php

namespace MgRTC;

use Ratchet\Http\Router as RatchetRouter;
use Ratchet\ComponentInterface;
use Ratchet\Http\HttpServerInterface;
use Ratchet\Http\OriginCheck;
use Ratchet\Wamp\WampServerInterface;
use Ratchet\WebSocket\WsServer;
use Ratchet\Wamp\WampServer;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Routing\Route;
use Symfony\Component\Routing\RequestContext;
use Symfony\Component\Routing\Matcher\UrlMatcher;

class Router extends RatchetRouter
{
    /**
     * @var RouteCollection
     */
    public $routes;
    
    /**
     * @var int
     */
    protected $_routeCounter = 0;

    public function __construct()
    {        
        $this->routes = new RouteCollection();
        $matcher = new UrlMatcher($this->routes, new RequestContext);
        parent::__construct($matcher);
    }    
    
    /**
     * Add an endpoint/application to the server
     * 
     * @param string             $path The URI the client will connect to
     * @param ComponentInterface $controller Your application to server for the route. If not specified, assumed to be for a WebSocket
     * @param array              $allowedOrigins An array of hosts allowed to connect (same host by default), ['*'] for any
     * @return ComponentInterface|WsServer
     */
    public function route($path, ComponentInterface $controller, array $allowedOrigins = []) {
        if ($controller instanceof HttpServerInterface || $controller instanceof WsServer) {
            $decorated = $controller;
        } elseif ($controller instanceof WampServerInterface) {
            $decorated = new WsServer(new WampServer($controller));
        } elseif ($controller instanceof MessageComponentInterface) {
            $decorated = new WsServer($controller);
        } else {
            $decorated = $controller;
        }

        if (count($allowedOrigins) && '*' !== $allowedOrigins[0]) {
            $decorated = new OriginCheck($decorated, $allowedOrigins);
        }

        $this->routes->add('rr-' . ++$this->_routeCounter, new Route($path, ['_controller' => $decorated]));

        return $decorated;
    }
}