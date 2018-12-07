<?php
//check for new cases
error_reporting();
include '../config.php';


if ($_REQUEST['new'] && $_REQUEST['emergency']) {
    $sql = 'select * from cases where casetype="new" and notifier=4';
    $result = $link->query($sql);
} else if ($_REQUEST['old'] && $_REQUEST['emergency']) {
    $sql = 'select * from cases where casetype="old" and notifier=4';
    $result = $link->query($sql);
}
if ($_REQUEST['new'] && $_REQUEST['practitioner']) {
    $sql = 'select * from cases where casetype="new" and notifier=2 and TriageScore<>"Non Urgent"';
    $result = $link->query($sql);
} else if ($_REQUEST['old'] && $_REQUEST['practitioner']) {
    $sql = 'select * from cases where casetype="old" and notifier=2';
    $result = $link->query($sql);
} else if ($_REQUEST['nonurgent'] && $_REQUEST['practitioner']) {
    $sql = 'select * from cases where casetype="new" and notifier=2 and TriageScore="Non Urgent"';
    $result = $link->query($sql);
} else if ($_REQUEST['new'] && $_REQUEST['specialist']) {
    $sql = 'select * from cases where casetype="new" and notifier=3';
    $result = $link->query($sql);
}
?>


<script>
    function casesolved(id) {
        jQuery.ajax({
            url: 'newcases.php',
            method: 'POST',
            data: {
                casesolved: id
            },
            success: function (data) {
                alert("Case Resolved");
            }
        });
    }
</script>
<script>
    function uncasesolved(id) {
        jQuery.ajax({
            url: 'newcases.php',
            method: 'POST',
            data: {
                uncasesolved: id
            },
            success: function (data) {
                alert("Case Unsolved");
            }
        });
    }
</script>

<script>
    function specialist(id) {
        /**/
        if (confirm("Are you sure reffering case to specialist?") == true) {
            jQuery.ajax({
                url: 'newcases.php',
                method: 'POST',
                data: {
                    specialist: id
                },
                success: function (data) {
                    alert("Case Reffered to Specialist");
                }
            });
            alert(id);
        }
    }
</script>


<table class="table table-striped">
    <tbody><tr>
            <th style="width: 10px">Case ID#</th>
            <th style="width: 40px">User Name</th>
            <th style="width: 40px">Triage Score</th>
            <th style="width: 10px">Body Temperature</th>
            <th style="width: 40px">Heart Rate</th>
            <th style="width: 40px">Blood Pressure</th>
            <th style="width: 40px">Blood Oxygen</th>
            <th style="width: 40px">Comments</th>
            <th style="width: 40px">More Details</th>
            <th style="width: 40px">Refer Case To</th>
            <th style="width: 40px">Case Resolved</th>
        </tr>
        <?php
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                ?>
                <tr>
                    <td><?php echo $row['id']; ?></td>
                    <td><?php
                        $id = $row['userid'];
                        $sql = 'select username from registration where id=' . $id;
                        $usernameresult = $link->query($sql);
                        $userrow = $usernameresult->fetch_assoc();
                        echo $userrow['username'];
                        ?></td>
                    <td><?php echo $row['TriageScore']; ?></td>
                    <td><?php
                        if ($row['temperature'] != 0) {
                            echo $row['temperature'];
                        } else {
                            echo "No Data Available";
                        }
                        ?></td>
                    <td><?php
                        if ($row['heartrate'] != 0) {
                            echo $row['heartrate'];
                        } else {
                            echo "No Data Available";
                        }
                        ?></td>
                    <td><?php
                        if ($row['bloodpressure'] != 0) {
                            echo $row['bloodpressure'];
                        } else {
                            echo "No Data Available";
                        }
                        ?></td>
                    <td><?php
                        if ($row['bloodoxygen'] != 0) {
                            echo $row['bloodoxygen'];
                        } else {
                            echo "No Data Available";
                        }
                        ?></td>
                    <td><?php
                        $comments = $row['Comments'];
                        $comments = implode(',', array_unique(explode(',', $comments)));
                        //echo $str;
                        echo $comments;
                        ?></td>
                    <td><a href='../userdetails.php?id=<?php echo $id; ?>' target="_new">Patient Details</a></td>

                    <td>
                        <a href='javascript:;' onclick='specialist(<?php echo $row['id']; ?>);'><?php echo 'Specialist'; ?></a> 
                    </td>
                    <td>
                        <?php if ($_REQUEST['new']) {
                            ?> 
                            <a href='javascript:;' onclick='casesolved(<?php echo $row['id']; ?>);'><?php echo 'Resolved'; ?></a> 
                            <?php
                        } else if ($_REQUEST['old']) {
                            ?> 
                            <a href='javascript:;' onclick='uncasesolved(<?php echo $row['id']; ?>);'><?php echo 'Unresolved'; ?></a> 
                            <?php
                        }
                        ?>
                    </td>
                </tr>
                <?php
            }
        }
        ?>        
</table>
<?php
if ($_REQUEST['casesolved']) {
    $id = $_REQUEST['casesolved'];
    $sql = "update cases set casetype='old' where id=$id";
    $link->query($sql);
}

if ($_REQUEST['uncasesolved']) {
    $id = $_REQUEST['uncasesolved'];
    $sql = "update cases set casetype='new' where id=$id";
    $link->query($sql);
}



?>
