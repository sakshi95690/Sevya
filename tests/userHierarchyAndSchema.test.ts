import assert from 'node:assert/strict';
import { db, checkDatabaseConnection, pool } from '../src/db/index.ts';
import { users, temples, designations } from '../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';

async function runHierarchyVerification() {
  console.log('=== SEVYA DATABASE & USER HIERARCHY VERIFICATION ===');

  // 1. Ensure DB connection and schema initialization
  await checkDatabaseConnection();
  console.log('[DB Status] Database connection and schema initialized.');

  // 2. Create a test temple
  const [temple] = await db
    .insert(temples)
    .values({
      name: 'Test Hierarchy Temple',
      city: 'Vrindavan',
      state: 'Uttar Pradesh',
    })
    .returning();
  assert.ok(temple?.id, 'Temple should be created');
  console.log(`[Hierarchy] Created test temple: ${temple.id}`);

  try {
    // 3. Create Super Admin (Top level)
    const [superAdmin] = await db
      .insert(users)
      .values({
        email: `superadmin_test_${Date.now()}@temple.org`,
        name: 'Top Super Admin',
        role: 'super_admin',
        templeId: temple.id,
        accountStatus: 'ACTIVE',
        status: 'active',
      })
      .returning();
    assert.ok(superAdmin?.id, 'Super admin created');
    console.log(`[Hierarchy 1/5] Super Admin created: ${superAdmin.id}`);

    // 4. Create Temple Admin (Parent: Super Admin)
    const [templeAdmin] = await db
      .insert(users)
      .values({
        email: `templeadmin_test_${Date.now()}@temple.org`,
        name: 'Temple Admin User',
        role: 'temple_admin',
        templeId: temple.id,
        parentId: superAdmin.id,
        accountStatus: 'ACTIVE',
        status: 'active',
      })
      .returning();
    assert.ok(templeAdmin?.id, 'Temple admin created');
    assert.equal(templeAdmin.parentId, superAdmin.id, 'Temple admin parent should be Super Admin');
    console.log(`[Hierarchy 2/5] Temple Admin created with parent = Super Admin (${superAdmin.id})`);

    // 5. Create Department Head / Leader (Parent: Temple Admin)
    const [deptHead] = await db
      .insert(users)
      .values({
        email: `depthead_test_${Date.now()}@temple.org`,
        name: 'Dept Head User',
        role: 'leader',
        templeId: temple.id,
        parentId: templeAdmin.id,
        accountStatus: 'ACTIVE',
        status: 'active',
      })
      .returning();
    assert.ok(deptHead?.id, 'Dept head created');
    assert.equal(deptHead.parentId, templeAdmin.id, 'Dept head parent should be Temple Admin');
    console.log(`[Hierarchy 3/5] Department Head created with parent = Temple Admin (${templeAdmin.id})`);

    // 6. Create Coordinator / Facilitator (Parent: Dept Head)
    const [coordinator] = await db
      .insert(users)
      .values({
        email: `coord_test_${Date.now()}@temple.org`,
        name: 'Coordinator User',
        role: 'facilitator',
        templeId: temple.id,
        parentId: deptHead.id,
        accountStatus: 'ACTIVE',
        status: 'active',
      })
      .returning();
    assert.ok(coordinator?.id, 'Coordinator created');
    assert.equal(coordinator.parentId, deptHead.id, 'Coordinator parent should be Dept Head');
    console.log(`[Hierarchy 4/5] Coordinator created with parent = Dept Head (${deptHead.id})`);

    // 7. Create Member / Volunteer (Parent: Coordinator)
    const [member] = await db
      .insert(users)
      .values({
        email: `member_test_${Date.now()}@temple.org`,
        name: 'Member Volunteer User',
        role: 'volunteer',
        templeId: temple.id,
        parentId: coordinator.id,
        accountStatus: 'ACTIVE',
        status: 'active',
      })
      .returning();
    assert.ok(member?.id, 'Member created');
    assert.equal(member.parentId, coordinator.id, 'Member parent should be Coordinator');
    console.log(`[Hierarchy 5/5] Member created with parent = Coordinator (${coordinator.id})`);

    // 8. Query back via Drizzle ORM to verify no DrizzleQueryError on users.parent_id
    const queriedMembers = await db
      .select()
      .from(users)
      .where(eq(users.templeId, temple.id));

    assert.equal(queriedMembers.length, 5, 'Should retrieve all 5 hierarchy levels');
    
    const memberInDb = queriedMembers.find((u: any) => u.id === member.id);
    assert.equal(memberInDb?.parentId, coordinator.id, 'Drizzle ORM selects parentId correctly without errors');
    console.log('[Drizzle ORM Query] Verified: users.parent_id column is properly queryable and mapped.');

    // 9. Update hierarchy link (reassignment)
    await db
      .update(users)
      .set({ parentId: templeAdmin.id })
      .where(eq(users.id, member.id));

    const [updatedMember] = await db
      .select()
      .from(users)
      .where(eq(users.id, member.id));
    assert.equal(updatedMember.parentId, templeAdmin.id, 'Parent updated successfully');
    console.log('[Hierarchy Reassignment] Reassigned member parent to Temple Admin successfully.');

    // 10. Clean up test users
    await db.delete(users).where(eq(users.templeId, temple.id));
    console.log('[Cleanup] Cleaned up test hierarchy records.');
  } finally {
    await db.delete(temples).where(eq(temples.id, temple.id)).catch(() => {});
  }

  console.log('✅ ALL DATABASE SCHEMA & HIERARCHY VERIFICATIONS PASSED SUCCESSFULLY!');
}

runHierarchyVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
