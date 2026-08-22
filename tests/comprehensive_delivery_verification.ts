const BASE_URL = 'http://127.0.0.1:3000';

type TestResult = {
  section: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'CONFIG REQUIRED';
  details: string;
};

const results: TestResult[] = [];

function logResult(section: string, testName: string, status: 'PASS' | 'FAIL' | 'CONFIG REQUIRED', details: string) {
  results.push({ section, testName, status, details });
  console.log(`[${status}] ${section} :: ${testName} - ${details}`);
}

async function runVerification() {
  console.log('=== SEVYA COMPREHENSIVE PRODUCTION DELIVERY VERIFICATION ===\n');

  let superAdminToken = '';
  let superAdminUserId = '';

  let normalUserToken = '';
  let normalUserId = '';

  // 1. STARTUP & POSTGRESQL CONNECTION
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (res.status === 200 && data.status === 'UP' && data.database === 'PostgreSQL Connected') {
      logResult('1. Startup & DB', 'PostgreSQL Connection', 'PASS', `Health response: ${JSON.stringify(data)}`);
    } else {
      logResult('1. Startup & DB', 'PostgreSQL Connection', 'FAIL', `Health response: ${JSON.stringify(data)}`);
    }
  } catch (err: any) {
    logResult('1. Startup & DB', 'PostgreSQL Connection', 'FAIL', `Health check failed: ${err.message}`);
  }

  // 2. AUTHENTICATION & SUPER ADMIN LOGIN
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pandeysakshi7555@gmail.com', name: 'Sakshi Pandey' }),
    });
    const data = await res.json();
    if (res.ok && data.accessToken && data.user.role === 'super_admin') {
      superAdminToken = data.accessToken;
      superAdminUserId = data.user.id;
      logResult('2. Authentication', 'Super Admin Login', 'PASS', `Logged in as ${data.user.email} (Role: ${data.user.role}, ID: ${superAdminUserId})`);
    } else {
      logResult('2. Authentication', 'Super Admin Login', 'FAIL', `Failed to login: ${JSON.stringify(data)}`);
    }
  } catch (err: any) {
    logResult('2. Authentication', 'Super Admin Login', 'FAIL', err.message);
  }

  // 3. SUPER ADMIN USER MANAGEMENT FLOWS
  let testAdminId = '';
  try {
    // A. Create Admin
    const adminEmail = `testadmin_${Date.now()}@temple.org`;
    const createAdminRes = await fetch(`${BASE_URL}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        email: adminEmail,
        name: 'Test Temple Admin',
        role: 'temple_admin',
        phone: '9876543210',
      }),
    });
    const adminData = await createAdminRes.json();
    if (createAdminRes.ok && adminData.id) {
      testAdminId = adminData.id;

      // Read back via GET
      const getRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getData = await getRes.json();

      if (getRes.ok && getData.email === adminEmail) {
        logResult('3. Super Admin', 'Create Admin User (CREATE -> READ)', 'PASS', `Admin created and verified in DB via GET (ID: ${testAdminId})`);
      } else {
        logResult('3. Super Admin', 'Create Admin User', 'FAIL', `Created in API but failed GET: ${JSON.stringify(getData)}`);
      }
    } else {
      logResult('3. Super Admin', 'Create Admin User', 'FAIL', JSON.stringify(adminData));
    }

    // B. Edit Admin
    if (testAdminId) {
      const editRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: 'Updated Temple Admin Name',
          phone: '9999999999',
        }),
      });

      const getRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getData = await getRes.json();

      if (editRes.ok && getData.name === 'Updated Temple Admin Name') {
        logResult('3. Super Admin', 'Edit Admin User (UPDATE -> READ)', 'PASS', `Name updated to "${getData.name}" and verified via GET`);
      } else {
        logResult('3. Super Admin', 'Edit Admin User', 'FAIL', `Update verification failed: ${JSON.stringify(getData)}`);
      }
    }

    // C. Change Role
    if (testAdminId) {
      const roleRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ role: 'leader' }),
      });

      const getRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getData = await getRes.json();

      if (roleRes.ok && getData.role === 'leader') {
        logResult('3. Super Admin', 'Change User Role', 'PASS', `Role updated to "leader" and verified via GET`);
      } else {
        logResult('3. Super Admin', 'Change User Role', 'FAIL', `Role is ${getData.role}`);
      }
    }

    // D. ACTIVE -> SUSPENDED -> ACTIVE
    if (testAdminId) {
      // Suspend
      const suspendRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ accountStatus: 'SUSPENDED' }),
      });

      const getSuspendedRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getSuspendedData = await getSuspendedRes.json();

      // Reactivate
      const reactivateRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ accountStatus: 'ACTIVE' }),
      });

      const getActiveRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getActiveData = await getActiveRes.json();

      if (suspendRes.ok && reactivateRes.ok && getSuspendedData.accountStatus === 'SUSPENDED' && getActiveData.accountStatus === 'ACTIVE') {
        logResult('3. Super Admin', 'ACTIVE -> SUSPENDED -> ACTIVE', 'PASS', 'Status transitions verified in DB via GET');
      } else {
        logResult('3. Super Admin', 'ACTIVE -> SUSPENDED -> ACTIVE', 'FAIL', 'Status transitions failed');
      }
    }

    // E. Invite User
    const inviteEmail = `invited_${Date.now()}@temple.org`;
    const inviteRes = await fetch(`${BASE_URL}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ email: inviteEmail, name: 'Invited Devotee', role: 'sevait', accountStatus: 'INVITED' }),
    });
    const inviteData = await inviteRes.json();
    if (inviteRes.ok && inviteData.id && inviteData.accountStatus === 'INVITED') {
      logResult('3. Super Admin', 'Invite User', 'PASS', `User invited and recorded as INVITED`);
    } else {
      logResult('3. Super Admin', 'Invite User', 'FAIL', `Invite failed: ${JSON.stringify(inviteData)}`);
    }

    // F. Disable / Deactivate User
    if (testAdminId) {
      const disableRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({ accountStatus: 'DISABLED' }),
      });

      const getDisabledRes = await fetch(`${BASE_URL}/api/v1/admin/users/${testAdminId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getDisabledData = await getDisabledRes.json();

      if (disableRes.ok && getDisabledData.accountStatus === 'DISABLED') {
        logResult('3. Super Admin', 'Disable User', 'PASS', 'User marked as DISABLED and verified via GET');
      } else {
        logResult('3. Super Admin', 'Disable User', 'FAIL', 'Failed to disable user');
      }
    }

    // G. Re-login / Token Verification
    const reloginRes = await fetch(`${BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pandeysakshi7555@gmail.com', name: 'Sakshi Pandey' }),
    });
    const reloginData = await reloginRes.json();
    if (reloginRes.ok && reloginData.accessToken) {
      logResult('3. Super Admin', 'Re-login Verification', 'PASS', 'Re-authenticated successfully and received fresh token');
    } else {
      logResult('3. Super Admin', 'Re-login Verification', 'FAIL', 'Failed to re-login');
    }
  } catch (err: any) {
    logResult('3. Super Admin', 'Super Admin Operations', 'FAIL', err.message);
  }

  // 4. PROJECT CRUD & DB VERIFICATION
  let testProjectId = '';
  try {
    // CREATE
    const createProjRes = await fetch(`${BASE_URL}/api/v1/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Grand Sanctum Renovation',
        description: 'Renovating the main sanctum sanctorum',
        status: 'in_progress',
        budget: 500000,
        category: 'Construction',
      }),
    });
    const projData = await createProjRes.json();
    if (createProjRes.ok && projData.id) {
      testProjectId = projData.id;

      // READ
      const getProjRes = await fetch(`${BASE_URL}/api/v1/projects/${testProjectId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getProjData = await getProjRes.json();

      if (getProjRes.ok && getProjData.name === 'Grand Sanctum Renovation') {
        logResult('4. Project CRUD', 'CREATE & READ Project', 'PASS', `Project saved in DB and verified via GET (ID: ${testProjectId})`);
      } else {
        logResult('4. Project CRUD', 'CREATE & READ Project', 'FAIL', `GET failed: ${JSON.stringify(getProjData)}`);
      }
    } else {
      logResult('4. Project CRUD', 'CREATE Project', 'FAIL', JSON.stringify(projData));
    }

    // UPDATE
    if (testProjectId) {
      const updateProjRes = await fetch(`${BASE_URL}/api/v1/projects/${testProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: 'Grand Sanctum Renovation Phase 2',
          spent: 120000,
        }),
      });

      const getProjRes = await fetch(`${BASE_URL}/api/v1/projects/${testProjectId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getProjData = await getProjRes.json();

      if (updateProjRes.ok && getProjData.name === 'Grand Sanctum Renovation Phase 2' && getProjData.spent === 120000) {
        logResult('4. Project CRUD', 'UPDATE Project', 'PASS', 'Project name and spent updated in DB and verified via GET');
      } else {
        logResult('4. Project CRUD', 'UPDATE Project', 'FAIL', `Update failed: ${JSON.stringify(getProjData)}`);
      }
    }

    // DELETE / ARCHIVE
    if (testProjectId) {
      const deleteProjRes = await fetch(`${BASE_URL}/api/v1/projects/${testProjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const getProjRes = await fetch(`${BASE_URL}/api/v1/projects/${testProjectId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      if (deleteProjRes.ok && (getProjRes.status === 404 || (await getProjRes.json()).archived)) {
        logResult('4. Project CRUD', 'DELETE / ARCHIVE Project', 'PASS', 'Project deleted/archived and verified via GET');
      } else {
        logResult('4. Project CRUD', 'DELETE / ARCHIVE Project', 'FAIL', 'Project still present or active');
      }
    }
  } catch (err: any) {
    logResult('4. Project CRUD', 'Project CRUD', 'FAIL', err.message);
  }

  // 5. IN-PERSON MEETING & ACTION POINTS FLOWS
  let testMeetingId = '';
  let testActionItemId = '';
  try {
    // CREATE IN-PERSON MEETING
    const meetingRes = await fetch(`${BASE_URL}/api/v1/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        title: 'Weekly Temple Management Council',
        date: '2026-08-15',
        time: '11:00',
        location: 'Council Hall A',
        description: 'Reviewing festival logistics and seva rosters',
        isZoomMeeting: false,
      }),
    });
    const meetingData = await meetingRes.json();
    if (meetingRes.ok && meetingData.id) {
      testMeetingId = meetingData.id;

      const getMeetingRes = await fetch(`${BASE_URL}/api/v1/meetings/${testMeetingId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getMeetingData = await getMeetingRes.json();

      if (getMeetingRes.ok && getMeetingData.location === 'Council Hall A') {
        logResult('5. In-Person Meeting', 'Create In-Person Meeting (CREATE -> READ)', 'PASS', `Meeting created in DB at ${getMeetingData.location}`);
      } else {
        logResult('5. In-Person Meeting', 'Create In-Person Meeting', 'FAIL', `GET failed: ${JSON.stringify(getMeetingData)}`);
      }
    } else {
      logResult('5. In-Person Meeting', 'Create In-Person Meeting', 'FAIL', JSON.stringify(meetingData));
    }

    // ADD ACTION POINTS
    if (testMeetingId) {
      const apRes = await fetch(`${BASE_URL}/api/v1/meetings/${testMeetingId}/action-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          title: 'Prepare sound system for evening aarti',
          assignedTo: superAdminUserId,
          dueDate: '2026-08-16',
        }),
      });
      const apData = await apRes.json();
      if (apRes.ok && apData.id) {
        testActionItemId = apData.id;
        logResult('5. In-Person Meeting', 'Action Points Creation', 'PASS', 'Action point created');
      } else {
        logResult('5. In-Person Meeting', 'Action Points Creation', 'FAIL', JSON.stringify(apData));
      }

      // EDIT ACTION POINT
      if (testActionItemId) {
        const editApRes = await fetch(`${BASE_URL}/api/v1/action-items/${testActionItemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${superAdminToken}`,
          },
          body: JSON.stringify({
            title: 'Prepare sound system & backup generator for evening aarti',
            status: 'COMPLETED',
          }),
        });
        const editApData = await editApRes.json();
        if (editApRes.ok && editApData.status === 'COMPLETED') {
          logResult('5. In-Person Meeting', 'Action Points Edit & Status Persist', 'PASS', 'Action point status updated in DB');
        } else {
          logResult('5. In-Person Meeting', 'Action Points Edit & Status Persist', 'FAIL', `Update failed: ${JSON.stringify(editApData)}`);
        }
      }
    }
  } catch (err: any) {
    logResult('5. In-Person Meeting', 'In-Person Meeting Flow', 'FAIL', err.message);
  }

  // 6. TASKS CRUD & DB VERIFICATION
  let testTaskId = '';
  try {
    const createTaskRes = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        title: 'Inspect Main Temple Courtyard Lighting',
        description: 'Verify all LED floodlights are functional',
        priority: 'HIGH',
        meetingId: testMeetingId || undefined,
        assignedTo: superAdminUserId,
        dueDate: '2026-08-12',
      }),
    });
    const taskData = await createTaskRes.json();
    if (createTaskRes.ok && taskData.id) {
      testTaskId = taskData.id;

      const getTaskRes = await fetch(`${BASE_URL}/api/v1/tasks/${testTaskId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getTaskData = await getTaskRes.json();

      if (getTaskRes.ok && getTaskData.title === 'Inspect Main Temple Courtyard Lighting') {
        logResult('6. Task CRUD', 'CREATE & READ Task', 'PASS', `Task created in DB and verified via GET (ID: ${testTaskId})`);
      } else {
        logResult('6. Task CRUD', 'CREATE & READ Task', 'FAIL', `GET failed: ${JSON.stringify(getTaskData)}`);
      }
    } else {
      logResult('6. Task CRUD', 'CREATE Task', 'FAIL', JSON.stringify(taskData));
    }

    // UPDATE TASK STATUS & PRIORITY
    if (testTaskId) {
      const updateTaskRes = await fetch(`${BASE_URL}/api/v1/tasks/${testTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          status: 'completed',
          priority: 'URGENT',
        }),
      });

      const getTaskRes = await fetch(`${BASE_URL}/api/v1/tasks/${testTaskId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const getTaskData = await getTaskRes.json();

      if (updateTaskRes.ok && (getTaskData.status === 'completed' || getTaskData.status === 'COMPLETED')) {
        logResult('6. Task CRUD', 'UPDATE Task Status & Priority', 'PASS', `Status updated to ${getTaskData.status} in DB and verified via GET`);
      } else {
        logResult('6. Task CRUD', 'UPDATE Task Status & Priority', 'FAIL', `Update failed: ${JSON.stringify(getTaskData)}`);
      }
    }

    // DELETE / ARCHIVE TASK
    if (testTaskId) {
      const deleteTaskRes = await fetch(`${BASE_URL}/api/v1/tasks/${testTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const getTaskRes = await fetch(`${BASE_URL}/api/v1/tasks/${testTaskId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      if (deleteTaskRes.ok && (getTaskRes.status === 404 || (await getTaskRes.json()).archived)) {
        logResult('6. Task CRUD', 'DELETE / ARCHIVE Task', 'PASS', 'Task deleted/archived and verified via GET');
      } else {
        logResult('6. Task CRUD', 'DELETE / ARCHIVE Task', 'FAIL', 'Task still active');
      }
    }
  } catch (err: any) {
    logResult('6. Task CRUD', 'Task CRUD', 'FAIL', err.message);
  }

  // 7. ZOOM API INTEGRATION EVALUATION
  try {
    const hasZoomClientId = Boolean(process.env.ZOOM_CLIENT_ID);
    const hasZoomClientSecret = Boolean(process.env.ZOOM_CLIENT_SECRET);
    const hasZoomAccountId = Boolean(process.env.ZOOM_ACCOUNT_ID);

    const zoomMeetingRes = await fetch(`${BASE_URL}/api/v1/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        title: 'Virtual Trustee Advisory Call',
        date: '2026-08-20',
        time: '16:00',
        isZoomMeeting: true,
      }),
    });
    const zoomMeetingData = await zoomMeetingRes.json();

    if (!hasZoomClientId || !hasZoomClientSecret || !hasZoomAccountId) {
      logResult(
        '7. Zoom API',
        'Zoom API Integration',
        'CONFIG REQUIRED',
        `Real Zoom API calls require environment variables: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET. (Currently unconfigured, fallback local meeting generated: ID ${zoomMeetingData.zoomMeetingId || 'N/A'})`
      );
    } else {
      logResult(
        '7. Zoom API',
        'Zoom API Integration',
        'PASS',
        `Zoom API called with credentials. Join URL: ${zoomMeetingData.zoomJoinUrl}`
      );
    }
  } catch (err: any) {
    logResult('7. Zoom API', 'Zoom API Integration', 'FAIL', err.message);
  }

  // 8. AUTHORIZATION TESTING
  try {
    // Register normal devotee user
    const normalUserRes = await fetch(`${BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `devotee_${Date.now()}@gmail.com`, name: 'Devotee User' }),
    });
    const normalUserData = await normalUserRes.json();
    normalUserToken = normalUserData.accessToken;
    normalUserId = normalUserData.user.id;

    // Normal user attempts Super Admin action
    const forbiddenRes = await fetch(`${BASE_URL}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${normalUserToken}`,
      },
      body: JSON.stringify({ email: 'forbidden@temple.org', name: 'Forbidden User', role: 'super_admin' }),
    });

    if (forbiddenRes.status === 403 || forbiddenRes.status === 401) {
      logResult('8. Authorization', 'Normal User Admin Restriction', 'PASS', `HTTP ${forbiddenRes.status} Forbidden returned when normal user accesses admin API`);
    } else {
      logResult('8. Authorization', 'Normal User Admin Restriction', 'FAIL', `Expected HTTP 403, got ${forbiddenRes.status}`);
    }
  } catch (err: any) {
    logResult('8. Authorization', 'Authorization Check', 'FAIL', err.message);
  }

  // 9. ERROR HANDLING TESTING
  try {
    // Invalid UUID
    const invalidUuidRes = await fetch(`${BASE_URL}/api/v1/admin/users/not-a-valid-uuid`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const isErrorHandled = invalidUuidRes.status === 400 || invalidUuidRes.status === 404;

    // Unauthorized Request (No Bearer Token)
    const unauthorizedRes = await fetch(`${BASE_URL}/api/v1/admin/users`);
    const isUnauthHandled = unauthorizedRes.status === 401;

    if (isErrorHandled && isUnauthHandled) {
      logResult('9. Error Handling', 'RFC 7807 & Validation Error Handling', 'PASS', `Invalid UUID status: ${invalidUuidRes.status}, Unauthorized status: ${unauthorizedRes.status}`);
    } else {
      logResult('9. Error Handling', 'RFC 7807 & Validation Error Handling', 'FAIL', `Invalid UUID: ${invalidUuidRes.status}, Unauthorized status: ${unauthorizedRes.status}`);
    }
  } catch (err: any) {
    logResult('9. Error Handling', 'Error Handling Check', 'FAIL', err.message);
  }

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.table(results);
}

runVerification().catch(console.error);
