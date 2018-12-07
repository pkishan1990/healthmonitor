<?php


/**
 * Description of FacebookCli
 *
 * @author milan
 */

namespace MgRTC\Session\Facebook;

use Facebook\FacebookSignedRequestFromInputHelper;
use Facebook\FacebookSession;

class FacebookCli2 extends FacebookSignedRequestFromInputHelper
{
    protected $cookies = array();

    /**
     * Initialize the helper and process available signed request data.
     *
     * @param array $cookies
     * @param string|null $appId
     * @param string|null $appSecret
     */
    public function __construct(array $cookies, $appId = null, $appSecret = null)
    {
        $this->cookies = $cookies;
        $this->appId = FacebookSession::_getTargetAppId($appId);
        $this->appSecret = FacebookSession::_getTargetAppSecret($appSecret);
        FacebookSession::setDefaultApplication($this->appId, $this->appSecret);
        $this->instantiateSignedRequest();
    }
    
    public function getRawSignedRequest()
    {
        $key = 'fbsr_' . $this->appId;
        if(isset($this->cookies[$key])){
            return $this->cookies[$key];
        }
        return null;
    }
    
}
