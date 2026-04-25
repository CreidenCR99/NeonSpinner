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
$skinType = isset($data['skin_type']) ? trim($data['skin_type']) : null;

if (!$skinType) {
    http_response_code(400);
    echo json_encode(['error' => 'no_skin_type']);
    exit;
}

try {
    // Obtener skins actuales
    $stmt = $pdo->prepare("SELECT unlocked_skins FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch();

    $currentSkins = $row ? $row['unlocked_skins'] : '';
    $skinsArray = array_map('trim', explode(',', $currentSkins));

    // Si ya la tiene, no hacer nada
    if (in_array($skinType, $skinsArray)) {
        echo json_encode(['ok' => true, 'message' => 'already_unlocked']);
        exit;
    }

    // Añadir nueva skin
    $skinsArray[] = $skinType;
    // Filtrar vacíos y duplicados por si acaso
    $skinsArray = array_unique(array_filter($skinsArray));
    $newSkinsStr = implode(',', $skinsArray);

    $upd = $pdo->prepare("UPDATE users SET unlocked_skins = ? WHERE id = ?");
    $upd->execute([$newSkinsStr, $_SESSION['user_id']]);

    echo json_encode(['ok' => true, 'unlocked' => $skinType]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_error']);
}
?>