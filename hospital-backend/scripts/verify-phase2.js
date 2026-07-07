require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3051;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 2 Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    // 1. Setup users (Admin, Patient A, Patient B)
    const timestamp = Date.now();
    const adminEmail = `admin.${timestamp}@hospital.com`;
    const patientAEmail = `patient.a.${timestamp}@example.com`;
    const patientBEmail = `patient.b.${timestamp}@example.com`;
    const password = "Password123!";

    console.log("\n[Setup] Registering Admin and Patients...");
    
    // Register Admin
    const adminReg = await fetch(`${BASE_URL}/auth/register?role=ADMIN`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password, first_name: "Admin", last_name: "Staff" }),
    });
    
    // Register Patient A
    const patAReg = await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: patientAEmail,
        password,
        first_name: "Patient",
        last_name: "A",
        date_of_birth: "1995-10-10",
        gender: "Female",
      }),
    });

    // Register Patient B
    const patBReg = await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: patientBEmail,
        password,
        first_name: "Patient",
        last_name: "B",
        date_of_birth: "1992-04-20",
        gender: "Male",
      }),
    });

    if (adminReg.status !== 201 || patAReg.status !== 201 || patBReg.status !== 201) {
      throw new Error(`User setups failed: admin=${adminReg.status}, A=${patAReg.status}, B=${patBReg.status}`);
    }
    console.log("✔ Users successfully registered.");

    // Log in all three to get access tokens
    const adminToken = (await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password }),
    })).json()).data.accessToken;

    const patientAToken = (await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientAEmail, password }),
    })).json()).data.accessToken;

    const patientBToken = (await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientBEmail, password }),
    })).json()).data.accessToken;

    console.log("✔ Logins completed. Tokens issued.");

    // 2. Fetch list of doctors to find Dr. Jane (jane.smith@hospital.com)
    console.log("\n[TC1] Testing listing doctors and finding test ID...");
    const docRes = await fetch(`${BASE_URL}/doctors`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    const docData = await docRes.json();
    const drJane = docData.data.find((d) => d.email === "jane.smith@hospital.com");
    if (!drJane) {
      throw new Error("Dr. Jane Smith not found in seeded doctors list");
    }
    console.log(`✔ Found Doctor: ${drJane.first_name} ${drJane.last_name} (ID: ${drJane.id})`);

    // 3. Generate slots for Dr. Jane for a Monday (Mondays are active in template)
    // Let's use Monday, Oct 12, 2026 (2026-10-12)
    const testDate = "2026-10-12";
    console.log(`\n[TC2] Generating slots for Dr. Jane on date ${testDate}...`);
    const slotGenRes = await fetch(`${BASE_URL}/appointments/slots/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ doctor_id: drJane.id, date: testDate }),
    });
    const slotGenData = await slotGenRes.json();
    
    if (slotGenRes.status === 201 && slotGenData.success) {
      console.log(`✔ Successfully generated ${slotGenData.data.length} available slots.`);
      console.log(`  First Slot: ${slotGenData.data[0].start_time} - ${slotGenData.data[0].end_time}`);
    } else {
      throw new Error(`Slot generation failed: ${JSON.stringify(slotGenData)}`);
    }

    // 4. Test concurrent booking (Optimistic Locking)
    // We will pick the first slot and make two booking requests in parallel
    const targetSlot = slotGenData.data[0];
    console.log(`\n[TC3] Simulating concurrent bookings on Slot ID: ${targetSlot.id}...`);

    const bookA = fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${patientAToken}`,
      },
      body: JSON.stringify({ doctor_id: drJane.id, slot_id: targetSlot.id }),
    });

    const bookB = fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${patientBToken}`,
      },
      body: JSON.stringify({ doctor_id: drJane.id, slot_id: targetSlot.id }),
    });

    // Execute parallel requests
    const [resA, resB] = await Promise.all([bookA, bookB]);
    const dataA = await resA.json();
    const dataB = await resB.json();

    console.log(`  Patient A status code: ${resA.status}`);
    console.log(`  Patient B status code: ${resB.status}`);

    // One must succeed (201) and one must fail (409)
    const successA = resA.status === 201;
    const successB = resB.status === 201;
    const conflictA = resA.status === 409;
    const conflictB = resB.status === 409;

    if ((successA && conflictB) || (successB && conflictA)) {
      console.log("✔ Concurrency check passed! One booking succeeded and the other was blocked with 409 Conflict.");
    } else {
      throw new Error(`Concurrency check failed. A: ${resA.status}, B: ${resB.status}`);
    }

    const winningToken = successA ? patientAToken : patientBToken;
    const losingToken = successA ? patientBToken : patientAToken;
    const apptId = successA ? dataA.data.id : dataB.data.id;

    // 5. Test ABAC restrictions
    // Patient B (loser) attempts to cancel Patient A's (winner) appointment
    console.log("\n[TC4] Testing ABAC: Restricting cancellation of others' appointments...");
    const cancelOtherRes = await fetch(`${BASE_URL}/appointments/${apptId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${losingToken}`,
      },
    });
    const cancelOtherData = await cancelOtherRes.json();

    if (cancelOtherRes.status === 403) {
      console.log("✔ Verification succeeded. Blocked with 403 Forbidden.");
    } else {
      throw new Error(`ABAC check failed. Expected 403, got ${cancelOtherRes.status}`);
    }

    // 6. Test Appointment Progression Workflow
    console.log("\n[TC5] Testing workflow transitions (scheduled -> checked_in -> completed)...");
    
    // Transit 1: scheduled -> checked_in
    const trans1 = await fetch(`${BASE_URL}/appointments/${apptId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "checked_in", notes: "Patient checked in at reception desk" }),
    });
    
    // Try invalid transition: checked_in -> completed (must skip consultation)
    const transInvalid = await fetch(`${BASE_URL}/appointments/${apptId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "completed" }),
    });

    // Transit 2: checked_in -> consultation
    const trans2 = await fetch(`${BASE_URL}/appointments/${apptId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "consultation" }),
    });

    // Transit 3: consultation -> completed
    const trans3 = await fetch(`${BASE_URL}/appointments/${apptId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "completed", notes: "Checkup completed. Standard prescription issued." }),
    });

    if (trans1.status === 200 && transInvalid.status === 400 && trans2.status === 200 && trans3.status === 200) {
      console.log("✔ State transitions enforced successfully. Linear progression and invalid transition check completed.");
    } else {
      throw new Error(`Transitions failed. t1=${trans1.status}, tinv=${transInvalid.status}, t2=${trans2.status}, t3=${trans3.status}`);
    }

    // 7. Verify booking slots are released when appointment is cancelled
    // We will book the second slot for Patient A, and then cancel it.
    const secondSlot = slotGenData.data[1];
    console.log(`\n[TC6] Booking and cancelling slot ${secondSlot.id} to test release mechanism...`);
    
    // Book
    const bookSec = await fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${patientAToken}`,
      },
      body: JSON.stringify({ doctor_id: drJane.id, slot_id: secondSlot.id }),
    });
    const secAppt = await bookSec.json();

    // Cancel
    const cancelSec = await fetch(`${BASE_URL}/appointments/${secAppt.data.id}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${patientAToken}`,
      },
    });

    // Check slot availability again
    const verifySlotRes = await fetch(`${BASE_URL}/appointments/slots?doctor_id=${drJane.id}&date=${testDate}`, {
      headers: {
        "Authorization": `Bearer ${patientAToken}`,
      },
    });
    const verifySlotData = await verifySlotRes.json();
    const freedSlot = verifySlotData.data.find((s) => s.id === secondSlot.id);

    if (cancelSec.status === 200 && freedSlot.status === "available") {
      console.log("✔ Slot was successfully set back to 'available' after cancellation.");
    } else {
      throw new Error(`Slot release test failed. cancelStatus=${cancelSec.status}, slotStatus=${freedSlot?.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 2 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
