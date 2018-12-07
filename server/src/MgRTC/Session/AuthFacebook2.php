<?php

namespace MgRTC\Session;

use MgRTC\Session\AuthInterface;
use MgRTC\Session\Facebook\FacebookCli2;
use Ratchet\ConnectionInterface;
use Facebook\FacebookRequest;
use Facebook\GraphUser;


class AuthFacebook2 extends AuthBase implements AuthInterface {

    /**
     * @param ConnectionInterface $conn
     * @param array $cookies
     * @return array
     */
    public function authUser(ConnectionInterface $conn, array $cookies) {
        $key = 'fbsr_' . $conn->Config['facebook']['appId'];
        $this->debug("Facebook Autorization cookies:"); $this->debug($cookies);
        if(!isset ($cookies[$key])){
            return null;
        }        
        
        try {           
            $facebook = new FacebookCli2($cookies, $conn->Config['facebook']['appId'], $conn->Config['facebook']['secret']);
            $request = new FacebookRequest($facebook->getSession(), 'GET', '/me');
            $userProfile = $request->execute()->getGraphObject(GraphUser::className());
            
            return array(
                'provider'      => 'facebook',
                'id'            => $userProfile->getId(),
                'email'         => $userProfile->getEmail(),
                'name'          => $userProfile->getName(),
                'first_name'    => $userProfile->getFirstName(),
                'last_name'     => $userProfile->getLastName(),
                'gender'        => $userProfile->getGender(),
                'image'         => 'https://graph.facebook.com/' . $userProfile->getId() . '/picture',
                'locale'        => $userProfile->getProperty('locale')
            );            
        } catch (\Exception $e) {
            return null;
        }
    }
}