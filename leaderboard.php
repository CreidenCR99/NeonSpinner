<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';
 
$stmt = $pdo->query("SELECT username, recordHuida, recordDestruccion, total_play_time FROM users ORDER BY recordHuida DESC, recordDestruccion DESC, username ASC LIMIT 100");
$rows = $stmt->fetchAll();
echo json_encode($rows);
?>