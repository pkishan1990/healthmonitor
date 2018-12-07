<?php
namespace MgRTC\Friendlist;


interface CallableInterface{
    /**
     * If caller sees and can call callee
     * 
     * @param array $caller
     * @param array $callee
     * @return boolean
     */
    function canCall(array $caller, array $callee);
}