<?php
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once 'db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'not_logged']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['skin'])) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_skin']);
    exit;
}

// Validar que sea un JSON válido o al menos un string
$skinJson = is_array($data['skin']) ? json_encode($data['skin']) : $data['skin'];

try {
    $stmt = $pdo->prepare("UPDATE users SET equipped_skin = ? WHERE id = ?");
    $stmt->execute([$skinJson, $_SESSION['user_id']]);
    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_error']);
}
?>