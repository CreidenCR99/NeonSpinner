<?php
require_once 'db.php';
session_start();

if (empty($_SESSION['user_id'])) {
    echo "Not logged in";
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

echo "<pre>";
print_r(array_keys($user));
echo "</pre>";
?>