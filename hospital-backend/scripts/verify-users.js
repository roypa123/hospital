require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3064;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend User Management Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.user.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in users
    console.log("\n[Setup] Authenticating users...");
    
    // Admin (seeded)
    const adminLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@hospital.com", password }),
    })).json();
    const adminToken = adminLogin.data.accessToken;

    // Patient Watson (register & login)
    await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password, first_name: "Emma", last_name: "Watson" }),
    });

    const patLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password }),
    })).json();
    const patToken = patLogin.data.accessToken;
    const watsonUserId = patLogin.data.user.id;

    console.log(`✔ Users authenticated. Watson User ID: ${watsonUserId}`);

    // 2. List Users as Admin
    console.log("\n[TC1] Listing system users (as Admin)...");
    const listRes = await fetch(`${BASE_URL}/users`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    console.log(`  List response status: ${listRes.status}`);
    console.log(`  Total users fetched: ${listData.data.length}`);

    const hasWatson = listData.data.some(u => u.id === watsonUserId);
    if (listRes.status === 200 && hasWatson) {
      console.log("✔ Users list successfully retrieved and contains Watson profile.");
    } else {
      throw new Error("Failed to retrieve users list or Watson missing");
    }

    // 3. Edit Watson's profile metadata
    console.log("\n[TC2] Updating Watson's name metadata...");
    const editRes = await fetch(`${BASE_URL}/users/${watsonUserId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({ first_name: "Emma-Updated" }),
    });
    const editData = await editRes.json();
    console.log(`  Update response status: ${editRes.status}`);
    console.log(`  Updated name: ${editData.data.first_name}`);

    if (editRes.status === 200 && editData.data.first_name === "Emma-Updated") {
      console.log("✔ Profile metadata updated successfully.");
    } else {
      throw new Error("Metadata edit check failed");
    }

    // 4. Change Watson's role to RECEPTIONIST
    console.log("\n[TC3] Changing Watson's role to RECEPTIONIST...");
    const roleRes = await fetch(`${BASE_URL}/users/${watsonUserId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({ role: "RECEPTIONIST" }),
    });
    const roleData = await roleRes.json();
    console.log(`  Role adjust response status: ${roleRes.status}`);
    console.log(`  Assigned roles payload: ${JSON.stringify(roleData.data.roles)}`);

    if (roleRes.status === 200 && roleData.data.roles.includes("RECEPTIONIST")) {
      console.log("✔ Role override completed successfully.");
    } else {
      throw new Error("Role adjustment failed");
    }

    // 5. Suspend Watson's account (is_active: false)
    console.log("\n[TC4] Suspending Watson's account (is_active: false)...");
    const statusRes = await fetch(`${BASE_URL}/users/${watsonUserId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({ is_active: false }),
    });
    const statusData = await statusRes.json();
    console.log(`  Status adjust response status: ${statusRes.status}`);
    console.log(`  Account is_active status: ${statusData.data.is_active}`);

    if (statusRes.status === 200 && statusData.data.is_active === false) {
      console.log("✔ Account deactivation completed successfully.");
    } else {
      throw new Error("Deactivation toggle failed");
    }

    // 6. Verify suspended user login attempt is blocked
    console.log("\n[TC5] Testing login verification block for suspended account...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail, password }),
    });
    const loginData = await loginRes.json();
    console.log(`  Login attempt response status: ${loginRes.status}`);
    console.log(`  Login message: "${loginData.message}"`);

    if (loginRes.status === 401 && loginData.message.includes("suspended")) {
      console.log("✔ Login blocked with 401 Unauthorized for inactive account.");
    } else {
      throw new Error(`Expected login rejection for suspended user, got ${loginRes.status}`);
    }

    // 7. Verify Patient role is blocked from CRUD operations
    console.log("\n[TC6] Testing RBAC restriction (regular token attempting user list)...");
    const badRes = await fetch(`${BASE_URL}/users`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    });
    console.log(`  Regular token list attempt status: ${badRes.status}`);

    if (badRes.status === 403) {
      console.log("✔ Patient block from administrative users list with 403 Forbidden verified.");
    } else {
      throw new Error(`Expected 403 Forbidden for patient user operations, got ${badRes.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL USER MANAGEMENT TESTS COMPLETED SUCCESSFULLY! 🎉");
    console.log("=======================================================");

  } catch (error) {
    console.error("\n❌ VERIFICATION TEST FAILED:");
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    // Shutdown
    await db.destroy();
    server.close(() => {
      console.log("Verification test server shut down.");
    });
  }
}

runTests();
