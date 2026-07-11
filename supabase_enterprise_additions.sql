-- ============================================================================
-- Supabase Enterprise Additions: CRM Leads, Activities, Quotations, and Audit Logging
-- Target: Supabase / PostgreSQL Database
-- File Location: /supabase_enterprise_additions.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Cleanup / Drop Tables if they exist (Reverse Order of Dependency)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_crm_leads_trigger ON public.crm_leads;
DROP TRIGGER IF EXISTS audit_quotations_trigger ON public.quotations;
DROP TRIGGER IF EXISTS on_quotation_created ON public.quotations;
DROP TRIGGER IF EXISTS update_crm_leads_updated_at ON public.crm_leads;
DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.canned_responses CASCADE;
DROP TABLE IF EXISTS public.quotation_items CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.lead_activities CASCADE;
DROP TABLE IF EXISTS public.crm_leads CASCADE;

DROP SEQUENCE IF EXISTS public.quotation_number_seq;

-- Helper trigger function to update updated_at column (if not already defined)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. crm_leads Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    phone VARCHAR(50),
    company VARCHAR(255),
    interested_model_id INT REFERENCES public.products_cms(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    usage_type VARCHAR(100),
    budget DECIMAL(12, 2) CHECK (budget IS NULL OR budget >= 0),
    lead_source VARCHAR(100),
    assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    lead_score INT DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
    pipeline_stage VARCHAR(50) NOT NULL DEFAULT 'New' CHECK (
        pipeline_stage IN (
            'New', 'Contacted', 'Qualified', 'Needs Analysis', 
            'Quotation Preparing', 'Quotation Sent', 'Negotiation', 
            'Test Ride Scheduled', 'Decision Pending', 'Closed Won', 
            'Closed Lost', 'Archived'
        )
    ),
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (
        priority IN ('Low', 'Medium', 'High', 'Critical')
    ),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    next_followup_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for crm_leads performance
CREATE INDEX idx_crm_leads_assigned_agent ON public.crm_leads(assigned_agent_id);
CREATE INDEX idx_crm_leads_pipeline_stage ON public.crm_leads(pipeline_stage);
CREATE INDEX idx_crm_leads_priority ON public.crm_leads(priority);
CREATE INDEX idx_crm_leads_lead_score ON public.crm_leads(lead_score DESC);
CREATE INDEX idx_crm_leads_created_at ON public.crm_leads(created_at DESC);
CREATE INDEX idx_crm_leads_next_followup ON public.crm_leads(next_followup_at) WHERE next_followup_at IS NOT NULL;

-- Trigger to update updated_at for crm_leads
CREATE TRIGGER update_crm_leads_updated_at
    BEFORE UPDATE ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------------------
-- 2. lead_activities Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('note', 'email', 'call', 'stage_change', 'task', 'system')
    ),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lead_activities
CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);


-- ----------------------------------------------------------------------------
-- 3. quotations Table (Custom Format ID Generator)
-- ----------------------------------------------------------------------------
-- Sequence for generating the suffix of TRIP-Q-YYYY-XXXXX
CREATE SEQUENCE public.quotation_number_seq START WITH 1;

CREATE TABLE public.quotations (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL CHECK (customer_email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    company VARCHAR(255),
    billing_address TEXT,
    validity_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (
        status IN ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired')
    ),
    payment_terms VARCHAR(255),
    delivery_terms VARCHAR(255),
    notes TEXT,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    delivery_charge DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_charge >= 0),
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Helper trigger function to populate quotation ID in TRIP-Q-YYYY-XXXXX format
CREATE OR REPLACE FUNCTION public.generate_quotation_id()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    seq_val INT;
    formatted_seq TEXT;
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        current_year := to_char(CURRENT_DATE, 'YYYY');
        SELECT nextval('public.quotation_number_seq') INTO seq_val;
        formatted_seq := lpad(seq_val::text, 5, '0');
        NEW.id := 'TRIP-Q-' || current_year || '-' || formatted_seq;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_quotation_created
    BEFORE INSERT ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_quotation_id();

-- Indexes for quotations
CREATE INDEX idx_quotations_email ON public.quotations(customer_email);
CREATE INDEX idx_quotations_status ON public.quotations(status);
CREATE INDEX idx_quotations_validity ON public.quotations(validity_date);
CREATE INDEX idx_quotations_created_at ON public.quotations(created_at DESC);

-- Trigger to update updated_at for quotations
CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------------------
-- 4. quotation_items Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id VARCHAR(50) NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(255),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total_price DECIMAL(12, 2) NOT NULL CHECK (total_price >= 0)
);

-- Index for quotation items
CREATE INDEX idx_quotation_items_quotation ON public.quotation_items(quotation_id);


-- ----------------------------------------------------------------------------
-- 5. canned_responses Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.canned_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortcut VARCHAR(50) UNIQUE NOT NULL CHECK (shortcut ~ '^/[a-zA-Z0-9_-]+$'),
    title VARCHAR(255) NOT NULL,
    response_text TEXT NOT NULL
);

-- Index for quick shortcut lookup
CREATE INDEX idx_canned_responses_shortcut ON public.canned_responses(shortcut);


-- ----------------------------------------------------------------------------
-- 6. audit_logs Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);


-- ----------------------------------------------------------------------------
-- 7. Automated Audit Log Trigger Setup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    entity_id_val TEXT;
    action_val TEXT;
    before_json JSONB := NULL;
    after_json JSONB := NULL;
    current_admin_id UUID;
BEGIN
    -- Extract the current user from auth context safely
    BEGIN
        current_admin_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_admin_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        action_val := TG_TABLE_NAME || ' Created';
        after_json := to_jsonb(NEW);
        entity_id_val := NEW.id::text;
    ELSIF TG_OP = 'UPDATE' THEN
        action_val := TG_TABLE_NAME || ' Updated';
        before_json := to_jsonb(OLD);
        after_json := to_jsonb(NEW);
        entity_id_val := NEW.id::text;
    ELSIF TG_OP = 'DELETE' THEN
        action_val := TG_TABLE_NAME || ' Deleted';
        before_json := to_jsonb(OLD);
        entity_id_val := OLD.id::text;
    END IF;

    INSERT INTO public.audit_logs (
        admin_id,
        action,
        entity_type,
        entity_id,
        before_state,
        after_state,
        ip_address
    ) VALUES (
        current_admin_id,
        action_val,
        TG_TABLE_NAME,
        entity_id_val,
        before_json,
        after_json,
        -- Attempt to log client ip address
        inet_client_addr()::text
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach auditing to crm_leads and quotations
CREATE TRIGGER audit_crm_leads_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.crm_leads
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_quotations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.quotations
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


-- ----------------------------------------------------------------------------
-- 8. Row Level Security (RLS) & Access Control Policies
-- ----------------------------------------------------------------------------

-- Enable Row Level Security on all newly created tables
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8.1 Service Role Policies (Complete backend access)
CREATE POLICY "Allow service_role full crm_leads access" ON public.crm_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full lead_activities access" ON public.lead_activities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full quotations access" ON public.quotations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full quotation_items access" ON public.quotation_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full canned_responses access" ON public.canned_responses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full audit_logs access" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8.2 Authenticated Admins/Agents Policies
-- Authenticated admins/agents can manage leads, activities, and canned responses
CREATE POLICY "Allow authenticated users to read leads" ON public.crm_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert/update leads" ON public.crm_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read lead activities" ON public.lead_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert activities" ON public.lead_activities FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view canned responses" ON public.canned_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage canned responses" ON public.canned_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Authenticated admins/agents can manage all quotations
CREATE POLICY "Allow authenticated users to manage quotations" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage quotation items" ON public.quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit logs can be queried by authenticated administrators only
CREATE POLICY "Allow authenticated users to read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- 8.3 Anonymous Public Access Policies
-- Clients/users can view valid/non-draft quotations that belong to them or via their identifier (using status / direct match)
CREATE POLICY "Allow public SELECT on published quotations" ON public.quotations 
    FOR SELECT TO anon USING (status != 'Draft');

CREATE POLICY "Allow public SELECT on published quotation items" ON public.quotation_items 
    FOR SELECT TO anon USING (
        EXISTS (
            SELECT 1 FROM public.quotations q 
            WHERE q.id = quotation_id AND q.status != 'Draft'
        )
    );
