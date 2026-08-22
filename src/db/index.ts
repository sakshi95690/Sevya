import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
  var _pgliteInstance: PGlite | undefined;
  var _activeDb: any;
  var _activePoolProxy: any;
}

let pgliteMutexQueue: Promise<any> = Promise.resolve();

const createPgliteWithMutex = (instance: PGlite): PGlite => {
  const origQuery = instance.query.bind(instance);
  const origExec = instance.exec.bind(instance);

  (instance as any).query = async (sqlStr: any, params?: any) => {
    const run = async () => {
      try {
        if ((instance as any).waitReady) {
          await (instance as any).waitReady;
        }
        return await origQuery(sqlStr, params);
      } catch (err: any) {
        if (err?.errno === 20 || (err?.message && (err.message.includes('ErrnoError') || err.message.includes('EBUSY')))) {
          console.warn('[Sevya PGlite] Retrying query after transient storage lock notice...');
          await new Promise((r) => setTimeout(r, 100));
          return await origQuery(sqlStr, params);
        }
        throw err;
      }
    };
    const result = pgliteMutexQueue.then(run, run);
    pgliteMutexQueue = result.catch(() => {});
    return await result;
  };

  (instance as any).exec = async (sqlStr: any) => {
    const run = async () => {
      try {
        if ((instance as any).waitReady) {
          await (instance as any).waitReady;
        }
        return await origExec(sqlStr);
      } catch (err: any) {
        if (err?.errno === 20 || (err?.message && (err.message.includes('ErrnoError') || err.message.includes('EBUSY')))) {
          console.warn('[Sevya PGlite] Retrying exec after transient storage lock notice...');
          await new Promise((r) => setTimeout(r, 100));
          return await origExec(sqlStr);
        }
        throw err;
      }
    };
    const result = pgliteMutexQueue.then(run, run);
    pgliteMutexQueue = result.catch(() => {});
    return await result;
  };

  return instance;
};

const getPgliteInstance = (): PGlite => {
  if (!global._pgliteInstance) {
    try {
      if (process.env.NODE_ENV === 'test' || process.env.TEST === '1' || process.env.VITEST) {
        global._pgliteInstance = createPgliteWithMutex(new PGlite());
      } else {
        try {
          global._pgliteInstance = createPgliteWithMutex(new PGlite('./.pgdata'));
        } catch (_diskErr) {
          console.warn('[Sevya PGlite] Notice initializing disk path, using in-memory database instance.');
          global._pgliteInstance = createPgliteWithMutex(new PGlite());
        }
      }
    } catch (_err) {
      console.warn('[Sevya PGlite] Locked or failed to open ./.pgdata, falling back to in-memory database instance.');
      global._pgliteInstance = createPgliteWithMutex(new PGlite());
    }
  }
  return global._pgliteInstance;
};

export const hasExplicitPostgresConfig = Boolean(
  (process.env.SQL_HOST && process.env.SQL_DB_NAME) ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0)
);

export const createPool = () => {
  if (!global._postgresPool) {
    const host = process.env.SQL_HOST;
    const user = process.env.SQL_USER || process.env.DATABASE_USERNAME;
    const password = process.env.SQL_PASSWORD || process.env.DATABASE_PASSWORD;
    const database = process.env.SQL_DB_NAME;

    let poolConfig: pg.PoolConfig;

    const dbUrl = (process.env.DATABASE_URL || '').replace(/^jdbc:/i, '').trim();

    // Check if host/url points to Supabase or remote server
    const isRemote = Boolean(
      (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) ||
      (host && host !== 'localhost' && host !== '127.0.0.1')
    );

    if (dbUrl) {
      // Fix Supabase direct connection vs pooler connection parameters
      // Supabase pooler (port 6543) or direct db (port 5432) requires proper keep-alive and statement timeouts
      poolConfig = {
        connectionString: dbUrl,
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: false,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        statement_timeout: 30000,
        query_timeout: 30000,
        ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
      };
    } else if (host && user && database) {
      poolConfig = {
        host,
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
        user,
        password: password || '',
        database,
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: false,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        statement_timeout: 30000,
        query_timeout: 30000,
        ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
      };
    } else {
      // In local mode without DB URL, create mock/dormant config but default to PGlite
      poolConfig = {
        host: '127.0.0.1',
        user: 'postgres',
        password: 'password',
        database: 'sevya_db',
        max: 2,
        connectionTimeoutMillis: 2000,
      };
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err: any) => {
      // Prevent idle client termination from crashing the process
      if (isConnectionError(err)) {
        console.warn('[Sevya PostgreSQL Pool] Idle connection closed or reset by remote server (safe recovery):', err.message);
      } else {
        console.error('[Sevya PostgreSQL Pool] Unexpected error on idle client:', err);
      }
    });
  }
  return global._postgresPool;
};

const pgPool = createPool();

const initializePgliteSchema = async (pglite: PGlite) => {
  if ((pglite as any).waitReady) {
    await (pglite as any).waitReady;
  }
  const statements = [
    `CREATE TABLE IF NOT EXISTS temples (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      tagline TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      contact_phone TEXT DEFAULT '',
      contact_email TEXT DEFAULT '',
      trustees_count INTEGER DEFAULT 0,
      registered_number TEXT DEFAULT '',
      logo TEXT DEFAULT '',
      banner TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      google_subject TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      alt_phone TEXT DEFAULT '',
      dob TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      address TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      role TEXT DEFAULT 'volunteer' NOT NULL,
      temple_id UUID REFERENCES temples(id) ON DELETE SET NULL,
      designation_id UUID,
      parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
      account_status TEXT DEFAULT 'ACTIVE' NOT NULL,
      auth_provider TEXT DEFAULT 'GOOGLE' NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      department_id TEXT,
      employee_id TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      emergency_contact_name TEXT DEFAULT '',
      emergency_contact_phone TEXT DEFAULT '',
      seva_points INTEGER DEFAULT 0,
      joined_date TEXT,
      password_hash TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      department_id TEXT DEFAULT '',
      lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'planning' NOT NULL,
      start_date TEXT DEFAULT '',
      target_date TEXT DEFAULT '',
      budget INTEGER DEFAULT 0,
      spent INTEGER DEFAULT 0,
      category TEXT DEFAULT '',
      archived BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS project_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS project_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT DEFAULT 'document',
      file_size INTEGER DEFAULT 0,
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS meetings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT DEFAULT '10:00',
      duration_minutes INTEGER DEFAULT 45,
      location TEXT DEFAULT '',
      description TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      organizer_id UUID REFERENCES users(id) ON DELETE SET NULL,
      department_id TEXT DEFAULT '',
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      agenda TEXT DEFAULT '',
      raw_notes TEXT DEFAULT '',
      is_zoom_meeting BOOLEAN DEFAULT false,
      zoom_meeting_id TEXT DEFAULT '',
      zoom_password TEXT DEFAULT '',
      zoom_join_url TEXT DEFAULT '',
      zoom_host_url TEXT DEFAULT '',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      temple_id UUID REFERENCES temples(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT DEFAULT '',
      description TEXT DEFAULT '',
      head_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      color TEXT DEFAULT '#f97316',
      icon_name TEXT DEFAULT 'Building',
      status TEXT DEFAULT 'ACTIVE' NOT NULL,
      active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `ALTER TABLE departments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' NOT NULL;`,
    `ALTER TABLE departments ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL;`,

    `CREATE TABLE IF NOT EXISTS meeting_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'present' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS recurring_task_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      department_id TEXT DEFAULT '',
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      frequency TEXT NOT NULL,
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      due_time TEXT DEFAULT '10:00 AM',
      next_run_at TIMESTAMP NOT NULL,
      active BOOLEAN DEFAULT true NOT NULL,
      requires_proof BOOLEAN DEFAULT false NOT NULL,
      expected_proof_type TEXT DEFAULT 'Photo',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
      recurring_template_id UUID REFERENCES recurring_task_templates(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      department_id TEXT DEFAULT '',
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      priority TEXT DEFAULT 'medium' NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      start_date TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      due_time TEXT DEFAULT '10:00 AM',
      expected_proof_type TEXT DEFAULT 'Photo',
      completed_at TIMESTAMP,
      proof_required BOOLEAN DEFAULT false NOT NULL,
      reopen_reason TEXT DEFAULT '',
      archived BOOLEAN DEFAULT false NOT NULL,
      remarks_json JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT '';`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES recurring_task_templates(id) ON DELETE SET NULL;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TEXT DEFAULT '10:00 AM';`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_proof_type TEXT DEFAULT 'Photo';`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_required BOOLEAN DEFAULT false;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reopen_reason TEXT DEFAULT '';`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remarks_json JSONB DEFAULT '[]'::jsonb;`,

    `CREATE TABLE IF NOT EXISTS task_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'ASSIGNED' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS task_proofs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      type TEXT DEFAULT 'image' NOT NULL,
      url TEXT DEFAULT '' NOT NULL,
      file_name TEXT DEFAULT '',
      note TEXT DEFAULT '',
      object_key TEXT DEFAULT '' NOT NULL,
      original_file_name TEXT DEFAULT '',
      mime_type TEXT DEFAULT 'image/jpeg',
      file_size INTEGER DEFAULT 0,
      proof_type TEXT DEFAULT 'image',
      remarks TEXT DEFAULT '',
      status TEXT DEFAULT 'SUBMITTED' NOT NULL,
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      review_comment TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS action_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      due_date TEXT DEFAULT '',
      status TEXT DEFAULT 'PENDING' NOT NULL,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_id TEXT,
      read BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID REFERENCES temples(id) ON DELETE SET NULL,
      actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      actor_user_name TEXT DEFAULT '',
      actor_user_role TEXT DEFAULT '',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      old_value JSONB,
      new_value JSONB,
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      family_id TEXT NOT NULL,
      is_revoked BOOLEAN DEFAULT false NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS seva_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID REFERENCES temples(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#f59e0b',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS sevas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'Rituals',
      department_id TEXT DEFAULT '',
      lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      frequency TEXT DEFAULT 'Daily',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      archived BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS announcements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      priority TEXT DEFAULT 'normal',
      target_audience TEXT DEFAULT 'ALL',
      target_roles JSONB DEFAULT '[]'::jsonb,
      pinned BOOLEAN DEFAULT false NOT NULL,
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      active BOOLEAN DEFAULT true NOT NULL,
      link_url TEXT DEFAULT '',
      attachment_url TEXT DEFAULT '',
      scheduled_at TIMESTAMP,
      notified BOOLEAN DEFAULT false NOT NULL,
      published BOOLEAN DEFAULT true NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'ALL';`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT '';`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS end_date TEXT DEFAULT '';`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT '';`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT '';`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;`,
    `ALTER TABLE announcements ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;`,

    `CREATE TABLE IF NOT EXISTS announcement_reads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES recurring_task_templates(id) ON DELETE SET NULL;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TEXT DEFAULT '10:00 AM';`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_proof_type TEXT DEFAULT 'Photo';`,

    `ALTER TABLE recurring_task_templates ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT '';`,
    `ALTER TABLE recurring_task_templates ADD COLUMN IF NOT EXISTS end_date TEXT DEFAULT '';`,
    `ALTER TABLE recurring_task_templates ADD COLUMN IF NOT EXISTS due_time TEXT DEFAULT '10:00 AM';`,
    `ALTER TABLE recurring_task_templates ADD COLUMN IF NOT EXISTS expected_proof_type TEXT DEFAULT 'Photo';`,

    `CREATE TABLE IF NOT EXISTS temple_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Festival & Aarti',
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      location TEXT DEFAULT 'Main Temple Courtyard',
      description TEXT DEFAULT '',
      volunteers_needed INTEGER DEFAULT 10,
      published BOOLEAN DEFAULT true NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS volunteer_opportunities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      department_id TEXT DEFAULT 'dept-1',
      dept_name TEXT DEFAULT 'General Seva',
      time TEXT DEFAULT 'Daily Shifts',
      points INTEGER DEFAULT 50,
      volunteers_needed INTEGER DEFAULT 10,
      status TEXT DEFAULT 'active' NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS volunteer_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      opportunity_id UUID NOT NULL REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'confirmed' NOT NULL,
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS designations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'ACTIVE' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS designations_temple_name_idx ON designations (temple_id, LOWER(name));`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS alt_phone TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS dob TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT DEFAULT '';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES designations(id) ON DELETE SET NULL;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id) ON DELETE SET NULL;`,
    `CREATE INDEX IF NOT EXISTS users_parent_id_idx ON users(parent_id);`,
    `CREATE INDEX IF NOT EXISTS users_temple_id_idx ON users(temple_id);`,
    `CREATE INDEX IF NOT EXISTS users_designation_id_idx ON users(designation_id);`,
    `UPDATE users SET role = 'volunteer' WHERE role = 'devotee';`,
    `UPDATE users SET role = 'facilitator' WHERE role = 'sevait';`,
    `ALTER TABLE users ALTER COLUMN role SET DEFAULT 'volunteer';`,

    `CREATE TABLE IF NOT EXISTS secretaries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      principal_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      secretary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delegated_permissions JSONB DEFAULT '[]'::jsonb NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS secretary_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      principal_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      secretary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      module TEXT DEFAULT 'general' NOT NULL,
      details TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS workflow_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_json JSONB DEFAULT '{}'::jsonb,
      idempotency_key TEXT UNIQUE,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      processed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS workflows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      trigger_event TEXT NOT NULL,
      active BOOLEAN DEFAULT true NOT NULL,
      conditions_json JSONB DEFAULT '[]'::jsonb,
      actions_json JSONB DEFAULT '[]'::jsonb,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS workflow_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
      event_id UUID REFERENCES workflow_events(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'SUCCESS' NOT NULL,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      duration_ms INTEGER DEFAULT 0,
      error_details TEXT DEFAULT '',
      execution_log_json JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS workflow_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      queue TEXT DEFAULT 'default' NOT NULL,
      job_type TEXT NOT NULL,
      payload_json JSONB DEFAULT '{}'::jsonb,
      idempotency_key TEXT UNIQUE,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      locked_at TIMESTAMP,
      last_error TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS notification_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT DEFAULT 'general' NOT NULL,
      email_enabled BOOLEAN DEFAULT true NOT NULL,
      whatsapp_enabled BOOLEAN DEFAULT true NOT NULL,
      push_enabled BOOLEAN DEFAULT true NOT NULL,
      in_app_enabled BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS notification_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      provider_response TEXT DEFAULT '',
      retry_count INTEGER DEFAULT 0,
      delivered_at TIMESTAMP,
      failed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      keys_json JSONB NOT NULL,
      user_agent TEXT DEFAULT '',
      active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS approval_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      approval_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      entity_type TEXT DEFAULT '',
      entity_id TEXT DEFAULT '',
      amount INTEGER DEFAULT 0,
      current_level INTEGER DEFAULT 1 NOT NULL,
      total_levels INTEGER DEFAULT 1 NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      metadata_json JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS approval_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
      level INTEGER DEFAULT 1 NOT NULL,
      approver_role_id TEXT DEFAULT '',
      approver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      comment TEXT DEFAULT '',
      action_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS integration_syncs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      sync_direction TEXT DEFAULT 'OUTBOUND' NOT NULL,
      status TEXT DEFAULT 'SUCCESS' NOT NULL,
      items_synced INTEGER DEFAULT 0,
      last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      error_details TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS tenant_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      connection_type TEXT DEFAULT 'oauth' NOT NULL,
      status TEXT DEFAULT 'NOT_CONNECTED' NOT NULL,
      encrypted_config TEXT DEFAULT '',
      metadata_json JSONB DEFAULT '{}'::jsonb,
      connected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS user_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      connection_type TEXT DEFAULT 'oauth' NOT NULL,
      status TEXT DEFAULT 'NOT_CONNECTED' NOT NULL,
      encrypted_config TEXT DEFAULT '',
      metadata_json JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS user_integrations_user_provider_idx ON user_integrations (user_id, provider);`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_google_meet BOOLEAN DEFAULT false;`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS google_meet_url TEXT DEFAULT '';`,
    `ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_platform TEXT DEFAULT 'standard';`,

    `CREATE TABLE IF NOT EXISTS calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      event_type TEXT DEFAULT 'meeting' NOT NULL,
      start_date TEXT NOT NULL,
      start_time TEXT DEFAULT '09:00',
      end_date TEXT NOT NULL,
      end_time TEXT DEFAULT '10:00',
      is_all_day BOOLEAN DEFAULT false NOT NULL,
      location TEXT DEFAULT '',
      department_id TEXT DEFAULT '',
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      seva_id UUID REFERENCES sevas(id) ON DELETE SET NULL,
      temple_event_id UUID REFERENCES temple_events(id) ON DELETE SET NULL,
      announcement_id UUID REFERENCES announcements(id) ON DELETE SET NULL,
      organizer_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      priority TEXT DEFAULT 'medium' NOT NULL,
      status TEXT DEFAULT 'scheduled' NOT NULL,
      attachment_url TEXT DEFAULT '',
      attachment_name TEXT DEFAULT '',
      reminder_offset INTEGER DEFAULT 15,
      recurrence TEXT DEFAULT 'none',
      recurrence_rule TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      visibility TEXT DEFAULT 'public',
      target_roles JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS calendar_event_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'participant',
      status TEXT DEFAULT 'accepted',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS feedbacks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT DEFAULT 'General' NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      response TEXT DEFAULT '',
      responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      responded_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS donations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID NOT NULL REFERENCES temples(id) ON DELETE CASCADE,
      donor_name TEXT NOT NULL,
      donor_phone TEXT DEFAULT '',
      donor_email TEXT DEFAULT '',
      amount INTEGER NOT NULL,
      category TEXT DEFAULT 'General Donation',
      payment_mode TEXT DEFAULT 'UPI',
      transaction_ref TEXT DEFAULT '',
      receipt_no TEXT NOT NULL,
      notes TEXT DEFAULT '',
      collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      temple_id UUID REFERENCES temples(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json JSONB NOT NULL,
      idempotency_key TEXT UNIQUE,
      status TEXT DEFAULT 'RECEIVED' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS email_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      attempts INTEGER DEFAULT 0 NOT NULL,
      max_attempts INTEGER DEFAULT 5 NOT NULL,
      is_used BOOLEAN DEFAULT false NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps(email);`,
    `CREATE INDEX IF NOT EXISTS email_otps_expires_at_idx ON email_otps(expires_at);`,
    `CREATE INDEX IF NOT EXISTS email_otps_is_used_idx ON email_otps(is_used);`
  ];

  for (const stmt of statements) {
    try {
      await pglite.exec(stmt);
    } catch (_err) {
      // Ignore individual statement errors to keep PGlite instance functional
    }
  }
};

export async function ensureEmailOtpsTable(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS email_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      attempts INTEGER DEFAULT 0 NOT NULL,
      max_attempts INTEGER DEFAULT 5 NOT NULL,
      is_used BOOLEAN DEFAULT false NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps(email);`,
    `CREATE INDEX IF NOT EXISTS email_otps_expires_at_idx ON email_otps(expires_at);`,
    `CREATE INDEX IF NOT EXISTS email_otps_is_used_idx ON email_otps(is_used);`
  ];

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (_err) {
      // Safe fallback if index exists or table already present
    }
  }
}

export const ALL_PUBLIC_TABLES = [
  'temples',
  'designations',
  'users',
  'projects',
  'project_members',
  'project_files',
  'meetings',
  'departments',
  'meeting_participants',
  'tasks',
  'task_assignments',
  'task_proofs',
  'action_items',
  'recurring_task_templates',
  'notifications',
  'audit_logs',
  'refresh_tokens',
  'sevas',
  'seva_categories',
  'announcements',
  'announcement_reads',
  'temple_events',
  'volunteer_opportunities',
  'volunteer_enrollments',
  'tenant_integrations',
  'user_integrations',
  'calendar_events',
  'calendar_event_participants',
  'secretaries',
  'secretary_audit_logs',
  'workflow_events',
  'workflows',
  'workflow_executions',
  'workflow_jobs',
  'notification_preferences',
  'notification_deliveries',
  'web_push_subscriptions',
  'approval_requests',
  'approval_steps',
  'integration_syncs',
  'webhook_events',
  'feedbacks',
  'email_otps',
  'donations'
] as const;

export async function enforceRowLevelSecurity(): Promise<{ securedCount: number; errors: number }> {
  let securedCount = 0;
  let errors = 0;

  // 1. Dynamic enforcement across all public tables
  try {
    await pool.query(`
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
    `);
  } catch (_dynamicErr) {
    // Fallback to table-by-table below
  }

  // 2. Explicit enforcement and permission isolation for each table
  for (const tableName of ALL_PUBLIC_TABLES) {
    try {
      await pool.query(`ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`);
      try {
        await pool.query(`REVOKE ALL ON public."${tableName}" FROM anon, authenticated;`);
      } catch (_revokeErr) {
        // Safe fallback if anon/authenticated roles are not installed in local environment
      }
      securedCount++;
    } catch (_err) {
      errors++;
    }
  }

  return { securedCount, errors };
}

export function isConnectionError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.toString() || '').toLowerCase();
  const code = err.code || '';
  const errno = err.errno || err?.cause?.errno;
  return (
    errno === 20 ||
    msg.includes('errnoerror') ||
    msg.includes('connection terminated') ||
    msg.includes('connection timeout') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('ehostunreach') ||
    msg.includes('econnreset') ||
    msg.includes('socket closed') ||
    msg.includes('connection closed') ||
    msg.includes('not queryable') ||
    msg.includes('client has already been released') ||
    msg.includes('terminating connection') ||
    msg.includes('could not connect to server') ||
    msg.includes('server closed the connection') ||
    msg.includes('unexpected error on client') ||
    msg.includes('ebusy') ||
    msg.includes('lock') ||
    code === '57P01' ||
    code === '57P02' ||
    code === '57P03' ||
    code === '08006' ||
    code === '08001' ||
    code === '08004' ||
    code === '08007' ||
    code === '08P01' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT'
  );
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  delayMs = 400
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries && isConnectionError(err)) {
        console.warn(`[Sevya DB] Transient connection error on attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${delayMs * (attempt + 1)}ms:`, err?.message || err);
        await new Promise((res) => setTimeout(res, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Start with PGlite if no explicit PostgreSQL DB is configured in env
let isPgliteActive = !hasExplicitPostgresConfig;
let pgliteInitPromise: Promise<void> | null = null;

export async function activatePgliteFallback(): Promise<void> {
  isPgliteActive = true;
  if (!pgliteInitPromise) {
    pgliteInitPromise = (async () => {
      const pglite = getPgliteInstance();
      if ((pglite as any).waitReady) {
        await (pglite as any).waitReady;
      }
      await initializePgliteSchema(pglite).catch((err) => {
        console.warn('[Sevya PGlite] Schema sync notice:', err?.message || err);
      });
      await ensureEmailOtpsTable().catch(() => {});
    })();
  }
  await pgliteInitPromise;
}

// Proxy Pool object with automatic retry for transient connection drops
export const pool: pg.Pool = new Proxy(pgPool, {
  get(target, prop, receiver) {
    if (prop === 'query') {
      return async (sqlStr: string, params?: any[]) => {
        if (isPgliteActive || !hasExplicitPostgresConfig) {
          await activatePgliteFallback();
          const res = await getPgliteInstance().query(sqlStr, params);
          return { rows: res.rows, rowCount: res.affectedRows || res.rows.length };
        }
        return await withDbRetry(async () => {
          return await pgPool.query(sqlStr, params);
        });
      };
    }
    if (prop === 'connect') {
      return async () => {
        if (isPgliteActive || !hasExplicitPostgresConfig) {
          await activatePgliteFallback();
          return {
            query: async (sqlStr: string, params?: any[]) => {
              const res = await getPgliteInstance().query(sqlStr, params);
              return { rows: res.rows, rowCount: res.affectedRows || res.rows.length };
            },
            release: () => {},
          };
        }
        return await withDbRetry(async () => {
          return await pgPool.connect();
        });
      };
    }
    return Reflect.get(target, prop, receiver);
  }
}) as any;

const pgliteDb = drizzlePglite(getPgliteInstance(), { schema });
const pgDb = drizzlePg(pool, { schema });

// Proxy DB object
export const db = new Proxy({} as any, {
  get(_target, prop) {
    const activeDriver = isPgliteActive ? pgliteDb : pgDb;
    const value = (activeDriver as any)[prop];
    return typeof value === 'function' ? value.bind(activeDriver) : value;
  }
});

export async function checkDatabaseConnection(retries = 2): Promise<boolean> {
  if (!hasExplicitPostgresConfig) {
    await activatePgliteFallback();
    return true;
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const client = await pgPool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
      isPgliteActive = false;
      await ensureEmailOtpsTable().catch(() => {});
      return true;
    } catch (error: any) {
      if (i < retries) {
        console.warn(`[Sevya DB] Supabase / PostgreSQL connect attempt ${i + 1} failed, retrying...`, error?.message || error);
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      } else {
        console.warn('[Sevya DB] Supabase / PostgreSQL connectivity check failed, switching to local PGlite engine:', error?.message || error);
        await activatePgliteFallback();
        return true;
      }
    }
  }
  await activatePgliteFallback();
  return true;
}

// Pre-warm DB check on startup without throwing
checkDatabaseConnection().catch(() => {});

process.on('SIGINT', async () => {
  if (global._postgresPool) {
    await global._postgresPool.end().catch(() => {});
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (global._postgresPool) {
    await global._postgresPool.end().catch(() => {});
  }
  process.exit(0);
});

