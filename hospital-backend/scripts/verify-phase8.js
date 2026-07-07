require("dotenv").config();
const app = require("../app");
const db = require("../src/config/knex");
const fs = require("fs");
const path = require("path");

const PORT = 3057;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("=== Starting Hospital Backend Phase 8 Verification Tests ===");
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    const timestamp = Date.now();
    const patientEmail1 = `patient.p8.a.${timestamp}@example.com`;
    const patientEmail2 = `patient.p8.b.${timestamp}@example.com`;
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

    // Patient Emma Watson (register & login)
    await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail1, password, first_name: "Emma", last_name: "Watson" }),
    });

    const pat1Login = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail1, password }),
    })).json();
    const pat1Token = pat1Login.data.accessToken;

    const patient1 = (await (await fetch(`${BASE_URL}/patients`, {
      headers: { "Authorization": `Bearer ${docToken}` },
    })).json()).data.find(p => p.email === patientEmail1);

    // Patient 2 (register & login)
    await fetch(`${BASE_URL}/auth/register?role=PATIENT`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail2, password, first_name: "John", last_name: "Doe" }),
    });

    const pat2Login = await (await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: patientEmail2, password }),
    })).json();
    const pat2Token = pat2Login.data.accessToken;

    console.log(`✔ Users logged in. Patient 1 (Watson) ID: ${patient1.id}`);

    // 2. Perform file upload (as Doctor Jane on behalf of Watson)
    console.log("\n[TC1] Uploading mock PDF document (as Doctor Jane)...");
    const docContent = "MOCK CLINICAL LAB REPORT FINDINGS - HEMOGLOBIN 14.5 g/dL";
    
    // Construct multi-part FormData body
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    const bodyParts = [];
    
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push(`Content-Disposition: form-data; name="patient_id"\r\n\r\n${patient1.id}\r\n`);
    
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push(`Content-Disposition: form-data; name="document_type"\r\n\r\nlab_report\r\n`);
    
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push(`Content-Disposition: form-data; name="file"; filename="lab_findings.pdf"\r\n`);
    bodyParts.push(`Content-Type: application/pdf\r\n\r\n${docContent}\r\n`);
    
    bodyParts.push(`--${boundary}--\r\n`);
    
    const uploadRes = await fetch(`${BASE_URL}/documents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${docToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyParts.join(""),
    });
    
    const uploadData = await uploadRes.json();
    if (uploadRes.status === 201 && uploadData.success) {
      console.log(`✔ Document uploaded successfully. ID: ${uploadData.data.id}`);
      console.log(`  File path registered: ${uploadData.data.file_path}`);
    } else {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }

    const documentId = uploadData.data.id;

    // 3. Query documents list
    console.log("\n[TC2] Listing Watson's clinical documents...");
    const listRes = await fetch(`${BASE_URL}/documents?patient_id=${patient1.id}`, {
      headers: { "Authorization": `Bearer ${pat1Token}` },
    });
    const list = (await listRes.json()).data;
    console.log(`  Patient Emma Watson reports files list length: ${list.length}`);
    
    if (list.length === 1 && list[0].document_name === "lab_findings.pdf") {
      console.log("✔ Metadata registry retrieval succeeded.");
    } else {
      throw new Error("Metadata check failed");
    }

    // 4. Download and stream document
    console.log("\n[TC3] Downloading/Streaming document (Patient Emma Watson)...");
    const downloadRes = await fetch(`${BASE_URL}/documents/${documentId}/download`, {
      headers: { "Authorization": `Bearer ${pat1Token}` },
    });
    const downloadText = await downloadRes.text();
    console.log(`  Streamed content: "${downloadText}"`);
    
    if (downloadRes.status === 200 && downloadText === docContent) {
      console.log("✔ Streamed bytes match original upload exactly.");
    } else {
      throw new Error(`Download verification failed. Status: ${downloadRes.status}`);
    }

    // 5. Test MIME type security filter
    console.log("\n[TC4] Testing MIME validation filter (uploading forbidden .sh script)...");
    const badBoundary = "----WebKitFormBoundary7MA4YWxkTrZu0gWBad";
    const badBodyParts = [];
    badBodyParts.push(`--${badBoundary}\r\n`);
    badBodyParts.push(`Content-Disposition: form-data; name="patient_id"\r\n\r\n${patient1.id}\r\n`);
    badBodyParts.push(`--${badBoundary}\r\n`);
    badBodyParts.push(`Content-Disposition: form-data; name="file"; filename="hack.sh"\r\n`);
    badBodyParts.push(`Content-Type: application/x-sh\r\n\r\nrm -rf /\r\n`);
    badBodyParts.push(`--${badBoundary}--\r\n`);

    const badMimeRes = await fetch(`${BASE_URL}/documents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${docToken}`,
        "Content-Type": `multipart/form-data; boundary=${badBoundary}`,
      },
      body: badBodyParts.join(""),
    });
    const badMimeData = await badMimeRes.json();
    
    if (badMimeRes.status === 400 && !badMimeData.success) {
      console.log(`✔ Upload blocked. Error response: "${badMimeData.message}"`);
    } else {
      throw new Error(`Expected 400 Bad Request for invalid MIME, got ${badMimeRes.status}`);
    }

    // 6. Test ABAC download restrictions
    console.log("\n[TC5] Testing ABAC boundary locks (Patient John Doe trying to download Watson's PDF)...");
    const badDownloadRes = await fetch(`${BASE_URL}/documents/${documentId}/download`, {
      headers: { "Authorization": `Bearer ${pat2Token}` },
    });
    
    if (badDownloadRes.status === 403) {
      console.log("✔ Access blocked with 403 Forbidden as expected.");
    } else {
      throw new Error(`Expected 403 Forbidden, got status ${badDownloadRes.status}`);
    }

    // 7. Test file delete and cleanup
    console.log("\n[TC6] Deleting document (as Doctor Jane)...");
    const deleteRes = await fetch(`${BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${docToken}` },
    });
    const deleteData = await deleteRes.json();

    if (deleteRes.status === 200 && deleteData.success) {
      console.log("✔ Document metadata deleted from database.");
      // Check physical file cleanup
      if (!fs.existsSync(uploadData.data.file_path)) {
        console.log("✔ Physical file was successfully deleted from local mock storage disk.");
      } else {
        throw new Error("Physical file was not cleaned up on disk!");
      }
    } else {
      throw new Error(`Delete request failed: ${JSON.stringify(deleteData)}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL PHASE 8 VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉");
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
