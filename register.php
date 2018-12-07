<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>E-Triage Patient Health Monitoring using Telepresence| Registration</title>

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
                <p class="login-box-msg">Register to start a session</p>

                <form action="./registration.php" method="post" name="registration">
                    <div class="form-group has-feedback">
                        <input type="text" class="form-control" placeholder="User Name" name="username">
                        <span class="glyphicon glyphicon-envelope form-control-feedback"></span>
                    </div>
                    <div class="form-group has-feedback">
                        <input type="password" class="form-control" placeholder="Password" name="password">
                        <span class="glyphicon glyphicon-lock form-control-feedback"></span>
                    </div>

                    <div class="form-group has-feedback">
                        <input name="age" type="number" class="form-control" min="1" max="100" placeholder="Enter Age">
                    </div>

                    <div class="form-group">
                        <select name="gender" class="form-control">
                            <option value="" disabled selected>Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <textarea name="familyhistory" class="form-control" rows="3" placeholder="Enter family history Family members have / had cancer, diabetes, heart issues, etc. Enter None Otherwise"></textarea>
                    </div>

                    <div class="form-group">
                        <textarea name="medications" class="form-control" rows="3" placeholder="Enter Medications.. What kinds of medications you are currently using, or has previously used. Example: acetaminophen, aithromycin Enter None Otherwise"></textarea>
                    </div>

                    <div class="form-group">
                        <textarea name="vaccinations" class="form-control" rows="3" placeholder="Enter Vaccinations.. If you are on any Vaccinations. Example: pneumonia shot Enter None Otherwise"></textarea>
                    </div>

                    <div class="row">
                        <div class="col-xs-8">
                            <div class="checkbox icheck">
                                <label>

                                </label>
                            </div>
                        </div>
                        <!-- /.col -->
                        <div class="col-xs-4">
                            <button type="submit" class="btn btn-primary btn-block btn-flat">Register</button>
                        </div>
                        <!-- /.col -->
                    </div>
                </form>

                <?php
                if ($_SERVER["REQUEST_METHOD"] == "POST") {
                    include 'config.php';
                    //print_r($_POST);
                    //Array ( [username] => test [password] => test [age] => 50 [gender] => Male [familyhistory]
                    // => test [medications] => test [vaccinations] => test )
                    $username = $_POST['username'];
                    $password = $_POST['password'];
                    $age = $_POST['age'];
                    $gender = $_POST['gender'];
                    $familyhistory = $_POST['familyhistory'];
                    $medications = $_POST['medications'];
                    $vaccinations = $_POST['vaccinations'];

                    $sql = "INSERT INTO registration VALUES (NULL,'$username','$password','$age','$gender','$familyhistory','$medications','$vaccinations','patient')";
                    if (mysqli_query($link, $sql)) {
                        echo "<script type=\"text/javascript\">" .
                        "alert('Registration Successfully.');" .
                        "</script>";
                    } else {
                        echo "Error: " . $sql . "<br>" . mysqli_error($link);
                    }
                    mysqli_close($link);
                }
                ?>

                <!-- <a href="#">I forgot my password</a><br> -->
                <a href="login.php" class="text-center">Login</a>

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
