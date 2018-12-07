<?php

namespace MgRTC;

use Guzzle\Http\Message\RequestInterface;
use Guzzle\Http\Message\Response;
use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServerInterface;

/**
 * Description of Web
 *
 * @author magnoliyan
 */
class Web implements HttpServerInterface {

    /**
     *
     * @var Chat
     */
    protected $app;
    
    public function __construct(Chat $app)
    {
        $this->app = $app;
    }

    public function onOpen( ConnectionInterface $conn, RequestInterface $request = null )
    {
        $response = new Response( 200, ['Content-Type' => 'text/html; charset=utf-8'] );
        $clients = $this->app->getClients();
        $response->setBody("Hello!<br>We have <em>" . count($clients[1]) . "</em> clients in the room #1.");
        $conn->send($response);
        $conn->close();
    }

    public function onClose(ConnectionInterface $conn){}
    public function onError(ConnectionInterface $conn, \Exception $e){}
    public function onMessage(ConnectionInterface $from, $msg){}
}
