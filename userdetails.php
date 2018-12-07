<!DOCTYPE html>
<!--
This is a starter template page. Use this page to start your new project from
scratch. This page gets rid of all links and provides the needed markup only.
-->
<html>
    <?php session_start(); ?>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Telepresence Dashboard</title>
        <!-- Tell the browser to be responsive to screen width -->
        <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
        <link rel="stylesheet" href="../bower_components/bootstrap/dist/css/bootstrap.min.css">
        <!-- Font Awesome -->
        <link rel="stylesheet" href="../bower_components/font-awesome/css/font-awesome.min.css">
        <!-- Ionicons -->
        <link rel="stylesheet" href="../bower_components/Ionicons/css/ionicons.min.css">
        <!-- Theme style -->
        <link rel="stylesheet" href="../dist/css/AdminLTE.min.css">
        <!-- AdminLTE Skins. We have chosen the skin-blue for this starter
              page. However, you can choose any other skin. Make sure you
              apply the skin class to the body tag so the changes take effect. -->
        <link rel="stylesheet" href="../dist/css/skins/skin-blue.min.css">

        <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
        <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
        <!--[if lt IE 9]>
        <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
        <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
        <![endif]-->
        <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
        <!-- Google Font -->
        <link rel="stylesheet"
              href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700,300italic,400italic,600italic">
        <!-- CSS -->
        <link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.0.2/css/bootstrap.min.css">
        <link rel="stylesheet" href="../client/mgVideoChat/mgVideoChat-1.15.0.css">
        <script src="../../bower_components/datatables.net/js/jquery.dataTables.min.js"></script>
        <script src="../../bower_components/datatables.net-bs/js/dataTables.bootstrap.min.js"></script>
        <link rel="stylesheet" href="../../bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css">

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
                            <!-- Messages: style can be found in dropdown.less-->

                            <!-- User Account Menu -->
                            <li class="dropdown user user-menu">
                                <!-- Menu Toggle Button -->
                                <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                                    <!-- The user image in the navbar-->
                                    <img src="../dist/img/user2-160x160.jpg" class="user-image" alt="User Image">
                                    <!-- hidden-xs hides the username on small devices so only the image appears. -->
                                    <span class="hidden-xs"><?php
                                        $login_user = $_SESSION['login_user'];
                                        echo $login_user;
                                        ?>   </span>
                                </a>
                                <ul class="dropdown-menu">
                                    <!-- The user image in the menu -->
                                    <li class="user-header">


                                    </li>
                                    <!-- Menu Body -->
                                    <li class="user-body">
                                        <div class="row">
                                            <div class="col-xs-4 text-center">

                                            </div>
                                            <div class="col-xs-4 text-center">

                                            </div>
                                            <div class="col-xs-4 text-center">

                                            </div>
                                        </div>
                                        <!-- /.row -->
                                    </li>
                                    <!-- Menu Footer-->
                                    <li class="user-footer">
                                        <div class="pull-left">

                                        </div>
                                        <div class="pull-right">
                                            <a href="login.php" class="btn btn-default btn-flat">Sign out</a>
                                        </div>
                                    </li>
                                </ul>
                            </li>

                        </ul>
                    </div>
                </nav>
            </header>
            <!-- Left side column. contains the logo and sidebar -->


            <?php include 'sidebar.php'; ?>
            <!-- Content Wrapper. Contains page content -->
            <div class="content-wrapper">
                <!-- Content Header (Page header) -->
                <section class="content-header">
                    <h1>Patient detail</h1>
                    <ol class="breadcrumb">
                        <li><a href="index.php"><i class="fa fa-dashboard"></i> Home</a></li>
                        <li class="active">Dashboard</li>
                    </ol>
                </section>

                <!-- Main content -->
                <section class="content container-fluid">
                    <?php
                    include 'config.php';
                    error_reporting(-1);
                    $id = $_GET['id'];
                    $sql = "select * from registration where usertype='patient' and id=$id";
                    $result = $link->query($sql);

                    if ($result->num_rows > 0) {
                        $row = $result->fetch_assoc();
                        ?>
                        <div class="box">
                            <div class="box-header">
                                <h3 class="box-title">Patient Details<br> <br>User ID: <?php echo $row['id'] ?> &nbsp;&nbsp;&nbsp; Name: <?php echo $row['username'] ?> &nbsp;&nbsp;&nbsp;Age:<?php echo $row['age'] ?>&nbsp;&nbsp;&nbsp; Sex: <?php echo $row['sex'] ?>  &nbsp;&nbsp;&nbsp;Triage Score: <?php echo $row['username'] ?> &nbsp;&nbsp;&nbsp;</h3>
                            </div>
                            <!-- /.box-header -->
                            <div class="box-body no-padding">
                                <table class="table table-striped">
                                    <tbody><tr>
                                            <th style="width: 100px">Family History</th>
                                            <td><?php echo $row['familyHistory'] ?></td>
                                        </tr>
                                        <tr>
                                            <th>Medications</th>
                                            <td><?php echo $row['medications'] ?></td>
                                        </tr>
                                        <tr>
                                            <th>Vaccinations</th>
                                            <td><?php echo $row['vaccinations'] ?></td>
                                        </tr> 
                                        <?php
                                    } else {
                                        echo "No User Available with Requested ID";
                                    }
                                    ?>
                                </tbody></table>

                        </div>

                        <!-- /.box-body -->
                    </div>


                    <div class="row">
                        <div class="col-md-12">
                            <div class="box" style="top: 15px;">
                                <div class="box-header with-border">
                                    <h3 class="box-title">Body Temperature</h3>

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
                                <div class="box-body" style="">
                                    <div class="row">
                                        <div class="col-md-12">
                                            <div class="box-body">
                                                <table class="table table-striped" style="width: 500px;">
                                                    <tbody>

                                                    <th>Body Temperature</th>
                                                    <th>Date</th>
                                                    <?php
                                                    $sql = "select * from BodyTemperature where UserId=$id LIMIT 10";
                                                    $result = $link->query($sql);
                                                    while ($row = $result->fetch_assoc()) {
                                                        if ($result->num_rows > 0) {
                                                            ?>
                                                            <tr>

                                                                <td style="width: 80px;">
                                                                    <?php echo $row[CurrentBodyTemperature]; ?></td>
                                                                <td style="width: 80px;"><?php
                                                                    $rawtimestamp = $row[TimeStamp];
                                                                    $rawtimestamp = explode(" ", $rawtimestamp);
                                                                    $year = $rawtimestamp[0];
                                                                    $month = $rawtimestamp[1];
                                                                    $day = $rawtimestamp[2];
                                                                    $hour = $rawtimestamp[3];
                                                                    $minute = $rawtimestamp[3];
                                                                    $time = $year . '-' . $month . '-' . $day . ' ' . $hour . ':' . $minute;
                                                                    echo $time;
                                                                    ?></td>
                                                            </tr>

                                                            <?php
                                                        }
                                                    }
                                                    ?>
                                                    </tbody></table>


                                            </div> 
                                        </div>                                            
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div class="row">
                        <div class="col-md-12">
                            <div class="box" style="top: 15px;">
                                <div class="box-header with-border">
                                    <h3 class="box-title">Blood Oxygen Level</h3>

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
                                <div class="box-body" style="">
                                    <div class="row">
                                        <div class="col-md-12">
                                            <div class="box-body">
                                                <table class="table table-striped" style="width: 500px;">
                                                    <tbody>

                                                    <th>Blood Oxygen Level</th>
                                                    <th>Date</th>
                                                    <?php
                                                    $sql = "select * from BloodOxygenLevel where UserId=$id LIMIT 10";
                                                    $result = $link->query($sql);
                                                    while ($row = $result->fetch_assoc()) {
                                                        if ($result->num_rows > 0) {
                                                            ?>
                                                            <tr>

                                                                <td style="width: 80px;">
                                                                    <?php echo $row[CurrentBloodOxygenLevel]; ?></td>
                                                                <td style="width: 80px;"><?php
                                                                    $rawtimestamp = $row[TimeStamp];
                                                                    $rawtimestamp = explode(" ", $rawtimestamp);
                                                                    $year = $rawtimestamp[0];
                                                                    $month = $rawtimestamp[1];
                                                                    $day = $rawtimestamp[2];
                                                                    $hour = $rawtimestamp[3];
                                                                    $minute = $rawtimestamp[3];
                                                                    $time = $year . '-' . $month . '-' . $day . ' ' . $hour . ':' . $minute;
                                                                    echo $time;
                                                                    ?></td>
                                                            </tr>

                                                            <?php
                                                        }
                                                    }
                                                    ?>
                                                    </tbody></table>


                                            </div> 
                                        </div>                                            
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-12">
                            <div class="box" style="top: 15px;">
                                <div class="box-header with-border">
                                    <h3 class="box-title">Pulse Rate</h3>

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
                                <div class="box-body" style="">
                                    <div class="row">
                                        <div class="col-md-12">
                                            <div class="box-body">
                                                <table class="table table-striped" style="width: 500px;">
                                                    <tbody>

                                                    <th>Pulse Rate</th>
                                                    <th>Date</th>
                                                    <?php
                                                    $sql = "select * from HeartRate where UserId=$id LIMIT 10";
                                                    $result = $link->query($sql);
                                                    while ($row = $result->fetch_assoc()) {
                                                        if ($result->num_rows > 0) {
                                                            ?>
                                                            <tr>

                                                                <td style="width: 80px;">
                                                                    <?php echo $row[CurrentHeartRate]; ?></td>
                                                                <td style="width: 80px;"><?php
                                                                    $rawtimestamp = $row[TimeStamp];
                                                                    $rawtimestamp = explode(" ", $rawtimestamp);
                                                                    $year = $rawtimestamp[0];
                                                                    $month = $rawtimestamp[1];
                                                                    $day = $rawtimestamp[2];
                                                                    $hour = $rawtimestamp[3];
                                                                    $minute = $rawtimestamp[3];
                                                                    $time = $year . '-' . $month . '-' . $day . ' ' . $hour . ':' . $minute;
                                                                    echo $time;
                                                                    ?></td>
                                                            </tr>

                                                            <?php
                                                        }
                                                    }
                                                    ?>
                                                    </tbody></table>


                                            </div> 
                                        </div>                                            
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-12">
                            <div class="box" style="top: 15px;">
                                <div class="box-header with-border">
                                    <h3 class="box-title">Blood Pressure Level</h3>

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
                                <div class="box-body" style="">
                                    <div class="row">
                                        <div class="col-md-12">
                                            <div class="box-body">
                                                <table class="table table-striped" style="width: 500px;">
                                                    <tbody>

                                                    <th>Blood Pressure Level</th>
                                                    <th>Date</th>
                                                    <?php
                                                    $sql = "select * from BloodPressureLevel where UserId=$id LIMIT 10";
                                                    $result = $link->query($sql);
                                                    while ($row = $result->fetch_assoc()) {
                                                        if ($result->num_rows > 0) {
                                                            ?>
                                                            <tr>
                                                                <td style="width: 80px;">
                                                                    <?php echo $row[CurrentBloodPressureLevel]; ?></td>
                                                                <td style="width: 80px;"><?php
                                                                    $rawtimestamp = $row[TimeStamp];
                                                                    $rawtimestamp = explode(" ", $rawtimestamp);
                                                                    $year = $rawtimestamp[0];
                                                                    $month = $rawtimestamp[1];
                                                                    $day = $rawtimestamp[2];
                                                                    $hour = $rawtimestamp[3];
                                                                    $minute = $rawtimestamp[3];
                                                                    $time = $year . '-' . $month . '-' . $day . ' ' . $hour . ':' . $minute;
                                                                    echo $time;
                                                                    ?></td>
                                                            </tr>

                                                            <?php
                                                        }
                                                    }
                                                    ?>
                                                    </tbody></table>


                                            </div> 
                                        </div>                                            
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>





            </div>




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

    <!-- Bootstrap 3.3.7 -->
    <script src="../bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
    <!-- AdminLTE App -->
    <script src="../dist/js/adminlte.min.js"></script>

    <!-- Optionally, you can add Slimscroll and FastClick plugins.
         Both of these plugins are recommended to enhance the
         user experience. -->
</body>
</html>