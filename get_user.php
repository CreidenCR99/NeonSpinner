<?php
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once 'db.php';

// --- Verificar sesión ---
if (empty($_SESSION['user_id'])) {
    echo json_encode(['logged' => false]);
    exit;
}

// --- Obtener usuario de la BD ---
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    // Sesión inválida (usuario borrado?)
    session_destroy();
    echo json_encode(['logged' => false]);
    exit;
}

// --- Aplicar valores por defecto si son NULL ---
$defaultSkins = 'X,●,♠,★,ᛉ,⚙,67,⚽,💣';
$defaultEquipped = json_encode(['type' => 'X', 'color' => 'hsl(0,100%,50%)']);
$needsUpdate = false;

if ($user['unlocked_skins'] === null || trim($user['unlocked_skins']) === '') {
    $user['unlocked_skins'] = $defaultSkins;
    $needsUpdate = true;
}

if ($user['equipped_skin'] === null || trim($user['equipped_skin']) === '') {
    $user['equipped_skin'] = $defaultEquipped;
    $needsUpdate = true;
}

if ($user['recordHuida'] === null) {
    $user['recordHuida'] = 0;
    $needsUpdate = true;
}

if ($user['recordDestruccion'] === null) {
    $user['recordDestruccion'] = 0;
    $needsUpdate = true;
}

// Actualizar en la base de datos si hubo cambios
if ($needsUpdate) {
    $updateStmt = $pdo->prepare("UPDATE users SET unlocked_skins = ?, equipped_skin = ?, recordHuida = ?, recordDestruccion = ? WHERE id = ?");
    $updateStmt->execute([
        $user['unlocked_skins'],
        $user['equipped_skin'],
        $user['recordHuida'],
        $user['recordDestruccion'],
        $_SESSION['user_id']
    ]);
}

// --- Lógica de recompensas por Ranking ---
// Obtener ranking en Huida
$stmtHuida = $pdo->query("SELECT id FROM users ORDER BY recordHuida DESC LIMIT 3");
$topHuida = $stmtHuida->fetchAll(PDO::FETCH_COLUMN);

// Obtener ranking en Destrucción
$stmtDestru = $pdo->query("SELECT id FROM users ORDER BY recordDestruccion DESC LIMIT 3");
$topDestru = $stmtDestru->fetchAll(PDO::FETCH_COLUMN);

$userId = $_SESSION['user_id'];
$rankSkins = [];

// Función helper para añadir skins según posición (0=Top1, 1=Top2, 2=Top3)
function checkRankAndAward($userId, $topList, &$skins)
{
    $pos = array_search($userId, $topList);
    if ($pos !== false) {
        // Top 3 (índice 2) -> '#'
        if ($pos <= 2)
            $skins[] = '#';
        // Top 2 (índice 1) -> '⚵'
        if ($pos <= 1)
            $skins[] = '⚵';
        // Top 1 (índice 0) -> '💥'
        if ($pos === 0)
            $skins[] = '💥';
    }
}

checkRankAndAward($userId, $topHuida, $rankSkins);
checkRankAndAward($userId, $topDestru, $rankSkins);

// Combinar skins desbloqueadas normales con las de rango (sin duplicados)
$currentUnlocked = explode(',', $user['unlocked_skins']);
$finalUnlocked = array_unique(array_merge($currentUnlocked, $rankSkins));
$user['unlocked_skins'] = implode(',', $finalUnlocked);

echo json_encode(['logged' => true, 'user' => $user]);
?>