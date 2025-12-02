<?php
// db.php - PDO connection
// Edit these con tus credenciales MySQL (Byethost)
define('DB_HOST', 'sql300.byetcluster.com');      // normalmente 'localhost'
define('DB_NAME', 'b31_40481562_game');
define('DB_USER', 'b31_40481562');
define('DB_PASS', 'Ra@VqE8bB3T*rNP');

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        $options
    );
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection error']);
    exit;
}
