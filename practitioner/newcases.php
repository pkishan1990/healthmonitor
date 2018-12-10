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

<?php
include '../config.php';

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

if ($_REQUEST['specialist']) {
    $id = $_REQUEST['specialist'];
    $sql = "update cases set notifier=3 where id=$id and casetype='new'";
    $link->query($sql);
}

if ($_REQUEST['practitioner']) {
    $id = $_REQUEST['practitioner'];
    $sql = "update cases set notifier=2 where id=$id and casetype='new'";
    $link->query($sql);
}

if ($_REQUEST['emergency']) {
    $id = $_REQUEST['emergency'];
    $sql = "update cases set notifier=4 where id=$id and casetype='new'";
    $link->query($sql);
}
?>