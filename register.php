<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['username']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_fields']);
    exit;
}

$username = trim($data['username']);
$password = $data['password'];

if (strlen($username) < 2 || strlen($password) < 4) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_input']);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $defaultSkins = 'X,●,♠,★,ᛉ,⚙,67,⚽,💣';
    $defaultEquipped = json_encode(['type' => 'X', 'color' => 'hsl(0,100%,50%)']);
    $stmt = $pdo->prepare("INSERT INTO users (username, pass_hash, unlocked_skins, equipped_skin) VALUES (?, ?, ?, ?)");
    $stmt->execute([$username, $hash, $defaultSkins, $defaultEquipped]);
    echo json_encode(['ok' => true, 'username' => $username]);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        http_response_code(400);
        echo json_encode(['error' => 'user_exists']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'db_error']);
    }
}
