-- ============================================================================
-- Supabase Schema & Additions: Combined Setup
-- Target: Supabase / PostgreSQL Database
-- File Location: /supabase_schema_additions.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BASE TYPES & ENUMS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
        CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status') THEN
        CREATE TYPE quotation_status AS ENUM ('pending', 'prepared', 'sent', 'accepted', 'expired', 'declined');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blog_post_status') THEN
        CREATE TYPE blog_post_status AS ENUM ('draft', 'published', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_session_status') THEN
        CREATE TYPE chat_session_status AS ENUM ('active', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sender_type') THEN
        CREATE TYPE sender_type AS ENUM ('user', 'agent', 'bot');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('earn', 'redeem', 'adjust');
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2. COMMON TRIGGER FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. CORE DATABASE TABLES
-- ----------------------------------------------------------------------------

-- products_cms
CREATE TABLE IF NOT EXISTS public.products_cms (
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

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products_cms(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products_cms(category);

DROP TRIGGER IF EXISTS update_products_cms_updated_at ON public.products_cms;
CREATE TRIGGER update_products_cms_updated_at
    BEFORE UPDATE ON public.products_cms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- product_reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL,
  reviewer_name VARCHAR(100) NOT NULL,
  reviewer_email VARCHAR(255) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  status review_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES public.products_cms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON public.product_reviews(product_id, status);

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
    BEFORE UPDATE ON public.product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- quotations
CREATE TABLE IF NOT EXISTS public.quotations (
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
  CONSTRAINT fk_quotations_product FOREIGN KEY (product_id) REFERENCES public.products_cms(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_email ON public.quotations(customer_email);

DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;
CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- service_appointments
CREATE TABLE IF NOT EXISTS public.service_appointments (
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

CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.service_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.service_appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_email ON public.service_appointments(customer_email);

DROP TRIGGER IF EXISTS update_service_appointments_updated_at ON public.service_appointments;
CREATE TRIGGER update_service_appointments_updated_at
    BEFORE UPDATE ON public.service_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- contact_messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  subject VARCHAR(255) NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_is_read ON public.contact_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_contact_email ON public.contact_messages(email);

-- blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
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

CREATE INDEX IF NOT EXISTS idx_blog_status_published ON public.blog_posts(status, published_at);

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- chat_sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_name VARCHAR(100) NULL,
  user_email VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  status chat_session_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions(status);

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  sender sender_type NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);

-- system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- loyalty_points
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id SERIAL PRIMARY KEY,
  customer_email VARCHAR(255) NOT NULL UNIQUE,
  points_balance INT NOT NULL DEFAULT 0,
  last_transaction_type transaction_type NULL,
  last_transaction_amount INT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loyalty_email ON public.loyalty_points(customer_email);

DROP TRIGGER IF EXISTS update_loyalty_points_updated_at ON public.loyalty_points;
CREATE TRIGGER update_loyalty_points_updated_at
    BEFORE UPDATE ON public.loyalty_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. SCHEMA ADDITIONS (CRM LEADS & NOTIFICATIONS)
-- ----------------------------------------------------------------------------

-- Create Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    company VARCHAR(255) NULL,
    use_type VARCHAR(50) NOT NULL DEFAULT 'personal',
    product_interest VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    budget VARCHAR(100) NULL,
    contact_method VARCHAR(100) NOT NULL,
    notes TEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    score INT NOT NULL DEFAULT 0,
    source VARCHAR(100) NOT NULL DEFAULT 'website',
    assigned_to VARCHAR(100) NULL,
    follow_up_date TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('lead', 'chat', 'appointment', 'contact')),
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications (read) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role and authenticated users full access to notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access') THEN
        CREATE POLICY "Allow service_role full access" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to read notifications') THEN
        CREATE POLICY "Allow authenticated users to read notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to update read status') THEN
        CREATE POLICY "Allow authenticated users to update read status" ON public.notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 5. NOTIFICATION TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger A: New Lead
CREATE OR REPLACE FUNCTION public.handle_new_lead_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.score >= 80) THEN
        INSERT INTO public.notifications (title, message, type)
        VALUES (
            '🔥 High Priority Lead',
            'A new high-score lead (' || COALESCE(NEW.name, 'Customer') || ') requested a quote for ' || 
            COALESCE(NEW.product_interest, 'E-Bike') || ' [Score: ' || NEW.score || '].',
            'lead'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_lead_created ON public.leads;
CREATE TRIGGER on_lead_created
    AFTER INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_lead_notification();

-- Trigger B: New Chat Message
CREATE OR REPLACE FUNCTION public.handle_new_chat_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.sender = 'user') THEN
        INSERT INTO public.notifications (title, message, type)
        VALUES (
            '💬 New Chat Message',
            'New message: "' || LEFT(NEW.message, 60) || (CASE WHEN length(NEW.message) > 60 THEN '...' ELSE '' END) || '"',
            'chat'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chat_message_created ON public.chat_messages;
CREATE TRIGGER on_chat_message_created
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_chat_message_notification();

-- Trigger C: New Appointment
CREATE OR REPLACE FUNCTION public.handle_new_appointment_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (title, message, type)
    VALUES (
        '📅 New Appointment Booking',
        'Service appointment scheduled by ' || COALESCE(NEW.customer_name, NEW.customer_email, 'Customer') || 
        ' on ' || COALESCE(NEW.appointment_date::text, 'scheduled date') || '.',
        'appointment'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_appointment_created ON public.service_appointments;
CREATE TRIGGER on_appointment_created
    AFTER INSERT ON public.service_appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment_notification();

-- Trigger D: New Contact Message
CREATE OR REPLACE FUNCTION public.handle_new_contact_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (title, message, type)
    VALUES (
        '✉️ New Contact Message',
        'Message from ' || COALESCE(NEW.name, 'Customer') || ': "' || 
        LEFT(COALESCE(NEW.message, ''), 60) || (CASE WHEN length(COALESCE(NEW.message, '')) > 60 THEN '...' ELSE '' END) || '"',
        'contact'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_contact_message_created ON public.contact_messages;
CREATE TRIGGER on_contact_message_created
    AFTER INSERT ON public.contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_contact_message_notification();

-- ----------------------------------------------------------------------------
-- 6. REFERRAL & LOYALTY SYSTEM ADDITIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT UNIQUE,
    referral_points INTEGER DEFAULT 0 CHECK (referral_points >= 0),
    referral_count INTEGER DEFAULT 0 CHECK (referral_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uidx ON public.profiles (referral_code) WHERE referral_code IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    code_exists BOOLEAN;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..8 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = result) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, referral_code, referral_points, referral_count)
    VALUES (
        NEW.id,
        public.generate_referral_code(),
        100,
        0
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();

CREATE OR REPLACE FUNCTION public.process_referral(
    referred_user_id UUID,
    entered_referral_code TEXT,
    points_to_referrer INT DEFAULT 500,
    points_to_referred INT DEFAULT 200
)
RETURNS BOOLEAN AS $$
DECLARE
    referrer_id UUID;
BEGIN
    SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = entered_referral_code;

    IF referrer_id IS NULL OR referrer_id = referred_user_id THEN
        RETURN FALSE;
    END IF;

    UPDATE public.profiles
    SET referral_points = referral_points + points_to_referrer,
        referral_count = referral_count + 1
    WHERE id = referrer_id;

    UPDATE public.profiles
    SET referral_points = referral_points + points_to_referred
    WHERE id = referred_user_id;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 7. STORAGE BUCKETS CONFIGURATION
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public SELECT on brand-assets bucket') THEN
        CREATE POLICY "Allow public SELECT on brand-assets bucket" ON storage.objects FOR SELECT TO public USING (bucket_id = 'brand-assets');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to INSERT objects into brand-assets') THEN
        CREATE POLICY "Allow authenticated users to INSERT objects into brand-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-assets');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to UPDATE objects in brand-assets') THEN
        CREATE POLICY "Allow authenticated users to UPDATE objects in brand-assets" ON storage.objects FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'brand-assets');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated users to DELETE objects from brand-assets') THEN
        CREATE POLICY "Allow authenticated users to DELETE objects from brand-assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand-assets');
    END IF;
END
$$;

-- Seed system settings default Webhook Signing Secret key
INSERT INTO public.system_settings (key, value, description)
VALUES ('resend_webhook_signing_secret', '', 'Resend Webhook Secret key for validation')
ON CONFLICT (key) DO NOTHING;

-- Seed system settings default Resend API Key
INSERT INTO public.system_settings (key, value, description)
VALUES ('resend_api_key', '', 'Resend API key for sending emails')
ON CONFLICT (key) DO NOTHING;

-- Seed system settings default Resend Sender Email
INSERT INTO public.system_settings (key, value, description)
VALUES ('resend_from_email', 'noreply@tripmobility.ph', 'Resend Sender/From Email address')
ON CONFLICT (key) DO NOTHING;
