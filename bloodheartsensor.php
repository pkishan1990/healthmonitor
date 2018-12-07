<?php

include 'PhpSerial.php';
$serial = new PhpSerial;
$serial->deviceSet("/dev/ttyUSB1");
$serial->confBaudRate(9600);
$serial->confParity("none");
$serial->confCharacterLength(8);
$serial->confStopBits(1);
$serial->confFlowControl("none");
$serial->deviceOpen();

while ($read == '') {
    $read = $serial->readPort();
      if(strlen($read)>0){
        var_dump($read);
    }
}

$serial->deviceClose();
?>