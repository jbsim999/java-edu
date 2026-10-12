ALTER TABLE orders ADD COLUMN request_key VARCHAR(80);
ALTER TABLE orders ADD CONSTRAINT uq_order_request UNIQUE (request_key);
