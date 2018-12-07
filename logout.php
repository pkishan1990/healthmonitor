<?php
session_start();
include './config.php';
if ($link->connect_error) {
    die("Connection failed: " . $link->connect_error);
}

$loginuser = $_SESSION['login_user'];

$sql = "update registration set userlive=0 where username='$loginuser'";
$link->query($sql);
session_destroy();
header("location: login.php");
?>