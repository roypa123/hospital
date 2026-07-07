require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3061;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Inventory Listing Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const password = "Password123!";

    // 1. Log in Doctor Jane (seeded)
    console.log("\n[Setup] Authenticating Doctor Jane...");
    const docLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jane.smith@hospital.com", password }),
    })).json();
    const docToken = docLogin.data.accessToken;
    console.log("✔ Doctor Jane authenticated.");

    // 2. Query general stock levels
    console.log("\n[TC1] Requesting general stock levels listing (/api/pharmacy/stock)...");
    const stockRes = await fetch(`${BASE_URL}/pharmacy/stock`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    
    const stockData = await stockRes.json();
    console.log(`  General stock list response status: ${stockRes.status}`);
    console.log(`  Total stock batches found in inventory: ${stockData.data.length}`);

    if (stockRes.status === 200 && Array.isArray(stockData.data)) {
      console.log("✔ General stock listing endpoint verified successfully.");
      if (stockData.data.length > 0) {
        const item = stockData.data[0];
        console.log(`  Audited stock item: Medicine: ${item.medicine_name} | Batch: ${item.batch_number} | Quantity: ${item.quantity}`);
      }
    } else {
      throw new Error(`Inventory list query failed: ${JSON.stringify(stockData)}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL INVENTORY LISTING TESTS COMPLETED SUCCESSFULLY! 🎉");
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
