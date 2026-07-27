import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PASSWORD_HASH = "f7e12ffb82571de69d884b74769d5be8d03e28e12ddcec13a50ed69e8e95d7ed";

async function seed() {
  const client = await pool.connect();
  try {
    // ── TxSprint company ────────────────────────────────────────────────────
    const companyRes = await client.query(`
      INSERT INTO companies (name, slug, industry, company_size, status, plan, employee_count)
      VALUES ('TxSprint Technologies', 'txsprint', 'Technology', '51-200', 'active', 'professional', 50)
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            plan = EXCLUDED.plan,
            employee_count = EXCLUDED.employee_count
      RETURNING id
    `);
    const companyId = companyRes.rows[0].id;
    console.log("Company ID:", companyId);

    // ── iHR Platform Super Admin ─────────────────────────────────────────────
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('superadmin@ihr.com', $1, 'iHR Platform Admin', 'super_admin')
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name     = EXCLUDED.full_name,
            role          = EXCLUDED.role
    `, [PASSWORD_HASH]);
    console.log("Platform super admin ready");

    // ── Org Admin account for TxSprint ──────────────────────────────────────
    // This is the shared organisation-level admin account (created at org signup)
    const orgAdminRes = await client.query(`
      INSERT INTO users (email, password_hash, full_name, role, company_id)
      VALUES ('admin@txsprint.com', $1, 'TxSprint Admin', 'admin', $2)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name     = EXCLUDED.full_name,
            role          = EXCLUDED.role,
            company_id    = EXCLUDED.company_id
      RETURNING id
    `, [PASSWORD_HASH, companyId]);
    const orgAdminId = orgAdminRes.rows[0].id;
    console.log("Org admin ID:", orgAdminId);

    await client.query(`
      INSERT INTO employees (employee_code, user_id, full_name, email, company_id, department, designation, status)
      VALUES ('EMP000', $1, 'TxSprint Admin', 'admin@txsprint.com', $2, 'Administration', 'Org Administrator', 'active')
      ON CONFLICT (employee_code) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            email   = EXCLUDED.email
    `, [orgAdminId, companyId]);

    // ── candidate1@gmail.com — Owner (personal account, admin role in TxSprint)
    const cand1Res = await client.query(`
      INSERT INTO users (email, password_hash, full_name, role, company_id)
      VALUES ('candidate1@gmail.com', $1, 'Alex Rivera', 'admin', $2)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name     = EXCLUDED.full_name,
            role          = EXCLUDED.role,
            company_id    = EXCLUDED.company_id
      RETURNING id
    `, [PASSWORD_HASH, companyId]);
    const cand1Id = cand1Res.rows[0].id;
    console.log("Owner (candidate1) ID:", cand1Id);

    await client.query(`
      INSERT INTO candidates (user_id, email, full_name)
      VALUES ($1, 'candidate1@gmail.com', 'Alex Rivera')
      ON CONFLICT (user_id) DO UPDATE
        SET email     = EXCLUDED.email,
            full_name = EXCLUDED.full_name
    `, [cand1Id]);

    await client.query(`
      INSERT INTO employees (employee_code, user_id, full_name, email, company_id, department, designation, status)
      VALUES ('EMP001', $1, 'Alex Rivera', 'candidate1@gmail.com', $2, 'Executive', 'Owner', 'active')
      ON CONFLICT (employee_code) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            email   = EXCLUDED.email,
            full_name = EXCLUDED.full_name
    `, [cand1Id, companyId]);

    // ── candidate2@gmail.com — HR Manager (personal account, hr role in TxSprint)
    const cand2Res = await client.query(`
      INSERT INTO users (email, password_hash, full_name, role, company_id)
      VALUES ('candidate2@gmail.com', $1, 'Jordan Lee', 'hr', $2)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name     = EXCLUDED.full_name,
            role          = EXCLUDED.role,
            company_id    = EXCLUDED.company_id
      RETURNING id
    `, [PASSWORD_HASH, companyId]);
    const cand2Id = cand2Res.rows[0].id;
    console.log("HR Manager (candidate2) ID:", cand2Id);

    await client.query(`
      INSERT INTO candidates (user_id, email, full_name)
      VALUES ($1, 'candidate2@gmail.com', 'Jordan Lee')
      ON CONFLICT (user_id) DO UPDATE
        SET email     = EXCLUDED.email,
            full_name = EXCLUDED.full_name
    `, [cand2Id]);

    await client.query(`
      INSERT INTO employees (employee_code, user_id, full_name, email, company_id, department, designation, status)
      VALUES ('EMP002', $1, 'Jordan Lee', 'candidate2@gmail.com', $2, 'Human Resources', 'HR Manager', 'active')
      ON CONFLICT (employee_code) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            email   = EXCLUDED.email,
            full_name = EXCLUDED.full_name
    `, [cand2Id, companyId]);

    // ── candidate3–5@gmail.com — Candidates (personal accounts, no work role yet)
    for (const [email, name, code] of [
      ['candidate3@gmail.com', 'Sam Chen',         'CAND003'],
      ['candidate4@gmail.com', 'Priya Patel',      'CAND004'],
      ['candidate5@gmail.com', 'Chris Thompson',   'CAND005'],
    ]) {
      const res = await client.query(`
        INSERT INTO users (email, password_hash, full_name, role)
        VALUES ($1, $2, $3, 'candidate')
        ON CONFLICT (email) DO UPDATE
          SET password_hash = EXCLUDED.password_hash,
              full_name     = EXCLUDED.full_name,
              role          = EXCLUDED.role,
              company_id    = NULL
        RETURNING id
      `, [email, PASSWORD_HASH, name]);
      const uid = res.rows[0].id;

      await client.query(`
        INSERT INTO candidates (user_id, email, full_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE
          SET email     = EXCLUDED.email,
              full_name = EXCLUDED.full_name
      `, [uid, email, name]);

      console.log(`Candidate ${code} (${email}) ID:`, uid);
    }

    console.log("\nSeed complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
