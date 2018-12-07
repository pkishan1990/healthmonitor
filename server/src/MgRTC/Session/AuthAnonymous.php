<?php

namespace MgRTC\Session;

use MgRTC\Session\AuthInterface;
use Ratchet\ConnectionInterface;

class AuthAnonymous extends AuthBase implements AuthInterface {
    /**
     * @param ConnectionInterface $conn
     * @param array $cookies
     * @return array
     */
    public function authUser(ConnectionInterface $conn, array $cookies) {
        $this->debug("Authorized  Anonymously");
        return array(
            'provider'      => 'anonymous',
            'id'            => $conn->resourceId . '_anon',
            'email'         => '',
            'name'          => 'User ' . $conn->resourceId
        );
    }
}