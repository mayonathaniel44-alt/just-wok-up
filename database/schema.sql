
CREATE TABLE menu_categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT REFERENCES menu_categories(id),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE restaurant_tables (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_number VARCHAR(30) NOT NULL UNIQUE,
    qr_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    table_id BIGINT REFERENCES restaurant_tables(id),
    order_type VARCHAR(20) NOT NULL DEFAULT 'dine_in'
        CHECK (order_type IN ('dine_in', 'takeout')),
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (order_status IN (
            'pending', 'confirmed', 'preparing',
            'ready', 'served', 'cancelled'
        )),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN (
            'unpaid', 'partially_paid', 'paid', 'refunded'
        )),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0
        CHECK (subtotal >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(150) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    item_notes TEXT,
    line_total NUMERIC(10, 2)
        GENERATED ALWAYS AS (unit_price * quantity) STORED
);

CREATE TABLE payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL
        CHECK (payment_method IN (
            'cash', 'card', 'ewallet', 'other'
        )),
    payment_reference VARCHAR(100),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category
    ON menu_items(category_id);

CREATE INDEX idx_orders_status_created
    ON orders(order_status, created_at);

CREATE INDEX idx_orders_table
    ON orders(table_id);

CREATE INDEX idx_order_items_order
    ON order_items(order_id);

CREATE INDEX idx_payments_order
    ON payments(order_id);
