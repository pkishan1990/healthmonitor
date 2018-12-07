<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>E-Triage Patient Health Monitoring using Telepresence| Log in</title>

        <!-- Tell the browser to be responsive to screen width -->
        <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
        <!-- Bootstrap 3.3.7 -->
        <link rel="stylesheet" href="./bower_components/bootstrap/dist/css/bootstrap.min.css">
        <!-- Font Awesome -->
        <link rel="stylesheet" href="./bower_components/font-awesome/css/font-awesome.min.css">
        <!-- Ionicons -->
        <link rel="stylesheet" href="./bower_components/Ionicons/css/ionicons.min.css">
        <!-- Theme style -->
        <link rel="stylesheet" href="./dist/css/AdminLTE.min.css">
        <!-- iCheck -->
        <link rel="stylesheet" href="./plugins/iCheck/square/blue.css">
        <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
        <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
        <!--[if lt IE 9]>
        <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
        <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
        <![endif]-->

        <!-- Google Font -->
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700,300italic,400italic,600italic">
    </head>
    <body class="hold-transition login-page">
        <div class="login-box">
            <div class="login-logo" style="width: 450px">
                <a href="./index2.html">E-Triage Patient Health Monitoring using Telepresence</a>
            </div>
            <!-- /.login-logo -->
            <div class="login-box-body">
                <p class="login-box-msg">Sign in to start your session</p>

                <form action="./login.php" method="post" name="login">
                    <div class="form-group has-feedback">
                        <input type="text" class="form-control" placeholder="User Name" name="username">
                        <span class="glyphicon glyphicon-envelope form-control-feedback"></span>
                    </div>
                    <div class="form-group has-feedback">
                        <input type="password" class="form-control" placeholder="Password" name="password">
                        <span class="glyphicon glyphicon-lock form-control-feedback"></span>
                    </div>
                    <div class="form-group">
                        <label>Login As</label>
                        <select name="usertype" multiple="" class="form-control">
                            <option value="patient" selected="selected">Patient</option>
                            <option value="practitioner">General Practitioner</option>
                            <option value="specialist">Specialist</option>
                            <option value="emergency">Emergency Department</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="col-xs-8">
                            <div class="checkbox icheck">
                                <label>
                                    <input type="checkbox"> Remember Me
                                </label>
                            </div>
                        </div>
                        <!-- /.col -->
                        <div class="col-xs-4">
                            <button type="submit" class="btn btn-primary btn-block btn-flat">Sign In</button>
                        </div>
                        <!-- /.col -->
                    </div>
                </form>

                <?php
                if ($_SERVER["REQUEST_METHOD"] == "POST") {
                    session_start();
                    include './config.php';

                    $myusername = mysqli_real_escape_string($link, $_POST['username']);
                    $mypassword = mysqli_real_escape_string($link, $_POST['password']);
                    $usertype = $_POST['usertype'];

                    // If result matched $myusername and $mypassword, table row must be 1 row
                    if ($usertype == 'patient') {
                        $sql = "SELECT * FROM registration WHERE username = '$myusername' and password = '$mypassword' and  usertype='patient'";
                        $rows = mysqli_query($link, $sql);
                        $count = mysqli_num_rows($rows);
                        $row = $rows->fetch_assoc();
                        if ($count == 1) {
                            $_SESSION['login_user'] = $myusername;
                            $id = $row['id'];
                            $sql = "update registration set userlive=1 where username='$myusername'";
                            $link->query($sql);
                            $redirectTo = "/index.php?userid=".$id. ' ';
                            header("Location: ".$redirectTo);
                            
                        }
                    } else if ($usertype == 'practitioner') {
                        header("location: practitioner/index.php");
                    } else if ($usertype == 'specialist') {
                        header("location: specialist/index.php");
                    } else if ($usertype == 'emergency') {
                        header("location: emergency/index.php");
                    }
                    if ($count == 0) {
                        echo "<script type=\"text/javascript\">" .
                        "alert('Your Login Name or Password is invalid.');" .
                        "</script>";
                    }
                    echo $count;
                }
                ?>
                <!-- <a href="#">I forgot my password</a><br> -->
                <a href="register.php" class="text-center">Register a new Patient</a>

            </div>
            <!-- /.login-box-body -->
        </div>
        <!-- /.login-box -->

        <!-- jQuery 3 -->
        <script src="./bower_components/jquery/dist/jquery.min.js"></script>
        <!-- Bootstrap 3.3.7 -->
        <script src="./bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
        <!-- iCheck -->
        <script src="./plugins/iCheck/icheck.min.js"></script>
        <script>
            $(function () {
                $('input').iCheck({
                    checkboxClass: 'icheckbox_square-blue',
                    radioClass: 'iradio_square-blue',
                    increaseArea: '20%' /* optional */
                });
            });
        </script>
    </body>
</html>