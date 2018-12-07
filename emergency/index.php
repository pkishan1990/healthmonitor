<!DOCTYPE html>
<!--
This is a starter template page. Use this page to start your new project from
scratch. This page gets rid of all links and provides the needed markup only.
-->
<html>
    <?php
    session_start();
    //ini_set('display_errors', 1);
    include '../config.php';
    ?>
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

    </head>

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
                    <h1> Dashboard  </h1>
                    <ol class="breadcrumb">
                        <li><a href="index.php"><i class="fa fa-dashboard"></i> Home</a></li>
                        <li class="active">Dashboard</li>
                    </ol>
                </section>

                <!-- Main content -->
                <section class="content container-fluid">


                    <div class="box" style="top: 15px;">
                        <div class="box-header">
                            <h3 class="box-title">Following Cases Requires Immediate Attention</h3>

                        </div>
                        <div class="box-body no-padding">
                            <div class="box-body">


                                <div class="box" style="top: 15px;">
                                    <div class="box-header">
                                        <h3 class="box-title">Patient List</h3>
                                    </div>
                                    <div class="box-body no-padding">

                                        <!-- New Case Div-->
                                        <script>
                                            setInterval(refreshData, 1000);
                                            function refreshData()
                                            {
                                                $('#newcase').load('newcases.php?new=1&emergency=1');
                                            }
                                        </script>
                                        <div id="newcase"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div class="row">
                        <div class="col-md-12">
                            <div class="box collapsed-box" style="top: 15px;">
                                <div class="box-header with-border">
                                    <h3 class="box-title">Previous Cases</h3>

                                    <div class="box-tools pull-right">
                                        <button type="button" class="btn btn-box-tool" data-widget="collapse"><i class="fa fa-plus"></i>
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
                                        <div class="col-md-12">
                                            <div class="box-body">
                                                <script>
                                                    setInterval(refreshData, 2000);
                                                    function refreshData()
                                                    {
                                                        $('#oldcase').load('newcases.php?old=1&emergency=1');
                                                    }
                                                </script>
                                                <div id="oldcase"></div> 
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
                                        <div class="col-md-12">
                                            <div class="box-body">
                                                <div id="mgVideoChat"></div>

                                                <script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
                                                <script type="text/javascript" src="//netdna.bootstrapcdn.com/bootstrap/3.0.2/js/bootstrap.min.js"></script>
                                                <!-- Video Chat -->
                                                <script src="../client/mgVideoChat/mgVideoChat-1.15.0-min.js"></script>
                                                <script src="../client/demos/common/js/menu.js"></script>
                                                <script>
                                                    $(document).ready(function () {
                                                        $('#mgVideoChat').mgVideoChat({
                                                            wsURL: wsUrlDefault + '?room=1'
                                                        });
                                                    });

                                                    //console.log(document.cookie.indexOf('mgVideoChatSimple='));
                                                    if (document.cookie.indexOf('mgVideoChatSimple') == -1) {
                                                        //var cookie = "mgVideoChatSimple=test" + Math.floor((Math.random() * 100) + 1);
                                                        var cookie = "mgVideoChatSimple=Emgergency Team;path=/";
                                                        document.cookie = cookie;
                                                    } else {
                                                        var cookie = "mgVideoChatSimple=Emgergency Team;path=/";
                                                        document.cookie = cookie;
                                                    }
                                                </script>      
                                            </div>                                            
                                        </div>
                                    </div>
                                </div>
                                <div class="box-footer">
                                    <div class="row">
                                        <div class="col-sm-3 col-xs-6">
                                            <div class="description-block border-right">
                                                <span class="description-percentage text-green"><i class="fa fa-caret-up"></i> 17%</span>
                                                <h5 class="description-header">Add More Details Here</h5>
                                                <span class="description-text">Details</span>
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

        <!-- Bootstrap 3.3.7 -->
        <script src="../bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
        <!-- AdminLTE App -->
        <script src="../dist/js/adminlte.min.js"></script>

        <!-- Optionally, you can add Slimscroll and FastClick plugins.
             Both of these plugins are recommended to enhance the
             user experience. -->
    </body>
</html>