CREATE TABLE orders (id VARCHAR(60) PRIMARY KEY, quantity INT NOT NULL CHECK (quantity > 0));
