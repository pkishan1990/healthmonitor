<html>
    <?php
    session_start();
    ini_set('display_errors', 1);
    ?>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Telepresence Dashboard</title>
        <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
        <link rel="stylesheet" href="bower_components/bootstrap/dist/css/bootstrap.min.css">
        <link rel="stylesheet" href="bower_components/font-awesome/css/font-awesome.min.css">
        <link rel="stylesheet" href="bower_components/Ionicons/css/ionicons.min.css">
        <link rel="stylesheet" href="dist/css/AdminLTE.min.css">
        <link rel="stylesheet" href="dist/css/skins/skin-blue.min.css">
        <link rel="stylesheet" href="./client/mgVideoChat/mgVideoChat-1.15.0.css">
        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
        <link rel="stylesheet"
              href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700,300italic,400italic,600italic">

        <script>
            var date, year, month, day, hour, minute, timestamp;
            function getTimestamp() {
                //YYYYmmddHHMM
                date = new Date();
                year = date.getFullYear();
                month = date.getMonth() + 1;
                day = date.getDate();
                hour = date.getHours();
                minute = date.getMinutes();
                timestamp = year + ' ' + month + ' ' + day + ' ' + hour + ' ' + minute;
                return timestamp;
            }
        </script>
        <?php
        if (isset($_REQUEST['userid'])) {
            $userid = $_REQUEST['userid'];
        } else {
            $userid = 1;
        }
        ?>
        <!-- 
//Notifier - Emergency Team
1. Immediate resuscitation
Hyperthermic (>=100.5 °F)
Severe hypoxia (SpO2 <=89)	

 2. Emergency
//Hypothermia (<=94.0 °F)
Severe bradycardia (<=49 bpm)
Hypotension (<=99 mmHg)
Moderate hypoxia (SpO2 90–94)
        
//Notifier - General Practitioner 
 3. Urgent
Mild hypothermia (94.1–96.2 °F)	
Mild hyperthermia (99.3–100.4 °F)	
Severe tachycardia (>=130 bpm)
High tachycardia (120–129 bpm)
Mild hypotension (100–107 mmHg)

//Notifier - General Practitioner
 4. Semi Urgent
Mild tachycardia (105–109 bpm)	
Moderate tachycardia (110–119 bpm)	
Mild hypertension (177–199 mmHg)	
Hypertension (>=200 mmHg)	

 5. Non urgent
        -->
        <script>
            var gettemp;
            jQuery().ready(function () {
                gettemp = setInterval("getTemperature()", 1000);
            });
            function getTemperature() {
                jQuery.get("tempsensor.php?userid=<?php echo $userid; ?>", function (data) {
                    getTimestamp();
                    document.getElementById("temperature").innerHTML = data;
                    /*
                     Temperature (normal comparator)
                     Hypothermia (<=94.0 °F)
                     Mild hypothermia (94.1–96.2 °F)	
                     Mild hyperthermia (99.3–100.4 °F)	
                     Hyperthermic (>=100.5 °F)	
                     */
                    //Normal temperature range 97.2°F (36.1°C) to 99.3°F (37.2°C).
                    str = data.replace(/[^\d.-]/g, ' ').trim();
                    str = str.replace(/\s{2,}/g, ' ').trim().split(" ");
                    var celsius = str[0];
                    var fahrenheit = str[1];
                    console.log(fahrenheit);
                    console.log(celsius);
                    fahrenheit = 98;
                    getTimestamp();
                    if (fahrenheit >= 100.5)
                    {
                        clearInterval(gettemp);
                        alert('High Body Temperature! Hyperthermic Detected');
                        $("#modal-default").modal();
                        console.log("detected");
                        document.getElementById("hiddentemperaturediv").innerHTML = "Temperature " + fahrenheit + " Hyperthermic Detected";
                        jQuery.ajax({
                            url: 'detectcase.php',
                            method: 'POST',
                            data: {
                                bodytemperature: fahrenheit,
                                timestamp: timestamp,
                                userid: <?php echo $userid; ?>,
                                notifier: 4,
                                casetype: 'new',
                                TriageScore: 'Immediate resuscitation',
                                comments: 'High Body Temperature! Hyperthermic Detected'
                            },
                            success: function (data) {
                                //alert(data);
                            }
                        });
                    } /*else if (fahrenheit <=94.0)
                     {
                     console.log("Hypothermia Detected");
                     }*/else if (fahrenheit > 97.2 && fahrenheit < 99.3)
                    {
                        clearInterval(gettemp);
                        //alert('Normal Body Temperature Detected');
                        jQuery.ajax({
                            url: 'detectcase.php',
                            method: 'POST',
                            data: {
                                bodytemperature: fahrenheit,
                                timestamp: timestamp,
                                userid: <?php echo $userid; ?>,
                                notifier: 2,
                                casetype: 'new',
                                TriageScore: 'Non Urgent',
                                comments: 'Normal Body Temperature Detected'
                            },
                            success: function (data) {
//                                alert(data);
                            }
                        });
                        //alert("Normal Temperature Detected");
                    }
                });
            }
        </script>
    <div id="hiddentemperaturediv" style="display: none;"></div>
    <script>
        jQuery().ready(function () {
            getoxy = setInterval("getOxygenLevel()", 2000);
        });
        function getOxygenLevel() {
            getTimestamp();
            var res = [];
            jQuery.get("./heartoxysensor.php", function (data) {
                if (data.substring(0, 2) === 'no')
                {
                    //document.getElementById("heartrate").innerHTML = 'Please Turn On Device';
                    document.getElementById("oxygenlevel").innerHTML = 'Please Turn On Device';
                } else if (data.substring(0, 3) === '0 0')
                {
                    //document.getElementById("heartrate").innerHTML = 'Reading Heart Rate. Please Wait.';
                    document.getElementById("oxygenlevel").innerHTML = 'Reading Oxygen Level. Please Wait.';
                } else
                {
                    res = data.split(" ");
                    //document.getElementById("heartrate").innerHTML = res[0];
                    document.getElementById("oxygenlevel").innerHTML = res[1];
                    jQuery.ajax({
                        url: 'insertsensordata.php',
                        method: 'POST',
                        data: {
                            //heartrate: res[0],
                            oxygensensor: 1,
                            oxygenlevel: res[1],
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>
                        },
                        success: function (data) {
//                            alert(data);
                        }
                    });
                    /*
                     * 1. Immediate resuscitation
                     Severe hypoxia (SpO2 <=89)	
                     2. Emergency
                     Moderate hypoxia (SpO2 90–94)
                     */
                    //res[1] = 99;
                    //console.log(res[1]);
                    if (res[1] <= 89) {
                        console.log("executing");
                        alert('Low Oxgen Level! Severe Hypoxia Detected');
                        clearInterval(getoxy);
                        $("#modal-default").modal();
                        jQuery.ajax({
                            url: 'detectcase.php',
                            method: 'POST',
                            data: {
                                oxygenlevel: res[1],
                                timestamp: timestamp,
                                userid: <?php echo $userid; ?>,
                                notifier: 4,
                                casetype: 'new',
                                TriageScore: 'Immediate resuscitation',
                                comments: 'Low Oxgen Level! Severe Hypoxia Detected'
                            },
                            success: function (data) {
//                                alert(data);
                            }
                        });
                    } else if (res[1] >= 90 && res[1] <= 94) {
                        console.log("executing");
                        clearInterval(getoxy);
                        alert('Low Oxgen Level! Moderate hypoxia Detected');
                        $("#modal-default").modal();
                        jQuery.ajax({
                            url: 'detectcase.php',
                            method: 'POST',
                            data: {
                                oxygenlevel: res[1],
                                timestamp: timestamp,
                                userid: <?php echo $userid; ?>,
                                notifier: 4,
                                casetype: 'new',
                                TriageScore: 'Emergency',
                                comments: 'Low Oxgen Level! Moderate hypoxia Detected'
                            },
                            success: function (data) {
//                                alert(data);
                            }
                        });
                    } else {
                        //alert("Normal Oxygen Level Detected");
                        clearInterval(getoxy);
                        jQuery.ajax({
                            url: 'detectcase.php',
                            method: 'POST',
                            data: {
                                oxygenlevel: res[1],
                                timestamp: timestamp,
                                userid: <?php echo $userid; ?>,
                                notifier: 2,
                                casetype: 'new',
                                TriageScore: 'Non Urgent',
                                comments: 'Normal Oxygen Level Detected'
                            },
                            success: function (data) {
//                                alert(data);
                            }
                        });

                    }
                }

            });
        }

    </script> 
    <script>
        /*jQuery().ready(function () {
         getbpheart = setInterval("getBloodPressureHeartRate()", 1000);
         });
         */
        function getBloodPressureHeartRate() {
            alert("Executed");
            document.getElementById("bloodpressure").innerHTML = 'Please Wait until Blood Pressure is measured';
            document.getElementById("heartrate").innerHTML = 'Please Wait until Heart Rate is measured';
            getTimestamp();
            //var str = "b'\r128, 092, 096\n'";

            jQuery.get("bloodpressure.php", function (data) {
                alert(data);
                str = data;
                //clearInterval(getbpheart);
                document.getElementById("bloodpressure").innerHTML = data;
                str = str.replace(/\D/g, ' ').trim().split(" ");
                var bloodpressure1 = str[0].toString().replace(/^0+/, '');
                var bloodpressure2 = str[2].toString().replace(/^0+/, '');
                var hr = str[4].toString().replace(/^0+/, '');
                var bloodpressure = bloodpressure1 + "/" + bloodpressure2 + "mmHg";
                var heartrate = hr + "bpm";
                document.getElementById("bloodpressure").innerHTML = bloodpressure;
                document.getElementById("heartrate").innerHTML = heartrate;
                jQuery.ajax({
                    url: 'insertsensordata.php',
                    method: 'POST',
                    data: {
                        bloodpressuresensor: 1,
                        bloodpressure: bloodpressure,
                        heartrate: heartrate,
                        timestamp: timestamp,
                        userid: <?php echo $userid; ?>
                    },
                    success: function (data) {
                        alert(data);
                    },
                    error: function (xhr, status, error) {
                        console.log(xhr, status, error);

                    },
                    dataType: 'text'
                }
                );
                /*
                 * 
                 2. Emergency
                 Hypotension (<=99 mmHg)
                 HIGH BLOOD PRESSURE (HYPERTENSION) STAGE 2	140 OR HIGHER	or	90 OR HIGHER
                 HYPERTENSIVE CRISIS (consult your doctor immediately)	> 180	and/or	> 120
                 
                 (upper number)(lower number)
                 NORMAL	<120 and	<80
                 //bloodpressure1, bloodpressure2, hr
                 Severe tachycardia (>=130 bpm)
                 High tachycardia (120–129 bpm)
                 Mild hypotension (100–107 mmHg)
                 
                 */


                //bloodpressure1 = 100;


                if (bloodpressure1 < 120) {
                    alert("Normal Blood Pressure");
                    jQuery.ajax({
                        url: 'detectcase.php',
                        method: 'POST',
                        data: {
                            bloodpressure1: bloodpressure1,
                            bloodpressure2: bloodpressure2,
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>,
                            notifier: 2,
                            casetype: 'new',
                            TriageScore: 'Non Urgent',
                            comments: 'Normal Blood Pressure Detected'
                        },
                        success: function (data) {
                            alert(data);
                        }
                    });
                } else if (bloodpressure1 >= 120 && bloodpressure1 <= 129) {
                    //General Practitioner   
                    alert('Elevated Blood Pressure');
                    $("#modal-default").modal();
                    jQuery.ajax({
                        url: 'detectcase.php',
                        method: 'POST',
                        data: {
                            bloodpressure1: bloodpressure1,
                            bloodpressure2: bloodpressure2,
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>,
                            notifier: 2,
                            casetype: 'new',
                            TriageScore: 'Semi Urgent',
                            comments: 'Elevated Blood Pressure'
                        },
                        success: function (data) {
                            alert(data);
                        }
                    });

                    console.log("Elevated Blood Pressure");
                } else if (bloodpressure1 >= 130 && bloodpressure1 <= 139) {
                    //General Practitioner  
                    alert('Stage 1 high blood pressure (hypertension) Detected');
                    $("#modal-default").modal();
                    jQuery.ajax({
                        url: 'detectcase.php',
                        method: 'POST',
                        data: {
                            bloodpressure1: bloodpressure1,
                            bloodpressure2: bloodpressure2,
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>,
                            notifier: 2,
                            casetype: 'new',
                            TriageScore: 'Urgent',
                            comments: 'Stage 1 high blood pressure (hypertension)'
                        },
                        success: function (data) {
                            alert(data);
                        }
                    });
                } else if (bloodpressure1 >= 140) {
                    alert("Stage 2 high blood pressure (hypertension)");
                    //clearInterval();
                    $("#modal-default").modal();
                    jQuery.ajax({
                        url: 'detectcase.php',
                        method: 'POST',
                        data: {
                            bloodpressure1: bloodpressure1,
                            bloodpressure2: bloodpressure2,
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>,
                            notifier: 4,
                            casetype: 'new',
                            TriageScore: 'Emergency',
                            comments: 'Stage 2 high blood pressure (hypertension) Detected'
                        },
                        success: function (data) {
                            alert(data);
                        }
                    });
                }
                //General Practitioner above 100 beats a minute (tachycardia) and less than 40-60 bradycardia 
                //- Er 40 beats a minute (bradycardia)
//                hr = 70;
                //              console.log(hr);
                if (hr >= 60 && hr <= 100)
                {
                    console.log("Normal Heart Rate Detected");
                    alert('Normal Heart Rated Detected');
                    jQuery.ajax({
                        url: 'detectcase.php',
                        method: 'POST',
                        data: {
                            heartrate: hr,
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>,
                            notifier: 2,
                            casetype: 'new',
                            TriageScore: 'Non Urgent',
                            comments: 'Normal Heart Rate Detected'
                        },
                        success: function (data) {
                            alert(data);
                        }
                    });
                } else if (hr < 60 && hr > 40)
                {
                    alert("Low Heart Rate! bradycardia detected");
                    $("#modal-default").modal();
                    ///Emergency Team
                    jQuery.ajax({
                        url: 'detectcase.php',
                        method: 'POST',
                        data: {
                            heartrate: hr,
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>,
                            notifier: 2,
                            casetype: 'new',
                            TriageScore: 'Semi Urgent',
                            comments: 'Low Heart Rate! bradycardia detected'
                        },
                        success: function (data) {
                            alert(data);
                        }
                    });
                } else if (hr <= 40) {
                    alert("Low Heart Rate! bradycardia detected");
                    $("#modal-default").modal();
                    ///Emergency Team
                    jQuery.ajax({
                        url: 'detectcase.php',
                        method: 'POST',
                        data: {
                            heartrate: hr,
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>,
                            notifier: 4,
                            casetype: 'new',
                            TriageScore: 'Emergency',
                            comments: 'Low Heart Rate! bradycardia detected'
                        },
                        success: function (data) {
                            alert(data);
                        }
                    });
                } else if (hr > 100) {
                    alert("Extreme Heart Rate! tachycardia detected");
                    $("#modal-default").modal();
                    ///Emergency Team
                    jQuery.ajax({
                        url: 'detectcase.php',
                        method: 'POST',
                        data: {
                            heartrate: hr,
                            timestamp: timestamp,
                            userid: <?php echo $userid; ?>,
                            notifier: 4,
                            casetype: 'new',
                            TriageScore: 'Emergency',
                            comments: 'Extreme Heart Rate! tachycardia detected'
                        },
                        success: function (data) {
                            alert(data);
                        }
                    });
                }

            });


        }
        //getBloodPressureHeartRate();
    </script>

</head>
<!--
BODY TAG OPTIONS:
=================
Apply one or more of the following classes to get the
desired effect
|---------------------------------------------------------|
| SKINS         | skin-blue                               |
|               | skin-black                              |
|               | skin-purple                             |
|               | skin-yellow                             |
|               | skin-red                                |
|               | skin-green                              |
|---------------------------------------------------------|
|LAYOUT OPTIONS | fixed                                   |
|               | layout-boxed                            |
|               | layout-top-nav                          |
|               | sidebar-collapse                        |
|               | sidebar-mini                            |
|---------------------------------------------------------|
-->
<body class="hold-transition skin-blue sidebar-mini">
    <div class="wrapper">

        <!-- Main Header -->
        <header class="main-header">

            <!-- Logo -->
            <a href="index2.html" class="logo">
                <!-- mini logo for sidebar mini 50x50 pixels -->
                <span class="logo-mini"><b>Tele</b>P</span>
                <!-- logo for regular state and mobile devices -->
                <span class="logo-lg"><b>Telepresence</b></span>
            </a>

            <!-- Header Navbar -->
            <nav class="navbar navbar-static-top" role="navigation">
                <!-- Sidebar toggle button-->
                <a href="#" class="sidebar-toggle" data-toggle="push-menu" role="button">
                    <span class="sr-only">Toggle navigation</span>
                </a>
                <!-- Navbar Right Menu -->
                <div class="navbar-custom-menu">

                    <ul class="nav navbar-nav">

                        <li class="dropdown user user-menu">
                            <a href="#" class="dropdown-toggle" data-toggle="dropdown">

                                <img src="dist/img/user2-160x160.jpg" class="user-image" alt="User Image">

                                <span class="hidden-xs"><?php
                                    if (isset($_SESSION['login_user'])) {
                                        $login_user = $_SESSION['login_user'];
                                        echo $login_user;
                                    }else{
                                        $login_user = 'kishan';
                                        echo $login_user;
                                    }
                                    ?>   </span>
                            </a>
                            <ul class="dropdown-menu">

                                <li class="user-header">


                                    <p>
                                        <?php
                                        include './config.php';
                                        if ($link->connect_error) {
                                            die("Connection failed: " . $link->connect_error);
                                        }

                                        $sql = "SELECT * FROM registration where username='$login_user'";
                                        $result = $link->query($sql);

                                        if ($result->num_rows > 0) {
                                            // output data of each row
                                            while ($row = $result->fetch_assoc()) {
                                                echo "Name: " . $row["username"] . " <br> Age: " . $row["age"] . "<br> Sex: " . $row['sex'] . "<br> Family History: "
                                                . "" . $row['familyHistory'] . "<br> Medications: " . $row['medications'] . ""
                                                . "<br> Vaccinations: " . $row['vaccinations'];
                                            }
                                        } else {
                                            echo "0 results";
                                        }
                                        ?>
                                    </p>
                                </li>

                                <li class="user-body">
                                    <div class="row">
                                        <div class="col-xs-4 text-center">

                                        </div>
                                        <div class="col-xs-4 text-center">

                                        </div>
                                        <div class="col-xs-4 text-center">

                                        </div>
                                    </div>

                                </li>

                                <li class="user-footer">
                                    <div class="pull-left">

                                    </div>
                                    <div class="pull-right">
                                        <a href="logout.php" class="btn btn-default btn-flat">Sign out</a>
                                    </div>
                                </li>
                            </ul>
                        </li>

                    </ul>
                </div>
            </nav>
        </header>
        <!-- Left side column. contains the logo and sidebar -->


        <?php include './sidebar.php'; ?>
        <!-- Content Wrapper. Contains page content -->
        <div class="content-wrapper">
            <!-- Content Header (Page header) -->
            <section class="content-header">
                <h1>
                    Dashboard

                </h1>
                <ol class="breadcrumb">
                    <li><a href="index.php"><i class="fa fa-dashboard"></i> Home</a></li>
                    <li class="active">Dashboard</li>
                </ol>
            </section>

            <!-- Main content -->
            <section class="content container-fluid">

                <!--------------------------
                | Your Page Content Here |
                -------------------------->
                <div class="row" style="margin-top: 20px;">
                    <div class="col-md-3 col-sm-6 col-xs-12">
                        <div class="info-box">
                            <span class="info-box-icon bg-aqua"><i class="ion ion-thermometer"></i></span>

                            <div class="info-box-content">
                                <span class="info-box-text">Max. Body Temperature</span>
                                <span class="info-box-number"><?php
        $sql = "SELECT MAX(CurrentBodyTemperature) FROM BodyTemperature";
        $result = $link->query($sql);
        $row = $result->fetch_assoc();
        echo round($row["MAX(CurrentBodyTemperature)"], 2);
        ?></span>
                            </div>
                            <!-- /.info-box-content -->
                        </div>
                        <!-- /.info-box -->
                    </div>
                    <!-- /.col -->
                    <div class="col-md-3 col-sm-6 col-xs-12">
                        <div class="info-box">
                            <span class="info-box-icon bg-red"><i class="ion-ios-pulse"></i></span>

                            <div class="info-box-content">
                                <span class="info-box-text">Max. Pulse Rate</span>
                                <span class="info-box-number"><?php
                                    $sql = "SELECT MAX(CurrentHeartRate) FROM HeartRate";
                                    $result = $link->query($sql);
                                    $row = $result->fetch_assoc();
                                    echo $row["MAX(CurrentHeartRate)"] . 'bpm';
        ?></span>
                            </div>
                            <!-- /.info-box-content -->
                        </div>
                        <!-- /.info-box -->
                    </div>
                    <!-- /.col -->
                    <div class="clearfix visible-sm-block"></div>

                    <!-- /.col -->
                    <div class="col-md-3 col-sm-6 col-xs-12">
                        <div class="info-box">
                            <span class="info-box-icon bg-yellow"><i class="ion ion-android-radio-button-on"></i></span>

                            <div class="info-box-content">
                                <span class="info-box-text">Min Oxygen Level</span>
                                <span class="info-box-number"><?php
                                    $sql = "SELECT MIN(CurrentBloodOxygenLevel) FROM BloodOxygenLevel";
                                    $result = $link->query($sql);
                                    $row = $result->fetch_assoc();
                                    echo $row["MIN(CurrentBloodOxygenLevel)"] . 'mmHg';
        ?></span>
                            </div>
                            <!-- /.info-box-content -->
                        </div>
                        <!-- /.info-box -->
                    </div>
                    <!-- /.col -->

                    <!-- /.col -->
                    <div class="col-md-3 col-sm-6 col-xs-12">
                        <div class="info-box">
                            <span class="info-box-icon bg-yellow"><i class="ion ion-android-arrow-dropleft"></i></span>

                            <div class="info-box-content">
                                <span class="info-box-text">Min Blood Pressure Level</span>
                                <span class="info-box-number"><?php
                                    $sql = "SELECT MIN(CurrentBloodPressureLevel) FROM BloodPressureLevel";
                                    $result = $link->query($sql);
                                    $row = $result->fetch_assoc();
                                    echo $row['MIN(CurrentBloodPressureLevel)'];
        ?></span>
                            </div>
                            <!-- /.info-box-content -->
                        </div>
                        <!-- /.info-box -->
                    </div>
                    <!-- /.col -->
                </div>    


                <div class="row">
                    <div class="col-md-12">
                        <div class="box">
                            <div class="box-header with-border">
                                <h3 class="box-title">Sensors Dashboard</h3>

                                <div class="box-tools pull-right">
                                    <button type="button" class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-minus"></i>
                                    </button>
                                    <div class="btn-group">

                                        <ul class="dropdown-menu" role="menu">
                                            <li><a href="#">Action</a></li>
                                            <li class="divider"></li>
                                            <li><a href="#">Separated link</a></li>
                                        </ul>
                                    </div>
                                    <button type="button" class="btn btn-box-tool" data-widget="remove"><i class="fa fa-times"></i></button>
                                </div>
                            </div>
                            <!-- /.box-header -->
                            <div class="box-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <p class="text-center">
                                            <strong>Body Temperature</strong>
                                        </p>

                                        <div class="box-body">
                                            <table class="table table-bordered">
                                                <tbody>
                                                    <tr>
                                                        <td> <img src="dist/img/bodytemperature.jpg" width="100px" height="100px"></td>
                                                        <td>

                                                            <span class="info-box-number">
                                                                <div id="temperature"></div>
                                                            </span>

                                                        </td>

                                                    </tr>

                                                </tbody></table>
                                        </div>                                            

                                    </div>

                                    <div class="col-md-3">
                                        <p class="text-center">
                                            <strong>Blood Oxygen Level</strong>
                                        </p>

                                        <table class="table table-bordered">
                                            <tbody>
                                                <tr>
                                                    <td> <img src="./dist/img/bloodoxygenlevel.jpg" width="100px" height="100px"></td>
                                                    <td>

                                                        <span class="info-box-number">
                                                            <div id="oxygenlevel"></div>
                                                        </span>

                                                    </td>

                                                </tr>

                                            </tbody></table> 
                                        <!-- /.chart-responsive -->
                                    </div>
                                    <div class="col-md-3">
                                        <p class="text-center">
                                            <strong>Pulse Rate</strong>
                                        </p>

                                        <table class="table table-bordered">
                                            <tbody>
                                                <tr>
                                                    <td> <img src="./dist/img/heartrate.png" width="100px" height="100px"></td>
                                                    <td>

                                                        <span class="info-box-number">
                                                            <div id="heartrate" onclick='getBloodPressureHeartRate();'>Click Here and Start Measuring</div>
                                                        </span>

                                                    </td>

                                                </tr>

                                            </tbody></table> 

                                    </div>

                                    <div class="col-md-3">
                                        <p class="text-center">
                                            <strong>Blood Pressure</strong>
                                        </p>

                                        <table class="table table-bordered">
                                            <tbody>
                                                <tr>
                                                    <td> <img src="./dist/img/blood_pressure.png" width="100px" height="100px"></td>
                                                    <td>

                                                        <span class="info-box-number">
                                                            <div onclick='getBloodPressureHeartRate();' id="bloodpressure">
                                                                Click Here and Start Measuring
                                                            </div>
                                                        </span>

                                                    </td>

                                                </tr>

                                            </tbody></table> 
                                        <!-- /.chart-responsive -->
                                    </div>
                                    <!-- /.col -->
                                </div>
                                <!-- /.row -->
                            </div>

                            <div class="modal fade" id="modal-default" style="display: none;">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <div class="modal-header">
                                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                <span aria-hidden="true">×</span></button>
                                            <h4 class="modal-title"><center>Case Opened<script>document.getElementById("hiddentemperaturediv").innerHTML;</script> </center></h4>
                                        </div>
                                        <div class="modal-body">
                                            <p>Medical Team Alerted</p>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-default pull-left" data-dismiss="modal">Close</button>
                                            <!-- <button type="button" class="btn btn-primary">Save changes</button> -->
                                        </div>
                                    </div>
                                    <!-- /.modal-content -->
                                </div>
                                <!-- /.modal-dialog -->
                            </div>
                            <!-- ./box-body -->
                            <div class="box-footer">
                                <div class="row">
                                    <div class="col-sm-6 col-xs-12">
                                        <div class="description-block border-right">
                                            <h5 class="description-header">Notes:</h5>
                                            <span class="description-text"><b>Start Measuring all vitals to generate a case.</b></span>
                                        </div>
                                        <!-- /.description-block -->
                                    </div>
                                    <!-- /.col -->

                                </div>
                                <!-- /.row -->
                            </div>
                            <!-- /.box-footer -->
                        </div>
                        <!-- /.box -->
                    </div>
                    <!-- /.col -->
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div class="box">
                            <div class="box-header with-border">
                                <h3 class="box-title">WebRTC Communication Dashboard</h3>

                                <div class="box-tools pull-right">
                                    <button type="button" class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-minus"></i>
                                    </button>
                                    <div class="btn-group">

                                        <ul class="dropdown-menu" role="menu">
                                            <li><a href="#">Action</a></li>
                                            <li class="divider"></li>
                                            <li><a href="#">Separated link</a></li>
                                        </ul>
                                    </div>
                                    <button type="button" class="btn btn-box-tool" data-widget="remove"><i class="fa fa-times"></i></button>
                                </div>
                            </div>
                            <!-- /.box-header -->
                            <div class="box-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <p class="text-center">
                                            <strong><!--text header--></strong>
                                        </p>

                                        <div class="box-body">
                                            <div id="mgVideoChat"></div>
                                        </div>                                            

                                    </div>

                                    <!-- /.col -->
                                </div>
                                <!-- /.row -->
                            </div>
                            <!-- ./box-body -->

                        </div>
                        <!-- /.box -->
                    </div>
                    <!-- /.col -->
                </div>
                <!-- started from here -->
                <script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
                <script type="text/javascript" src="//netdna.bootstrapcdn.com/bootstrap/3.0.2/js/bootstrap.min.js"></script>
                <!-- Video Chat -->
                <script src="./client/mgVideoChat/mgVideoChat-1.15.0.js"></script>
                <script src="./client/demos/common/js/menu.js"></script> 
                <script>
                                                $(document).ready(function () {
                                                    $('#mgVideoChat').mgVideoChat({
                                                        wsURL: wsUrlDefault + '?room=1'
                                                    });
                                                });
                                                /*console.log(document.cookie.indexOf('mgVideoChatSimple='));
                                                 if (document.cookie.indexOf('mgVideoChatSimple') == -1) {
                                                 //var cookie = "mgVideoChatSimple=test" + Math.floor((Math.random() * 100) + 1);
                                                 var cookie = "mgVideoChatSimple=kishan";
                                                 document.cookie = cookie;
                                                 } else {
                                                 
                                                 }*/

                                                if (document.cookie.indexOf('mgVideoChatSimple') == -1) {
                                                    //var cookie = "mgVideoChatSimple=test" + Math.floor((Math.random() * 100) + 1);
                                                    var cookie = "mgVideoChatSimple=kishan;path=/";
                                                    document.cookie = cookie;
                                                } else {
                                                    var cookie = "mgVideoChatSimple=kishan;path=/";
                                                    document.cookie = cookie;
                                                }

                </script>      
                <!-- end here -->
            </section>
            <!-- /.content -->
        </div>
        <!-- /.content-wrapper -->
        <!-- Main Footer -->
        <footer class="main-footer">
            <!-- To the right -->
            <div class="pull-right hidden-xs">
                Guided By : Dr. Sabah Mohammed
            </div>
            <!-- Default to the left -->
            <strong>Copyright &copy; 2017-2018.</strong> All rights reserved.
        </footer>

        <!-- /.control-sidebar -->
        <!-- Add the sidebar's background. This div must be placed
        immediately after the control sidebar -->
        <div class="control-sidebar-bg"></div>
    </div>
    <!-- ./wrapper -->

    <!-- REQUIRED JS SCRIPTS -->

    <!-- jQuery 3 -->
    <!--<script src="bower_components/jquery/dist/jquery.min.js"></script>-->
    <!-- Bootstrap 3.3.7 -->
    <script src="bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
    <!-- AdminLTE App -->
    <script src="dist/js/adminlte.min.js"></script>

    <!-- Optionally, you can add Slimscroll and FastClick plugins.
         Both of these plugins are recommended to enhance the
         user experience. -->
</body>
</html>