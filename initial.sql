-- Run this in phpMyAdmin to create table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  pass_hash VARCHAR(255) NOT NULL,
  recordHuida INT NOT NULL DEFAULT 0,
  recordDestruccion INT NOT NULL DEFAULT 0,
  total_play_time INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  has_premium BOOLEAN NOT NULL DEFAULT 0,
  unlocked_skins TEXT,
  equipped_skin TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
