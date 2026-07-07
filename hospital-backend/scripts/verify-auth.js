require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3050;
const BASE_URL = `http://localhost:${PORT}/api/auth`;

async function runTests() {
  console.log("=== Starting Hospital Backend Auth Verification Tests ===");
  
  // 1. Start test server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    // 2. Prepare test data
    const email = `test.patient.${Date.now()}@example.com`;
    const password = "Password123!";
    const testUser = {
      email,
      password,
      first_name: "John",
      last_name: "Doe",
      date_of_birth: "1990-05-15",
      gender: "Male",
      blood_group: "O+",
      allergies: ["Penicillin"],
      emergency_contact: { name: "Jane Doe", phone: "123-456-7890" },
    };

    let accessToken = "";
    let refreshToken = "";
    let sessionId = "";

    // Test Case 1: Register Patient
    console.log("\n[TC1] Testing Patient Registration...");
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    
    if (regRes.status === 201 && regData.success) {
      console.log("✔ Patient registration succeeded.");
      console.log(`  Created User ID: ${regData.data.id}`);
    } else {
      throw new Error(`Failed to register patient: ${JSON.stringify(regData)}`);
    }

    // Test Case 2: Register duplicate email
    console.log("\n[TC2] Testing Duplicate Registration Conflict...");
    const dupRes = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const dupData = await dupRes.json();
    
    if (dupRes.status === 409) {
      console.log("✔ Duplicate registration blocked with 409 Conflict as expected.");
    } else {
      throw new Error(`Expected 409 Conflict, got ${dupRes.status}`);
    }

    // Test Case 3: Login with wrong password
    console.log("\n[TC3] Testing Login with incorrect credentials...");
    const wrongLoginRes = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "WrongPassword!" }),
    });
    const wrongLoginData = await wrongLoginRes.json();

    if (wrongLoginRes.status === 401) {
      console.log("✔ Login blocked with 401 Unauthorized as expected.");
    } else {
      throw new Error(`Expected 401 Unauthorized, got ${wrongLoginRes.status}`);
    }

    // Test Case 4: Login with correct credentials
    console.log("\n[TC4] Testing successful Login...");
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json();

    if (loginRes.status === 200 && loginData.success) {
      accessToken = loginData.data.accessToken;
      refreshToken = loginData.data.refreshToken;
      sessionId = loginData.data.user.id; // Or returned session id
      console.log("✔ Login succeeded.");
      console.log(`  Assigned Roles: ${JSON.stringify(loginData.data.user.roles)}`);
      console.log(`  Assigned Permissions: ${loginData.data.user.permissions.length} items`);
    } else {
      throw new Error(`Failed to login: ${JSON.stringify(loginData)}`);
    }

    // Test Case 5: Access protected route with valid token
    console.log("\n[TC5] Testing Session Audit (Protected route)...");
    const sessionRes = await fetch(`${BASE_URL}/sessions`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const sessionData = await sessionRes.json();

    if (sessionRes.status === 200 && sessionData.success) {
      console.log("✔ Active sessions retrieved successfully.");
      console.log(`  Sessions Count: ${sessionData.data.length}`);
      console.log(`  Session ID for first item: ${sessionData.data[0].id}`);
      sessionId = sessionData.data[0].id;
    } else {
      throw new Error(`Failed to query sessions: ${JSON.stringify(sessionData)}`);
    }

    // Test Case 6: Access protected route with invalid token
    console.log("\n[TC6] Testing access restriction (Protected route)...");
    const badSessionRes = await fetch(`${BASE_URL}/sessions`, {
      headers: { "Authorization": "Bearer bad_access_token" },
    });
    
    if (badSessionRes.status === 401) {
      console.log("✔ Access denied with 401 Unauthorized for bad token.");
    } else {
      throw new Error(`Expected 401, got ${badSessionRes.status}`);
    }

    // Test Case 7: Refresh Token
    console.log("\n[TC7] Testing Access Token Refresh...");
    const refreshRes = await fetch(`${BASE_URL}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const refreshData = await refreshRes.json();

    if (refreshRes.status === 200 && refreshData.success) {
      console.log("✔ Access token refresh succeeded.");
      accessToken = refreshData.data.accessToken;
    } else {
      throw new Error(`Failed to refresh token: ${JSON.stringify(refreshData)}`);
    }

    // Test Case 8: Logout / Session Revocation
    console.log("\n[TC8] Testing Logout / Session Close...");
    const logoutRes = await fetch(`${BASE_URL}/logout?sessionId=${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const logoutData = await logoutRes.json();

    if (logoutRes.status === 200 && logoutData.success) {
      console.log("✔ Logout succeeded.");
    } else {
      throw new Error(`Failed to logout: ${JSON.stringify(logoutData)}`);
    }

    // Test Case 9: Confirm refresh token revoked after logout
    console.log("\n[TC9] Testing revoked refresh token rejected...");
    const badRefreshRes = await fetch(`${BASE_URL}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (badRefreshRes.status === 401) {
      console.log("✔ Revoked refresh token correctly rejected.");
    } else {
      throw new Error(`Expected 401 for revoked refresh token, got ${badRefreshRes.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
    console.log("=======================================================");

  } catch (error) {
    console.error("\n❌ VERIFICATION TEST FAILED:");
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    // 5. Close database and server
    await db.destroy();
    server.close(() => {
      console.log("Verification test server shut down.");
    });
  }
}

runTests();
