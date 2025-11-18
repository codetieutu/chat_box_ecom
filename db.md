CREATE TABLE IF NOT EXISTS users (
  id varchar(20) PRIMARY KEY,
  is_bot BOOLEAN DEFAULT 0,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  username VARCHAR(100) DEFAULT "no_username",
  language_code VARCHAR(10),
  balance DECIMAL(15,2) DEFAULT 0,
  is_admin BOOLEAN DEFAULT 0,
  is_block BOOLEAN DEFAULT 0,
  transaction INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  quantity INT DEFAULT 0,
  price DECIMAL(15,2) DEFAULT 0,
  type ENUM('available', 'preorder') DEFAULT 'available'
);


CREATE TABLE IF NOT EXISTS stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  info TEXT,
  is_sold BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  user_id VARCHAR(25) NULL,                          
  product_id INT NOT NULL,
  variant_id INT NULL,
  
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  note TEXT,
  seller_note TEXT,
  receiver_name VARCHAR(255) NULL,
  product_name VARCHAR(255) NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);


CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tx_hash VARCHAR(100) NOT NULL UNIQUE,
    from_address VARCHAR(100) NOT NULL,
    to_address VARCHAR(100) NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    coin VARCHAR(10) NOT NULL,
    time DATETIME NOT NULL,
    network VARCHAR(50) DEFAULT 'BNB Smart Chain',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Giữ nguyên bảng products cho thông tin chung
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('available', 'preorder') DEFAULT 'available'
);

-- Tạo bảng variants cho các biến thể
CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  variant_name VARCHAR(100) NOT NULL, 
  quantity INT DEFAULT 0,
  price DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
