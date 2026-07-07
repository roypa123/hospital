require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");

const PORT = 3062;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Persistent Notifications Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.notif.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in users
    console.log("\n[Setup] Authenticating users...");
    
    // Doctor Jane (seeded)
    const docLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jane.smith@hospital.com", password }),
    })).json();
    const docToken = docLogin.data.accessToken;

    const drJane = (await (await fetch(`${BASE_URL}/doctors`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(d => d.email === "jane.smith@hospital.com");

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

    const patient = (await (await fetch(`${BASE_URL}/patients`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(p => p.email === patientEmail);

    console.log(`✔ Users authenticated. Patient Watson loaded (ID: ${patient.id})`);

    // 2. Book appointment (triggers APPOINTMENT_BOOKED notification to Doctor Jane)
    console.log("\n[TC1] Booking appointment (asserting persistent alert triggers to Doctor)...");
    const testDate = "2026-12-07"; // Monday
    await fetch(`${BASE_URL}/appointments/slots/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, date: testDate }),
    });

    const slots = (await (await fetch(`${BASE_URL}/appointments/slots?doctor_id=${drJane.id}&date=${testDate}`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    })).json()).data;
    const targetSlot = slots.find(s => s.status === "available");

    const bookRes = await fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, slot_id: targetSlot.id }),
    });
    const appointment = (await bookRes.json()).data;
    console.log(`✔ Appointment booked (ID: ${appointment.id})`);

    // 3. Query Doctor Jane's notifications inbox
    console.log("\n[TC2] Listing Doctor Jane's persistent notifications inbox...");
    const inboxRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const inboxData = await inboxRes.json();
    console.log(`  Inbox response status: ${inboxRes.status}`);
    console.log(`  Inbox alerts count: ${inboxData.data.length}`);

    if (inboxRes.status === 200 && inboxData.data.length > 0) {
      const alert = inboxData.data[0];
      console.log(`  ✔ Found: Title: "${alert.title}" | Message: "${alert.message}" | Read: ${alert.is_read}`);
      if (alert.title === "Appointment Booked" && alert.is_read === false) {
        console.log("✔ Persistent notification was successfully saved as unread in DB.");
      } else {
        throw new Error("Persistent notification mismatch");
      }
    } else {
      throw new Error(`Failed to retrieve persistent notifications: ${JSON.stringify(inboxData)}`);
    }

    const notificationId = inboxData.data[0].id;

    // 4. Mark single notification as read
    console.log("\n[TC3] Marking single notification as read...");
    const readRes = await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const readData = await readRes.json();
    console.log(`  Read status response: ${readRes.status}`);
    
    if (readRes.status === 200 && readData.data.is_read === true) {
      console.log("✔ Notification read status updated successfully in DB.");
    } else {
      throw new Error("Failed to update notification read status");
    }

    // 5. Mark all as read
    console.log("\n[TC4] Marking all remaining notifications as read...");
    const readAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    console.log(`  Read-all status response: ${readAllRes.status}`);
    if (readAllRes.status === 200) {
      console.log("✔ Cleaned inbox successfully.");
    } else {
      throw new Error("Failed to mark all as read");
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PERSISTENT NOTIFICATIONS TESTS COMPLETED SUCCESSFULLY! 🎉");
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
