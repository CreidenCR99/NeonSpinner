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
$huida = isset($data['recordHuida']) ? (int) $data['recordHuida'] : null;
$destru = isset($data['recordDestruccion']) ? (int) $data['recordDestruccion'] : null;
$playTime = isset($data['playTime']) ? (int) $data['playTime'] : 0;

if ($huida === null && $destru === null && $playTime === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'no_values']);
    exit;
}

// Guardar,  opción: mantener mayor score
try {
    // Obtener actuales
    $row = $pdo->prepare("SELECT recordHuida, recordDestruccion, total_play_time FROM users WHERE id = ?");
    $row->execute([$_SESSION['user_id']]);
    $current = $row->fetch();

    $huidaNew = $current ? max($current['recordHuida'], $huida ?? 0) : ($huida ?? 0);
    $destruNew = $current ? max($current['recordDestruccion'], $destru ?? 0) : ($destru ?? 0);
    $playNew = $current ? ($current['total_play_time'] + $playTime) : $playTime;

    // XP Logic: 1 point = 1 XP. Add current game score to total XP.
    // We need the score from the current game session, not just the record.
    // The frontend sends 'score' which is the points achieved in this session.
    $score = isset($data['score']) ? (int) $data['score'] : 0;

    // Fetch current XP
    $xpRow = $pdo->prepare("SELECT xp FROM users WHERE id = ?");
    $xpRow->execute([$_SESSION['user_id']]);
    $currentXpData = $xpRow->fetch();
    $currentXp = $currentXpData ? (int) $currentXpData['xp'] : 0;

    $newXp = $currentXp + $score;

    $upd = $pdo->prepare("UPDATE users SET recordHuida = ?, recordDestruccion = ?, total_play_time = ?, xp = ? WHERE id = ?");
    $upd->execute([$huidaNew, $destruNew, $playNew, $newXp, $_SESSION['user_id']]);

    echo json_encode([
        'ok' => true,
        'recordHuida' => $huidaNew,
        'recordDestruccion' => $destruNew,
        'total_play_time' => $playNew,
        'xp' => $newXp
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_error']);
}
?>