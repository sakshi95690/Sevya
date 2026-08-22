-- ==============================================================================
-- SEVYA DATABASE SECURITY AUDIT MIGRATION: ENABLE ROW-LEVEL SECURITY (RLS)
-- Resolves: rls_disabled_in_public (Supabase Security Advisor)
-- ==============================================================================
-- Architecture Note:
-- SEVYA operates with a server-side Node.js + Drizzle backend connecting via DATABASE_URL
-- as the privileged postgres/service_role connection.
-- Enabling RLS on public schema tables blocks unauthorized public/anonymous REST access
-- through Supabase PostgREST (anon key) while preserving 100% functionality for
-- SEVYA's server-side queries, background schedulers, OTP, and tenant isolation.
-- ==============================================================================

-- 1. DYNAMIC RLS ENFORCEMENT ON ALL PUBLIC SCHEMA TABLES
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- 2. EXPLICIT RLS ENFORCEMENT ON ALL 44 SEVYA CORE TABLES
ALTER TABLE IF EXISTS public.temples ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recurring_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sevas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seva_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.temple_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteer_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.volunteer_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.secretaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.secretary_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integration_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.donations ENABLE ROW LEVEL SECURITY;

-- 3. REVOKE UNRESTRICTED PERMISSIONS FROM PUBLIC/ANON ROLES VIA POSTGREST
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    END IF;
END $$;

-- 4. GRANT EXPLICIT ACCESS TO SERVICE_ROLE (SUPABASE INTERNAL BACKEND / SERVER-SIDE SDK)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
    END IF;
END $$;
