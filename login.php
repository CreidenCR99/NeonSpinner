<?php
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
if(!$data || empty($data['username']) || empty($data['password'])){
    http_response_code(400);
    echo json_encode(['error' => 'missing_fields']);
    exit;
}

$username = trim($data['username']);
$password = $data['password'];

$stmt = $pdo->prepare("SELECT id, username, pass_hash FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if(!$user || !password_verify($password, $user['pass_hash'])){
    http_response_code(401);
    echo json_encode(['error' => 'invalid_credentials']);
    exit;
}

$_SESSION['user_id'] = $user['id'];
$_SESSION['username'] = $user['username'];

echo json_encode(['ok' => true, 'username' => $user['username']]);
