<?php

include './config.php';
if ($link->connect_error) {
    die("Connection failed: " . $link->connect_error);
}
$bodytemperature = (int) $_REQUEST['bodytemperature'];
$oxygenlevel = (int) $_REQUEST['oxygenlevel'];
$bloodpressure1 = (int) $_REQUEST['bloodpressure1'];
$heartrate = (int) $_REQUEST['heartrate'];
$triagescore = (int) $_REQUEST['TriageScore'];

$notifier = array();

$triage_score = array();

if ($bodytemperature != 0) {
    if ($bodytemperature >= 100.5) {
        array_push($notifier, 4);
        array_push($triage_score, 1);
        $TriageScore = 'Immediate resuscitation';
//        echo 'notified to emergency';
    } else if ($bodytemperature > 97.2 && $bodytemperature < 99.3) {
        array_push($notifier, 2);
        array_push($triage_score, 5);
        $TriageScore = 'Non Urgent';
//      var_dump($notifier);
//    echo 'body temperature';
//  echo 'notified to general';
    }
}

//echo 'oxygen level is' . $oxygenlevel;
if ($oxygenlevel != 0) {
    if ($oxygenlevel <= 89) {
        array_push($notifier, 4);
        array_push($triage_score, 1);
        $TriageScore = 'Immediate resuscitation';
//        echo 'notified to emergency';
    } else if ($oxygenlevel >= 90 && $oxygenlevel <= 94) {
        array_push($notifier, 4);
        array_push($triage_score, 2);
        $TriageScore = 'Emergency';
//        echo 'notified to emergency';
    } else if ($oxygenlevel > 94) {
        array_push($notifier, 2);
        $TriageScore = 'Non Urgent';
        array_push($triage_score, 5);
// echo 'oxygen level';
//        echo 'notified to general';
    }
}
if ($bloodpressure1 != 0) {
    if ($bloodpressure1 <= 120) {
        array_push($notifier, 2);
        $TriageScore = 'Non Urgent';
        array_push($triage_score, 5);
//        echo 'bloodpressure';
//        echo 'notified to general';
    } else if ($bloodpressure1 > 120 && $bloodpressure1 <= 129) {
        array_push($notifier, 2);
        $TriageScore = 'Semi Urgent';
        array_push($triage_score, 4);
//        echo 'notified to general';
    } else if ($bloodpressure1 >= 130 && $bloodpressure1 <= 139) {
        array_push($notifier, 2);
        $TriageScore = 'Urgent';
        array_push($triage_score, 3);
//        echo 'notified to general';
    } else if ($bloodpressure1 >= 140) {
        array_push($notifier, 4);
        $TriageScore = 'Emergency';
        array_push($triage_score, 2);
        echo 'heart rate is executing';
//        echo 'notified to emergency';
    }
}


if ($heartrate != 0) {
    if ($heartrate >= 60 && $heartrate <= 100) {
        array_push($notifier, 2);
        $TriageScore = 'Non Urgent';
        array_push($triage_score, 5);
//        echo 'heart rate';
//        echo 'notified to general';
    } else if ($heartrate < 60 && $heartrate > 40) {
        array_push($notifier, 2);
        $TriageScore = 'Semi Urgent';
        array_push($triage_score, 4);
//        echo 'notified to general';
    } else if ($heartrate <= 40) {
        array_push($notifier, 4);
        $TriageScore = 'Emergency';
//        echo 'notified to emergency';
        array_push($triage_score, 2);
    } else if ($heartrate > 100) {
        array_push($notifier, 4);
        $TriageScore = 'Emergency';
//        echo 'notified to emergency';
        array_push($triage_score, 2);
    }
}

$notifiermain = max($notifier);
$notifier = $notifiermain;

//echo 'the notifier is: ' . $notifier;

$triagescoremain = min($triage_score);
$triage_score = $triagescoremain;

//echo 'min triage score is ' . $triagescoremain;
//Immediate resuscitation - 1
//Emergency - 2
//Urgent - 3 
//Semi Urgent - 4
//Non Urgent - 5
//echo 'triage score is '.$triage_score;


if ($triage_score == 1) {
    $triagescore = 'Immediate resuscitation';
} else if ($triage_score == 2) {
    $triagescore = 'Emergency';
} else if ($triage_score == 3) {
    $triagescore = 'Urgent';
} else if ($triage_score == 4) {
    $triagescore = 'Semi Urgent';
} else if ($triage_score == 5) {
    $triagescore = 'Non Urgent';
}


//echo 'triage score is:. ' . $triagescore;
//echo 'calculated triage score is: '.$triage_score;
//echo $triagescore;
//For temperature
//$triagescore=$triagescoremain;
if ($_REQUEST['bodytemperature']) {
    $timestamp = $_REQUEST['timestamp'];
    $userid = $_REQUEST['userid'];
    $casetype = $_REQUEST['casetype'];
    $comments = $_REQUEST['comments'];
    $sql = "select * from cases where userid = $userid and casetype = 'new'";
    $sqlresult = $link->query($sql);
    $row = $sqlresult->fetch_assoc();
    if ($row) {
        if (strcmp($comments, $row['Comments']) != 0) {
            $comments = $comments . ", <br>" . $row['Comments'];
            $sql = "update cases set temperature = $bodytemperature, Comments = '$comments' where userid = $userid and casetype = 'new'";
            $link->query($sql);
        } else {
            $sql = "update cases set temperature = $bodytemperature where userid = $userid and casetype = 'new'";
            $link->query($sql);
        }
    } else {
        $sql = "insert into cases(id, temperature, timestamp, userid, notifier, casetype, TriageScore, Comments) values('', $bodytemperature, '$timestamp', $userid, $notifier, '$casetype', '$triagescore', '$comments')";
        $link->query($sql);
    }
}

//For oxygenlevel
if ($_REQUEST['oxygenlevel']) {
    $timestamp = $_REQUEST['timestamp'];
    $userid = $_REQUEST['userid'];
    $casetype = $_REQUEST['casetype'];
    $comments = $_REQUEST['comments'];
    $sql = "select * from cases where userid = $userid and casetype = 'new'";
    $sqlresult = $link->query($sql);
    $row = $sqlresult->fetch_assoc();
    if ($row) {
        if (strcmp($comments, $row['Comments']) != 0) {
            $comments = $comments . ", <br>" . $row['Comments'];
            $sql = "update cases set bloodoxygen = '$oxygenlevel', Comments = '$comments' where userid = $userid and casetype = 'new'";
            $link->query($sql);
        } else {
            $sql = "update cases set bloodoxygen = $oxygenlevel where userid = $userid and casetype = 'new'";
            $link->query($sql);
        }
    } else {
        $sql = "insert into cases(id, bloodoxygen, timestamp, userid, notifier, casetype, TriageScore, Comments) values('', $oxygenlevel, '$timestamp', $userid, $notifier, '$casetype', '$triagescore', '$comments')";
        $link->query($sql);
    }
}


//For oxygenlevel
if ($_REQUEST['bloodpressure1']) {
    $bloodpressure1 = $_REQUEST['bloodpressure1'];
    $bloodpressure2 = $_REQUEST['bloodpressure1'];
    $bloodpressure = $bloodpressure + "/" + $bloodpressure2;
    $timestamp = $_REQUEST['timestamp'];
    $userid = $_REQUEST['userid'];
    $casetype = $_REQUEST['casetype'];
    $comments = $_REQUEST['comments'];
    $sql = "select * from cases where userid = $userid and casetype = 'new'";
    $sqlresult = $link->query($sql);
    $row = $sqlresult->fetch_assoc();
    if ($row) {
        if (strcmp($comments, $row['Comments']) != 0) {
            $comments = $comments . ", <br>" . $row['Comments'];
            $sql = "update cases set bloodpressure = '$bloodpressure', Comments = '$comments' where userid = $userid and casetype = 'new'";
            $link->query($sql);
        } else {
            $sql = "update cases set bloodpressure = $bloodpressure where userid = $userid and casetype = 'new'";
            $link->query($sql);
        }
    } else {
        $sql = "insert into cases(id, bloodpressure, timestamp, userid, notifier, casetype, TriageScore, Comments) values('', '$bloodpressure', '$timestamp', $userid, $notifier, '$casetype', '$triagescore', '$comments')";
        $link->query($sql);
    }

//$link->query($sql);
}


//For Heart Rate
if ($_REQUEST['heartrate']) {
    $timestamp = $_REQUEST['timestamp'];
    $userid = $_REQUEST['userid'];
    $casetype = $_REQUEST['casetype'];
    $comments = $_REQUEST['comments'];
    $sql = "select * from cases where userid = $userid and casetype = 'new'";
    $sqlresult = $link->query($sql);
    $row = $sqlresult->fetch_assoc();
    if ($row) {
        if (strcmp($comments, $row['Comments']) != 0) {
            $comments = $comments . ", <br>" . $row['Comments'];
//            echo 'inserting comments';
            $sql = "update cases set heartrate = $heartrate, Comments = '$comments' where userid = $userid and casetype = 'new'";
            $link->query($sql);
        } else {
//         echo 'not inserting comments';
            $sql = "update cases set heartrate = $heartrate where userid = $userid and casetype = 'new'";
            $link->query($sql);
        }
    } else {
//        echo 'not inserting comments';
        $sql = "insert into cases(id, heartrate, timestamp, userid, notifier, casetype, TriageScore, Comments) values('', $heartrate, '$timestamp', $userid, $notifier, '$casetype', '$triagescore', '$comments')";
        $link->query($sql);
    }
}
$userid = $_REQUEST['userid'];
//update traiage score if database value is different from calculated triage score.
$sql = "select * from cases where userid = $userid and casetype = 'new'";
$sqlresult = $link->query($sql);
$row = $sqlresult->fetch_assoc();
$triagescore = $row['TriageScore'];
//$triage_score
if ($triagescore == 'Immediate resuscitation') {
    $triagescore = 1;
} else if ($triagescore == 'Emergency') {
    $triagescore = 2;
} else if ($triagescore == 'Urgent') {
    $triagescore = 3;
} else if ($triagescore == 'Semi Urgent') {
    $triagescore = 4;
} else if ($triagescore == 'Non Urgent') {
    $triagescore = 5;
}
//
//echo 'expected integer' . $triagescore;
//echo 'Database Triage Score is ' . $triagescore;
//echo 'our calculated triage score is ' . $triagescoremain;



if ($triagescore > $triagescoremain) {
    if ($triagescoremain == 1) {
        $triagescoremain = 'Immediate resuscitation';
    } else if ($triagescoremain == 2) {
        $triagescoremain = 'Emergency';
    } else if ($triagescoremain == 3) {
        $triagescoremain = 'Urgent';
    } else if ($triagescoremain == 4) {
        $triagescoremain = 'Semi Urgent';
    } else if ($triagescoremain == 5) {
        $triagescoremain = 'Non Urgent';
    }
    $sql = "update cases set TriageScore='$triagescoremain' where userid = $userid and casetype = 'new'";
    $link->query($sql);
//    echo 'triage score is updating';
//    echo $sql;
}


$sql = "select notifier from cases where userid = $userid and casetype = 'new'";
$sqlresult = $link->query($sql);
$row = $sqlresult->fetch_assoc();
//echo '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>' . $row['notifier'];
//echo '<<<<<<<<<<<<<<<<<<<<<<' . $notifiermain;
if ($row['notifier'] < $notifiermain) {
    $sql = "update cases set notifier=$notifiermain where userid = $userid and casetype = 'new'";
    $link->query($sql);
//    echo $sql;
}
?>