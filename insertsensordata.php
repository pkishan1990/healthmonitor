<?php

include './config.php';
if ($link->connect_error) {
    die("Connection failed: " . $link->connect_error);
}

if ($_REQUEST['oxygensensor'] == 1) {
    $oxygenlevel = $_REQUEST['oxygenlevel'];
    $timestamp = $_REQUEST['timestamp'];
    $userid = $_REQUEST['userid'];

    $sql = "insert into BloodOxygenLevel values('',$oxygenlevel,'$timestamp',$userid)";
    $link->query($sql);
    echo $sql;
}


if ($_REQUEST['bloodpressuresensor'] == 1) {
    $bloodpressure = $_REQUEST['bloodpressure'];
    $heartrate  = $_REQUEST['heartrate'];
    $timestamp = $_REQUEST['timestamp'];
    $userid = $_REQUEST['userid'];
    $sql = "insert into BloodPressureLevel values('','$bloodpressure','$timestamp',$userid)";
    $link->query($sql);
    //echo $sql;
    $sql = "insert into HeartRate values('','$heartrate','$timestamp',$userid)";
    $link->query($sql);
    //echo $sql;
}
?>