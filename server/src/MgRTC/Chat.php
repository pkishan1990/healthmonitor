<?php

namespace MgRTC;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface {

    /**
     * Assoc array of clients resourceId: {connection: , desc: }
     * 
     * @var array
     */
    protected $clients;

    /**
     *
     * @var array
     */
    protected $config;
    
    /**
     *
     * @var MgRTC\Friendlist\CallableInterface
     */
    protected $_friendlistAdapter;
    
    protected function _createFriendlistAdapter(){
        $flClass = isset($this->config['friendlistAdapter'])? $this->config['friendlistAdapter']: 'MgRTC\Friendlist\CallableOperator';

        $this->debug("Creating friendlist adapter [$flClass]");
        $this->_friendlistAdapter = new $flClass($this->config);
    }    

    /**
     * Constructor
     */
    public function __construct(array $config) {
        $this->clients = array();
        $this->config = $config;
        $this->_createFriendlistAdapter();
    }

    /**
     * New Connection opened
     * 
     * @param ConnectionInterface $conn
     * @param mixed $request
     */
    public function onOpen(ConnectionInterface $conn, $request = null) {        
        $this->debug("New anonim connection! ({$conn->resourceId}) in room ({$conn->Room})");
    }

    /**
     * add connection when logged in
     * 
     * @param ConnectionInterface $conn
     * @param array $userDesc
     */
    protected function _addConnection(ConnectionInterface $conn, $userDesc){
        // Store the new connection to send messages to later
        $this->clients[$conn->Room][$conn->resourceId] = array(
            'connection'    => $conn,
            'desc'          => $userDesc
        );
        $this->debug("New logged connection! ({$conn->resourceId}) in room ({$conn->Room})");
        $this->debug($userDesc);
    }

    /**
     * Broadcast message for all but sender
     * 
     * @param string|array $msg
     * @param ConnectionInterface $from
     */
    public function broadcast($msg, ConnectionInterface $from) {
        //no room created
        if(!isset ($this->clients[$from->Room])){
            return false;
        }
        if(is_array($msg)){
            $msg = json_encode($msg);
        }
        $currDesc = $this->clients[$from->Room][$from->resourceId]['desc'];
        // broadcast message to all connected clients
        foreach ($this->clients[$from->Room] as $client) {
            //not to sender
            if ($from !== $client['connection'] &&
                    $this->_friendlistAdapter->canCall($currDesc['data']['userData'],
                            $client['desc']['data']['userData'])) {
                $this->send($msg, $client['connection']);
            }
        }
    }

    /**
     * Send a message to a connection
     * 
     * @param string $msg
     * @param ConnectionInterface $to
     */
    protected function send($msg, ConnectionInterface $to){
       if(is_array($msg)){
            $msg = json_encode($msg);
       }
       $to->send($msg);
    }

    /**
     * Get client in a room by user id
     * 
     * @param mixed $userId
     * @param int $room
     * @return array|false
     */
    protected function findClient($userId, $room){
        //no room created
        if(!isset ($this->clients[$room])){
            return false;
        }
        foreach ($this->clients[$room] as $client) {
            if ($client['desc']['data']['userData']['id'] == $userId) {
                return $client;
            }
        }
    }

    /**
     * Get all res.ids for media ready connections
     * 
     * @param ConnectionInterface $from
     * @return array
     */
    protected function getAllMediaReadyConnectionIds(ConnectionInterface $from){
        $ids = array();
        foreach ($this->clients[$from->Room] as $resourceId  => $client) {
            //only if operator or peer is operator
            if ($from !== $client['connection'] && isset ($client['desc']['media_ready']) && $client['desc']['media_ready']) {
                $ids[] = $resourceId;
            }
        }
        return $ids;
    }

    /**
     * Populate room option
     * @param int $room
     * @param string $optionName
     * @param array $options
     */
    public function getRoomOption($room, $optionName, &$options = null){
        $optionValue = null;
        //$this->debug("Searching for option [{$optionName}] room id [{$room}]");
        //get from specific room
        if(isset ($this->config['rooms']) && isset ($this->config['rooms'][$room])){
            $roomConfig = $this->config['rooms'][$room];
            if(isset ($roomConfig[$optionName])){
                $optionValue = $roomConfig[$optionName];
            }
        }
        else{
            //get from pattern room name
            $roomConfig = $this->getRoomOptionsByPattern($room);
            //get global
            if($roomConfig === false){
                $roomConfig = $this->config;
            }
            if(isset ($roomConfig[$optionName])){
                $optionValue = $roomConfig[$optionName];
            }
        }
        if(isset($options) && isset($optionValue)){
            $options[$optionName] = $optionValue;
        }        
        return $optionValue;
    }
    
    /**
     * get room options by pattern
     * 
     * @param int|string $room
     * @return false|array 
     */
    protected function getRoomOptionsByPattern($room){        
        if(!isset ($this->config['rooms']) && !is_array($this->config['rooms'])){
            return false;
        }
        foreach($this->config['rooms'] as $roomPattern => $roomConfig){
            if(!is_string($roomPattern) || strpos($roomPattern, '%') === false){
                continue;
            }
            $roomPattern = str_replace('%', '', $roomPattern);
            if(strpos($room, $roomPattern) !== false){
                return $roomConfig;
            }
        }
        return false;
    }

    /**
     * Get chat room options
     *
     * @param int $room
     * @return array
     */
    public function getRoomOptions($room){
        $options = array();
        $optionNames = array(
            'file',         
            'roulette',     
            'group',        
            'limit',
            'disableVideo',
            'disableAudio',
            'desktopShare',
            'disableVideoNonOperator',
            'disableAudioNonOperator',
        );
        foreach ($optionNames as $optionName) {
            $this->getRoomOption($room, $optionName, $options);
        }
        return $options;
    }
    
    /**
     * Should we disable video or audio for non-operator
     * 
     * @param string $videoOrAudio audio|video
     * @param ConnectionInterface $from
     * @param array $roomOptions
     * @return boolean
     */
    protected function shouldDisableVideoOrAudio($videoOrAudio, ConnectionInterface $from, $roomOptions)
    {
        $media = $videoOrAudio == 'audio'? 'Audio' : 'Video';
        $key = "disable{$media}NonOperator";
        if(isset($roomOptions[$key]) && $roomOptions[$key] && !$from->User['operator']){
            return true;
        }
        return false;
    }

    /**
     * Execute on message "login"
     * 
     * @param ConnectionInterface $from
     * @param array $message
     * @param array $roomOptions
     * @return mixed
     */
    protected function onMessageLogin(ConnectionInterface $from, $message, $roomOptions){
        if(!isset ($from->User)){
            return FALSE;
        }        
        //check for duplicates
        if(isset($this->config['allowDuplicates']) && $this->config['allowDuplicates'] === false &&
                $this->findClient($from->User['id'], $from->Room)){
            //if same ID found get out
            $this->debug("Duplicate attemp in room {$from->Room} for user id {$from->User['id']}");
            //send system message
            $this->send(array(
                "type"  => "message",
                "data"  => array(
                    "type"          => "warning",
                    "text"          => "You are already logged in"
                )
            ),$from);
            return FALSE;
        }
        //check limit
        if(isset ($roomOptions['limit']) && isset($this->clients[$from->Room]) && is_array($this->clients[$from->Room]) && count($this->clients[$from->Room]) >= $roomOptions['limit']){
            //send system message
            $this->send(array(
                "type"  => "message",
                "data"  => array(
                    "type"          => "warning",
                    "text"          => "This room is full at the moment, please try later"
                )
            ),$from);
            return FALSE;
        }
        //process non operator options
        if($this->shouldDisableVideoOrAudio('video', $from, $roomOptions)){
            $roomOptions['disableVideo'] = true;
        }
        if($this->shouldDisableVideoOrAudio('audio', $from, $roomOptions)){
            $roomOptions['disableAudio'] = true;
        }        
        $userDesc = array(
            'data'  => array(
                'userData'  => $from->User,
                'loginParams' => $message['data']
            )
        );
        //add connection
        $this->_addConnection($from, $userDesc);
        //send connection id and data
        $this->send(array(
            "type"  => "connectionId",
            "data"  => array(
                "connectionId"  => $from->resourceId,
                "data"          => $userDesc,
                "room"          => $roomOptions,
                "room_id"       => $from->Room,
                "users_count"   => count($this->clients[$from->Room])
            )
        ),$from);

        //for roulette do not send connections now
        if(isset ($roomOptions['roulette']) && $roomOptions['roulette']){       
            return FALSE;                                                       
        }                                                                       

        //prepare and send all existing connections to new peer
        $peerConnections = array();
        foreach ($this->clients[$from->Room] as $resourceId  => $client) {
            //only if operator or peer is operator
            if ($from !== $client['connection'] && 
                    $this->_friendlistAdapter->canCall($from->User, $client['desc']['data']['userData'])) {
                $peerConnections[$resourceId] = $client['desc'];
            }
        }
        $this->send(array(
            "type"    => 'connections',
            "data"    => $peerConnections
        ),$from);

        //inform old peers about new connection
        $this->broadcast(array(
            "type"    => 'connection_add',
            "data"    => array(
                "connectionId"  => $from->resourceId,
                "data"          => $userDesc,
                "users_count"   => count($this->clients[$from->Room])

            )
        ), $from);
    }

    /**
     * New message received
     * 
     * @param ConnectionInterface $from
     * @param string $message
     * @return mixed
     */
    public function onMessage(ConnectionInterface $from, $message) {
        $roomOptions = $this->getRoomOptions($from->Room);
        $msg = json_decode($message, TRUE);
        //messages: login, call_invite, call_accept, sdp_offer, sdp_answer, ice_candidate
        switch($msg['type']){
            //login client
            case "login":
                $this->onMessageLogin($from, $msg, $roomOptions);
                break;
            case "call_invite":
            case "call_accept":
            case "call_drop":
            case "call_busy":
            case "sdp_offer":
            case "sdp_answer":
            case "ice_candidate":
            case "chat_message":
            case "file_offer":              
            case "file_accept":             
            case "file_cancel":             
            case "file_sdp_offer":          
            case "file_sdp_answer":         
            case "file_ice_candidate":      
            case "file_receive_progress":   
            case "roulette_accept":         
                if(!$this->_isLogged($from)){
                    return FALSE;
                }
                //group chat broadcast message - only chat_message!
                if($msg['type'] == "chat_message" && isset ($roomOptions['group']) && $roomOptions['group']){
                    $msg['data']['connectionId'] = $from->resourceId; 
                    $this->broadcast($msg, $from); 
                }
                else{
                    $peerConnectionId = $msg['data']['connectionId'];
                    //find recepient
                    if(!isset ($this->clients[$from->Room][$peerConnectionId]) || !isset ($this->clients[$from->Room][$peerConnectionId]['desc'])){
                        return FALSE;
                    }
                    //set caller id
                    $msg['data']['connectionId'] = $from->resourceId;
                    $this->send($msg, $this->clients[$from->Room][$peerConnectionId]['connection']);
                }
                break;
            case "media_ready":
                if(!$this->_isLogged($from)){
                    return FALSE;
                }
                $this->clients[$from->Room][$from->resourceId]['desc']['media_ready'] = true;
                if(isset($roomOptions['roulette']) && $roomOptions['roulette']){
                    break;
                }
                //inform old peers about new connection media ready
                $this->broadcast(array(
                    "type"    => 'media_ready',
                    "data"    => array(
                        "connectionId"  => $from->resourceId,
                        "data"          => array(
                            'connectionIds' => array($from->resourceId)
                        )
                    )
                ), $from);
                break;
            case "roulette_next":                                                   
                if(!$this->_isLogged($from)){                                       
                    return FALSE;                                                   
                }                                                                   
                if(!$roomOptions['roulette']){                                      
                    return FALSE;                                                   
                }                                                                   
                $ids = $this->getAllMediaReadyConnectionIds($from);                 
                if(!count($ids)){                                                   
                    //send to invitator                                             
                    $this->send(array(                                              
                        "type"    => 'roulette_next',                               
                        "data"    => null                                           
                    ),$from);                                                       
                    return FALSE;                                                   
                }                                                                   
                $randIndex = rand(0,count($ids) - 1);                               
                $id = $ids[$randIndex];                                             
                $peerConnections = array(                                           
                    $id => $this->clients[$from->Room][$id]['desc']                 
                );                                                                  
                $peerCallerConnections = array(                                     
                    $from->resourceId => $this->clients[$from->Room][$from->resourceId]['desc'] 
                );                                                                  
                $data = array(                                                      
                    'connections'   => $peerCallerConnections,                      
                    'users_count'   => count($this->clients[$from->Room])           
                );                                                                  
                //send invitation to chosen one                                     
                $this->send(array(                                                  
                    "type"    => 'roulette_invitation',                             
                    "data"    => $data                                              
                ),$this->clients[$from->Room][$id]['connection']);                  
                                                                                    
                $data['connections'] = $peerConnections;                            
                //send to invitator                                                 
                $this->send(array(                                                  
                    "type"    => 'roulette_next',                                   
                    "data"    => $data                                              
                ),$from);                                                           
                break;                                                              
        }
    }

    /**
     * Check if connection is logged in room
     * 
     * @param ConnectionInterface $from
     * @return boolean
     */
    protected function _isLogged(ConnectionInterface $from){
        return isset ($this->clients[$from->Room][$from->resourceId]) && isset ($this->clients[$from->Room][$from->resourceId]['desc']);
    }

    /**
     * Closing connection
     * 
     * @param ConnectionInterface $conn
     */
    public function onClose(ConnectionInterface $conn) {
        if(!isset($conn->Room) || !isset ($this->clients[$conn->Room]) || !isset($this->clients[$conn->Room][$conn->resourceId])){
            return;
        }
        $this->debug("Connection {$conn->resourceId} from room {$conn->Room} has disconnected");
        $this->debug($this->clients[$conn->Room][$conn->resourceId]['desc']);
        //inform about closed connection
        $this->broadcast(array(
            "type"  => "connection_remove",
            "data"  => array(
                "connectionId"  => $conn->resourceId,
                "users_count"   => count($this->clients[$conn->Room]) - 1
            )
        ),$conn);

        // The connection is closed, remove it, as we can no longer send it messages
        unset ($this->clients[$conn->Room][$conn->resourceId]);
    }

    /**
     * Close on error
     * 
     * @param ConnectionInterface $conn
     * @param \Exception $e
     */
    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->debug("An error has occurred: {$e->getMessage()}");
        $conn->close();
    }

    /**
     * Var dump obj
     * 
     * @param mixed $obj
     */
    public function debug($obj){
        if(!isset ($this->config['debug']) || !$this->config['debug']){
            return;
        }
        if(is_scalar($obj)){
            echo "$obj\n";
        }
        else{
            print_r($obj);
        }
    }
    
    /**
     * Get clients connections
     * 
     * @return array
     */
    public function getClients()
    {
        return $this->clients;
    }
}