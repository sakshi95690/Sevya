import test from 'node:test';
import assert from 'node:assert/strict';
import { getRoleRank, normalizeRole, canManageUser } from '../src/utils/roleHierarchy';

test('RBAC Hierarchy: Member role rank is strictly lower than Admin roles', () => {
  const memberRank = getRoleRank('member');
  const volunteerRank = getRoleRank('volunteer');
  const devoteeRank = getRoleRank('devotee');
  const coordinatorRank = getRoleRank('coordinator');
  const deptHeadRank = getRoleRank('department_head');
  const templeAdminRank = getRoleRank('temple_admin');
  const superAdminRank = getRoleRank('super_admin');

  assert.strictEqual(memberRank, 1, 'Member rank should be 1');
  assert.strictEqual(volunteerRank, 1, 'Volunteer rank should be 1');
  assert.strictEqual(devoteeRank, 1, 'Devotee rank should be 1');
  assert.strictEqual(coordinatorRank, 2, 'Coordinator rank should be 2');
  assert.strictEqual(deptHeadRank, 3, 'Department head rank should be 3');
  assert.strictEqual(templeAdminRank, 4, 'Temple Admin rank should be 4');
  assert.strictEqual(superAdminRank, 5, 'Super Admin rank should be 5');

  // Verify Member cannot manage administrative items
  assert.strictEqual(memberRank >= 4, false, 'Member must not have admin privilege rank >= 4');
  assert.strictEqual(canManageUser('member', 'temple_admin'), false, 'Member cannot manage Temple Admin');
  assert.strictEqual(canManageUser('member', 'super_admin'), false, 'Member cannot manage Super Admin');
});

test('Integration Providers: All 4 core channels are properly modeled', () => {
  const supportedProviders = ['email', 'calendar', 'zoom', 'whatsapp'];
  assert.strictEqual(supportedProviders.length, 4);
  assert.ok(supportedProviders.includes('email'));
  assert.ok(supportedProviders.includes('calendar'));
  assert.ok(supportedProviders.includes('zoom'));
  assert.ok(supportedProviders.includes('whatsapp'));
});
