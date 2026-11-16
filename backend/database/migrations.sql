CREATE DATABASE IF NOT EXISTS personal_libraries CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
use personal_libraries;

CREATE TABLE IF NOT EXISTS users (
  id_user INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id_user),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS books (
  id_book INT UNSIGNED NOT NULL AUTO_INCREMENT,
  openlibrary_work_id VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(500) NOT NULL,
  authors JSON NOT NULL COMMENT 'Objects array {id, name}; name could be null',
  description MEDIUMTEXT NULL,
  cover_url VARCHAR(2048) NULL,
  PRIMARY KEY (id_book),
  UNIQUE KEY uq_books_work (openlibrary_work_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_library (
  id_user INT UNSIGNED NOT NULL,
  id_book INT UNSIGNED NOT NULL,
  reading_status ENUM('to_read', 'reading', 'read')
    NOT NULL DEFAULT 'to_read',
  added_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id_user, id_book),

  KEY ix_user_library_book (id_book),
  KEY ix_user_library_filter (id_user, reading_status, added_at),

  CONSTRAINT fk_user_library_user
    FOREIGN KEY (id_user)
    REFERENCES users(id_user)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,

  CONSTRAINT fk_user_library_book
    FOREIGN KEY (id_book)
    REFERENCES books(id_book)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
) ENGINE=InnoDB;

show tables;

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128)
    CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  data JSON NOT NULL,
  expires_at DATETIME(3) NOT NULL,

  PRIMARY KEY (session_id),
  KEY ix_sessions_expires_at (expires_at)
) ENGINE=InnoDB;
