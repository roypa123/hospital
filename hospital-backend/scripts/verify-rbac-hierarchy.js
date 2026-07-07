require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3065;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Dynamic RBAC Hierarchy Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const password = "Password123!";

    // 1. Log in Doctor Jane (seeded as DOCTOR, default priority 80)
    console.log("\n[Setup] Authenticating Doctor Jane...");
    const docLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jane.smith@hospital.com", password }),
    })).json();
    const docToken = docLogin.data.accessToken;
    console.log("✔ Doctor Jane authenticated.");

    // 2. Jane attempts to fetch administrative users list (requires ADMIN, priority 100)
    console.log("\n[TC1] Doctor Jane (priority 80) attempting to access Admin route (/api/users)...");
    const resBefore = await fetch(`${BASE_URL}/users`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const dataBefore = await resBefore.json();
    console.log(`  Access attempt response status: ${resBefore.status}`);
    console.log(`  Access attempt message: "${dataBefore.message}"`);

    if (resBefore.status === 403 && dataBefore.message.includes("priority: 100")) {
      console.log("✔ Access blocked with 403 Forbidden because Jane's priority (80) is below Admin (100).");
    } else {
      throw new Error(`Expected block, got status ${resBefore.status}`);
    }

    // 3. Dynamically promote DOCTOR role priority to 100 in the database
    console.log("\n[TC2] Dynamically promoting DOCTOR role priority to 100 in database...");
    await db("roles").where({ name: "DOCTOR" }).update({ priority: 100 });
    console.log("✔ Database updated: DOCTOR priority set to 100.");

    // 4. Jane attempts to access /api/users again with the SAME token
    console.log("\n[TC3] Doctor Jane attempting to access /api/users again with SAME token...");
    const resAfter = await fetch(`${BASE_URL}/users`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const dataAfter = await resAfter.json();
    console.log(`  Access attempt response status: ${resAfter.status}`);
    console.log(`  Total users fetched: ${dataAfter.data ? dataAfter.data.length : 0}`);

    if (resAfter.status === 200 && dataAfter.success) {
      console.log("✔ Access GRANTED! The priority hierarchy check updated dynamically in real-time.");
    } else {
      throw new Error(`Access failed: ${JSON.stringify(dataAfter)}`);
    }

  } catch (error) {
    console.error("\n❌ VERIFICATION TEST FAILED:");
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    // Restore original DOCTOR priority to 80
    try {
      await db("roles").where({ name: "DOCTOR" }).update({ priority: 80 });
      console.log("\n[Cleanup] Restored DOCTOR role priority back to 80.");
    } catch (err) {
      console.error("Failed to restore DOCTOR priority: ", err.message);
    }
    
    // Shutdown
    await db.destroy();
    server.close(() => {
      console.log("Verification test server shut down.");
    });
  }
}

runTests();
