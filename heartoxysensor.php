<?php
ini_set('display_errors', 1);
$output = exec("python3 /var/www/html/heartoxysensor.py 2>&1");
echo $output;
//$values = implode(list($heartrate, $oxygenlevel) = explode(' ', $output));
?>