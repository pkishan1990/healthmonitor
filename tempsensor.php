<?php
$handle = fopen("/sys/bus/w1/devices/w1_bus_master1/w1_master_slaves", "r");
if ($handle) {
    while (($sensors = fgets($handle)) !== false) {
        $sensor = "/sys/bus/w1/devices/" . trim($sensors) . "/w1_slave";
        $sensorhandle = fopen($sensor, "r");
        if ($sensorhandle) {
            $thermometerReading = fread($sensorhandle, filesize($sensor));
            fclose($sensorhandle);
            preg_match("/t=(.+)/", preg_split("/\n/", $thermometerReading)[1], $matches);
            $celsius = round($matches[1] / 1000,1); //round the results
            $fahrenheit = round($celsius * 9 / 5 + 32,1);
            print "$celsius &deg;C / $fahrenheit &deg;F<br>";
            $sensors++;
            include './config.php';
            if ($link->connect_error) {
                die("Connection failed: " . $link->connect_error);
            }
            $userid = $_REQUEST['userid'];
            $date = getdate(); //YYYYmmddHHMM            
            $timestamp = $date['year'] . ' ' . date('n') . ' ' . $date['mon'] . ' ' . $date['hours'] . ' ' . $date['minutes'];
            $together = $celsius;
            $sql = "insert into BodyTemperature values('',$together,'$timestamp',$userid)";//as of now for user id 1
            $link->query($sql);
        } else {
            print "Not able to read temperature!";
        }
    }
    fclose($handle);
} else {
    print "No Sensor Found!";
}
?>