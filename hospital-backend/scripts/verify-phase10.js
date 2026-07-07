require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3059;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 10 Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    // 1. Fetch Swagger Docs UI Endpoint
    console.log("\n[TC1] Fetching Swagger UI endpoint (/api-docs)...");
    const uiRes = await fetch(`${BASE_URL}/api-docs/`);
    console.log(`  UI response status: ${uiRes.status}`);

    if (uiRes.status === 200) {
      const htmlText = await uiRes.text();
      if (htmlText.includes("swagger-ui") || htmlText.includes("<html")) {
        console.log("✔ Swagger HTML UI layout retrieved successfully.");
      } else {
        throw new Error("HTML body does not match Swagger UI layout");
      }
    } else {
      throw new Error(`Expected 200 OK for /api-docs/, got ${uiRes.status}`);
    }

    // 2. Fetch Swagger UI init script to verify HMS specification parameters
    console.log("\n[TC2] Verifying Swagger OpenAPI HMS specs initialization...");
    const initScriptRes = await fetch(`${BASE_URL}/api-docs/swagger-ui-init.js`);
    console.log(`  Init script response status: ${initScriptRes.status}`);

    if (initScriptRes.status === 200) {
      const scriptText = await initScriptRes.text();
      if (scriptText.includes("Hospital Management System API")) {
        console.log("✔ OpenAPI HMS specifications title validated in swagger initializer.");
      } else {
        throw new Error("HMS specification title missing from Swagger initialization script");
      }
    } else {
      throw new Error(`Expected 200 OK for /api-docs/swagger-ui-init.js, got ${initScriptRes.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 10 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
