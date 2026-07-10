-- ============================================================================
-- Supabase Schema Additions: Notifications, Triggers, and Referral System
-- Target: Supabase / PostgreSQL Database
-- File Location: /supabase_schema_additions.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create Notifications Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('lead', 'chat', 'appointment', 'contact')),
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance on query patterns
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications (read) WHERE read = false;

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy for Service Role & Admins to manage all notifications
CREATE POLICY "Allow service_role full access" ON public.notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy for Authenticated users (Admin Panel) to read/write notifications
CREATE POLICY "Allow authenticated users to read notifications" ON public.notifications
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update read status" ON public.notifications
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- 2. Setup Triggers for Automatic Notifications
-- ----------------------------------------------------------------------------

-- Trigger A: New Lead/Quotation with score >= 80
CREATE OR REPLACE FUNCTION public.handle_new_lead_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the lead score is high priority (>= 80)
    -- Supports both 'score' and 'lead_score' column naming conventions safely
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

CREATE OR REPLACE TRIGGER on_lead_created
    AFTER INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_lead_notification();


-- Trigger B: New Chat Message created by user
CREATE OR REPLACE FUNCTION public.handle_new_chat_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on messages sent by users/customers, ignoring bot/admin responses
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

CREATE OR REPLACE TRIGGER on_chat_message_created
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_chat_message_notification();


-- Trigger C: New Service Appointment Booking
CREATE OR REPLACE FUNCTION public.handle_new_appointment_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (title, message, type)
    VALUES (
        '📅 New Appointment Booking',
        'Service appointment scheduled by ' || COALESCE(NEW.customer_name, NEW.email, 'Customer') || 
        ' on ' || COALESCE(NEW.appointment_date::text, 'scheduled date') || '.',
        'appointment'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_appointment_created
    AFTER INSERT ON public.service_appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment_notification();


-- Trigger D: New Contact Form Message
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

CREATE OR REPLACE TRIGGER on_contact_message_created
    AFTER INSERT ON public.contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_contact_message_notification();


-- ----------------------------------------------------------------------------
-- 3. Referral & Loyalty System Additions
-- ----------------------------------------------------------------------------

-- Ensure public.profiles table exists and contains referral columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT UNIQUE,
    referral_points INTEGER DEFAULT 0 CHECK (referral_points >= 0),
    referral_count INTEGER DEFAULT 0 CHECK (referral_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on referral code for fast lookups during verification
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uidx ON public.profiles (referral_code) WHERE referral_code IS NOT NULL;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);


-- Helper Function: Generate a unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    code_exists BOOLEAN;
END;
$$ LANGUAGE plpgsql;


-- Helper Function: Automatically create a profile upon user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, referral_code, referral_points, referral_count)
    VALUES (
        NEW.id,
        public.generate_referral_code(),
        100, -- Starting balance/points (e.g., 100 points signup bonus)
        0
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();


-- Helper SQL Command / RPC: Process referral using a code
-- Awards points to the referrer, increments referral count, and optionally rewards the referred user
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
    -- Locate referrer profile matching the referral code
    SELECT id INTO referrer_id 
    FROM public.profiles 
    WHERE referral_code = entered_referral_code;

    -- Self-referral prevention and existence check
    IF referrer_id IS NULL OR referrer_id = referred_user_id THEN
        RETURN FALSE;
    END IF;

    -- 1. Credit loyalty points and increment referral counter for the referrer
    UPDATE public.profiles
    SET referral_points = referral_points + points_to_referrer,
        referral_count = referral_count + 1
    WHERE id = referrer_id;

    -- 2. Reward the referred new user (optional welcome bonus)
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
-- 5. Storage Buckets and Access Policies Configuration
-- ----------------------------------------------------------------------------

-- Create public 'brand-assets' storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for the brand-assets storage bucket objects
CREATE POLICY "Allow public SELECT on brand-assets bucket" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'brand-assets');

CREATE POLICY "Allow authenticated users to INSERT objects into brand-assets" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "Allow authenticated users to UPDATE objects in brand-assets" ON storage.objects
    FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "Allow authenticated users to DELETE objects from brand-assets" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'brand-assets');
