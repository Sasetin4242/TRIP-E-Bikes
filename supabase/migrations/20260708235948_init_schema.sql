-- PostgreSQL Database Schema for TRIP E-Bikes App
-- Translated from MySQL

-- Helper trigger function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- Types (Enums)
-- --------------------------------------------------------
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE quotation_status AS ENUM ('pending', 'prepared', 'sent', 'accepted', 'expired', 'declined');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE blog_post_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE chat_session_status AS ENUM ('active', 'closed');
CREATE TYPE sender_type AS ENUM ('user', 'agent', 'bot');
CREATE TYPE transaction_type AS ENUM ('earn', 'redeem', 'adjust');

-- --------------------------------------------------------
-- 1. products_cms
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS products_cms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2) NULL,
  image_url VARCHAR(255) NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'E-Bike',
  stock INT NOT NULL DEFAULT 0,
  specs JSONB NULL,
  status product_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_status ON products_cms(status);
CREATE INDEX idx_products_category ON products_cms(category);

CREATE TRIGGER update_products_cms_updated_at
    BEFORE UPDATE ON products_cms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- 2. product_reviews
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL,
  reviewer_name VARCHAR(100) NOT NULL,
  reviewer_email VARCHAR(255) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  status review_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products_cms(id) ON DELETE CASCADE
);

CREATE INDEX idx_reviews_product_status ON product_reviews(product_id, status);

CREATE TRIGGER update_product_reviews_updated_at
    BEFORE UPDATE ON product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- 3. quotations
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NULL,
  product_id INT NULL,
  notes TEXT NULL,
  custom_specs JSONB NULL,
  quoted_price DECIMAL(10, 2) NULL,
  status quotation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quotations_product FOREIGN KEY (product_id) REFERENCES products_cms(id) ON DELETE SET NULL
);

CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_email ON quotations(customer_email);

CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- 4. service_appointments
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_appointments (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  notes TEXT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_date ON service_appointments(appointment_date);
CREATE INDEX idx_appointments_status ON service_appointments(status);
CREATE INDEX idx_appointments_email ON service_appointments(customer_email);

CREATE TRIGGER update_service_appointments_updated_at
    BEFORE UPDATE ON service_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- 5. contact_messages
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  subject VARCHAR(255) NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contact_is_read ON contact_messages(is_read);
CREATE INDEX idx_contact_email ON contact_messages(email);

-- --------------------------------------------------------
-- 6. blog_posts
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT NULL,
  author_name VARCHAR(100) NOT NULL,
  featured_image_url VARCHAR(255) NULL,
  status blog_post_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ NULL DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blog_status_published ON blog_posts(status, published_at);

CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- 7. chat_sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_name VARCHAR(100) NULL,
  user_email VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  status chat_session_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- 8. chat_messages
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  sender sender_type NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- --------------------------------------------------------
-- 9. system_settings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------
-- 10. loyalty_points
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_points (
  id SERIAL PRIMARY KEY,
  customer_email VARCHAR(255) NOT NULL UNIQUE,
  points_balance INT NOT NULL DEFAULT 0,
  last_transaction_type transaction_type NULL,
  last_transaction_amount INT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_email ON loyalty_points(customer_email);

CREATE TRIGGER update_loyalty_points_updated_at
    BEFORE UPDATE ON loyalty_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
