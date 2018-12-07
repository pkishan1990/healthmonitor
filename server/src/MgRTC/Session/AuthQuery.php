<?php

namespace MgRTC\Session;

use MgRTC\Session\AuthInterface;
use Ratchet\ConnectionInterface;

class AuthQuery extends AuthBase implements AuthInterface {

    /**
     * Find user
     * 
     * @param array $config
     * @param string $username
     * @param string $password
     * @return array|null
     */
    protected function _findUser($config,$username,$password){
        if(!isset ($config['members']) && !is_array($config['members'])){
            return null;
        }
        foreach ($config['members'] as $user) {
            if($user['username'] == $username && $user['password'] == $password){
                return $user;
            }
        }
        return null;
    }

    /**
     * @param ConnectionInterface $conn
     * @param array $cookies
     * @return array
     */
    public function authUser(ConnectionInterface $conn, array $cookies) {
        if(isset ($conn->Config['auth_query'])){
            $config = $conn->Config['auth_query'];
        }
        else{
            $config = array('allowAnonim'   => true);
        }
        $parameters = $conn->WebSocket->request->getQuery()->toArray();
        $this->debug("Query Autorization params:"); $this->debug($parameters);

        if(isset ($parameters['username']) && isset($parameters['password'])){
            $this->debug("Query Autorization searching for user [{$parameters['username']}]");
            $user = $this->_findUser($config, $parameters['username'], $parameters['password']);
            if(!$user){
                return null;
            }
            return array(
                'provider'      => 'query',
                'id'            => $user['id'],
                'email'         => '',
                'name'          => $user['name']
            );
        }
                
        if(!$config['allowAnonim']){
            $this->debug("Query Autorization not logged in");
            return null;
        }
        
        $this->debug("Query Autorization returning anonim data");
        return array(
            'provider'      => 'query',
            'id'            => $conn->resourceId . '_a',
            'email'         => '',
            'name'          => "User {$conn->resourceId}",
        );
    }
}