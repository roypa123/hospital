require("dotenv").config();
const http = require("http");
const { io } = require("socket.io-client");
const app = require("../app");
const db = require("../src/config/knex");
const { initSocketServer } = require("../src/sockets");
const labService = require("../src/services/lab.service");

const PORT = 3058;
const BASE_URL = `http://localhost:${PORT}/api`;

function waitForEvent(socket, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for websocket event: ${eventName}`));
    }, timeoutMs);
    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 9 Verification Tests ===");
  
  // Wrap Express app with HTTP server and initialize Socket.IO
  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Test server and Socket.IO running on port ${PORT}`);
      resolve();
    });
  });

  let patSocket = null;
  let docSocket = null;
  let badSocket = null;

  try {
    const timestamp = Date.now();
    const patientEmail = `patient.p9.${timestamp}@example.com`;
    const password = "Password123!";

    // 1. Log in users to get JWT tokens
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

    console.log(`✔ Tokens resolved. Patient Watson ID: ${patient.id} | Doctor Jane ID: ${drJane.id}`);

    // 2. Establish WebSocket Connections
    console.log("\n[TC1] Establishing WebSocket connections & handshake authentication...");
    
    // Watson (Patient) WS client
    patSocket = io(`http://localhost:${PORT}/notifications`, {
      auth: { token: patToken },
      transports: ["websocket"],
    });

    // Jane (Doctor) WS client
    docSocket = io(`http://localhost:${PORT}/notifications`, {
      auth: { token: docToken },
      transports: ["websocket"],
    });

    // Wait for connect
    await Promise.all([
      new Promise((resolve, reject) => {
        patSocket.on("connect", resolve);
        patSocket.on("connect_error", reject);
      }),
      new Promise((resolve, reject) => {
        docSocket.on("connect", resolve);
        docSocket.on("connect_error", reject);
      }),
    ]);

    console.log("✔ Sockets connected successfully and authenticated via JWT handshake.");

    // Bogus Token WS client (should fail auth)
    console.log("\n[TC2] Verifying Socket handshake validation blocks bogus connections...");
    badSocket = io(`http://localhost:${PORT}/notifications`, {
      auth: { token: "bogus-jwt-payload" },
      transports: ["websocket"],
    });

    await new Promise((resolve) => {
      badSocket.on("connect_error", (err) => {
        console.log(`✔ Connection rejected as expected. Error: "${err.message}"`);
        resolve();
      });
    });

    // 3. Test Booking alert: APPOINTMENT_BOOKED
    console.log("\n[TC3] Booking slot (asserting APPOINTMENT_BOOKED alert triggers to Doctor)...");
    const testDate = "2026-11-23"; // Monday
    await fetch(`${BASE_URL}/appointments/slots/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, date: testDate }),
    });

    const slots = (await (await fetch(`${BASE_URL}/appointments/slots?doctor_id=${drJane.id}&date=${testDate}`, {
      headers: { "Authorization": `Bearer ${patToken}` },
    })).json()).data;
    const targetSlot = slots.find(s => s.status === "available");

    // Setup listener before request
    const bookPromise = waitForEvent(docSocket, "APPOINTMENT_BOOKED");

    const bookRes = await fetch(`${BASE_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${patToken}` },
      body: JSON.stringify({ doctor_id: drJane.id, slot_id: targetSlot.id }),
    });
    const appointment = (await bookRes.json()).data;

    const bookAlert = await bookPromise;
    console.log(`✔ Doctor Jane received real-time alert: "${bookAlert.message}"`);
    if (bookAlert.appointment_id === appointment.id) {
      console.log("✔ Appointment ID matches booked record.");
    } else {
      throw new Error("Appointment ID mismatch");
    }

    // 4. Test Check-in alert: APPOINTMENT_CHECKED_IN
    console.log("\n[TC4] Checking in Patient Watson (asserting APPOINTMENT_CHECKED_IN alert)...");
    
    const checkinPromise = waitForEvent(docSocket, "APPOINTMENT_CHECKED_IN");
    
    await fetch(`${BASE_URL}/appointments/${appointment.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({ status: "checked_in" }),
    });

    const checkinAlert = await checkinPromise;
    console.log(`✔ Doctor Jane received real-time checked_in alert: "${checkinAlert.message}"`);
    if (checkinAlert.appointment_id === appointment.id) {
      console.log("✔ Checked-in Appointment ID matches.");
    } else {
      throw new Error("Checked-in Appointment ID mismatch");
    }

    // 5. Test Checkout/Prescription alert: PRESCRIPTION_READY
    console.log("\n[TC5] Running visit checkout (asserting PRESCRIPTION_READY alert to Patient)...");
    
    // Checked in -> Consultation
    await fetch(`${BASE_URL}/appointments/${appointment.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({ status: "consultation" }),
    });

    const checkoutPromise = waitForEvent(patSocket, "PRESCRIPTION_READY");

    const checkoutRes = await fetch(`${BASE_URL}/billing/checkout/${appointment.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({
        symptoms: "Stuffy nose, coughing.",
        diagnosis: "Common Cold",
        vital_signs: { blood_pressure: "120/80", heart_rate: 72, temperature: 36.8 },
        prescription: {
          notes: "Take after meals.",
          items: [{ medicine_name_custom: "Cough Syrup", quantity: 1, duration_days: 5 }],
        },
      }),
    });
    const checkoutData = (await checkoutRes.json()).data;

    const prescriptionAlert = await checkoutPromise;
    console.log(`✔ Patient Watson received real-time signed prescription alert: "${prescriptionAlert.message}"`);
    if (prescriptionAlert.prescription_id === checkoutData.prescription_id) {
      console.log("✔ Prescription ID matches.");
    } else {
      throw new Error("Prescription ID mismatch");
    }

    // 6. Test Lab test result approvals alert: LAB_RESULTS_READY and LAB_RESULTS_APPROVED
    console.log("\n[TC6] Ordering lab, uploading findings, and approving (asserting LAB_RESULTS alerts)...");
    
    const labOrderRes = await fetch(`${BASE_URL}/laboratory/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${docToken}` },
      body: JSON.stringify({ patient_id: patient.id, test_name: "COVID-19 PCR", category: "viral" }),
    });
    const testOrder = (await labOrderRes.json()).data;

    // A: Tech uploads findings -> Triggers LAB_RESULTS_READY alert to Doctor Jane
    const labReadyPromise = waitForEvent(docSocket, "LAB_RESULTS_READY");

    // Cashier/Tech login
    const cashierLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cashier@hospital.com", password }),
    })).json();
    const cashierToken = cashierLogin.data.accessToken;

    await fetch(`${BASE_URL}/laboratory/test/${testOrder.id}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer={${cashierToken}}` }, // Tech auth simulation
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cashierToken}` },
      body: JSON.stringify({ results_summary: "Negative", findings: "PCR test returned negative for SARS-CoV-2." }),
    });

    const labReadyAlert = await labReadyPromise;
    console.log(`✔ Doctor Jane received results review alert: "${labReadyAlert.message}"`);

    // B: Doctor approves findings -> Triggers LAB_RESULTS_APPROVED alert to Patient Watson
    const labApprovedPromise = waitForEvent(patSocket, "LAB_RESULTS_APPROVED");

    await fetch(`${BASE_URL}/laboratory/test/${testOrder.id}/approve`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${docToken}` },
    });

    const labApprovedAlert = await labApprovedPromise;
    console.log(`✔ Patient Emma Watson received approved results alert: "${labApprovedAlert.message}"`);

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 9 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
    console.log("=======================================================");

  } catch (error) {
    console.error("\n❌ VERIFICATION TEST FAILED:");
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    // Cleanup sockets
    if (patSocket) patSocket.close();
    if (docSocket) docSocket.close();
    if (badSocket) badSocket.close();

    // Shutdown DB & Server
    await db.destroy();
    server.close(() => {
      console.log("Verification test server shut down.");
    });
  }
}

runTests();
