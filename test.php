<?php

include './config.php';
$columns = array(
// datatable column index  => database column name
    0 => 'id',
    1 => 'username',
    2 => 'age',
);

$sql = "SELECT * FROM registration";
$res = mysqli_query($link, $sql) or die("Error: " . mysqli_error($conn));
$dataArray = array();
while ($row = mysqli_fetch_array($res)) {
    $dataArray[] = $row["id"];
    $dataArray[] = $row["username"];
    $dataArray[] = $row["age"];
}

echo json_encode($dataArray);
?>