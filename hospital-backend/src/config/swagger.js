const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Hospital Management System API",
    description: "Production-ready backend architecture documentation covering role-based authentication, scheduler slots booking, diagnostic lab records, checkout transactions, insurance policies claims, compliance auditing, and file uploads.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:3000/api",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Input your JWT Access Token to authorize and test protected routes.",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          is_active: { type: "boolean" },
          is_verified: { type: "boolean" },
          mfa_enabled: { type: "boolean" },
        },
      },
      Appointment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          doctor_id: { type: "string", format: "uuid" },
          slot_id: { type: "string", format: "uuid" },
          appointment_date: { type: "string", format: "date" },
          status: { type: "string", enum: ["scheduled", "checked_in", "consultation", "completed", "cancelled"] },
          visit_type: { type: "string" },
          reason_for_visit: { type: "string" },
        },
      },
      Bill: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          appointment_id: { type: "string", format: "uuid" },
          total_amount: { type: "number" },
          discount_amount: { type: "number" },
          tax_amount: { type: "number" },
          net_amount: { type: "number" },
          paid_amount: { type: "number" },
          status: { type: "string", enum: ["unpaid", "partially_paid", "paid", "void"] },
        },
      },
      Claim: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          bill_id: { type: "string", format: "uuid" },
          patient_insurance_policy_id: { type: "string", format: "uuid" },
          claim_amount: { type: "number" },
          approved_amount: { type: "number" },
          status: { type: "string", enum: ["submitted", "approved", "rejected"] },
          rejection_reason: { type: "string", nullable: true },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid", nullable: true },
          action: { type: "string" },
          resource_type: { type: "string" },
          resource_id: { type: "string", format: "uuid", nullable: true },
          payload: { type: "object" },
          ip_address: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      MedicalDocument: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          patient_id: { type: "string", format: "uuid" },
          document_name: { type: "string" },
          document_type: { type: "string" },
          file_size: { type: "integer" },
          mime_type: { type: "string" },
          uploaded_by: { type: "string", format: "uuid" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new user",
        description: "Creates user account and profiles (PATIENT, DOCTOR, etc.)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "first_name", "last_name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  first_name: { type: "string" },
                  last_name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Bad Request validation errors" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Authenticate user and open session",
        description: "Validates credentials and responds with JWT token or MFA challenge.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful / MFA Challenge triggered" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/appointments": {
      post: {
        summary: "Book an appointment",
        description: "Locks a slot using optimistic locking concurrency validations.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["doctor_id", "slot_id"],
                properties: {
                  doctor_id: { type: "string", format: "uuid" },
                  slot_id: { type: "string", format: "uuid" },
                  visit_type: { type: "string" },
                  reason_for_visit: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Appointment booked successfully" },
          409: { description: "Slot booking conflict" },
        },
      },
    },
    "/billing/checkout/{appointmentId}": {
      post: {
        summary: "Unified consultation checkout transaction",
        description: "Concludes consultation by writing EMR diagnosis, signing prescription, ordering labs, and billing invoice.",
        parameters: [
          {
            name: "appointmentId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["symptoms", "diagnosis", "vital_signs"],
                properties: {
                  symptoms: { type: "string" },
                  diagnosis: { type: "string" },
                  vital_signs: {
                    type: "object",
                    properties: {
                      blood_pressure: { type: "string" },
                      heart_rate: { type: "integer" },
                      temperature: { type: "number" },
                    },
                  },
                  prescription: {
                    type: "object",
                    properties: {
                      notes: { type: "string" },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            medicine_id: { type: "string", format: "uuid" },
                            medicine_name_custom: { type: "string" },
                            dosage_morning: { type: "boolean" },
                            dosage_afternoon: { type: "boolean" },
                            dosage_night: { type: "boolean" },
                            duration_days: { type: "integer" },
                            quantity: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Checkout transaction completed successfully" },
        },
      },
    },
    "/laboratory/order": {
      post: {
        summary: "Request a diagnostic lab test",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient_id", "test_name", "category"],
                properties: {
                  patient_id: { type: "string", format: "uuid" },
                  test_name: { type: "string" },
                  category: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Lab test ordered" },
        },
      },
    },
    "/insurance/claims": {
      post: {
        summary: "Submit a billing claim to insurance providers",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bill_id", "patient_insurance_policy_id", "claim_amount"],
                properties: {
                  bill_id: { type: "string", format: "uuid" },
                  patient_insurance_policy_id: { type: "string", format: "uuid" },
                  claim_amount: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Claim submitted" },
        },
      },
    },
    "/dashboard/admin": {
      get: {
        summary: "Admin analytics overview",
        responses: {
          200: { description: "Administrative financial analytics retrieved" },
        },
      },
    },
    "/dashboard/doctor": {
      get: {
        summary: "Doctor clinic summaries",
        responses: {
          200: { description: "Roster schedules and stats retrieved" },
        },
      },
    },
    "/dashboard/patient": {
      get: {
        summary: "Patient vitals health trends",
        responses: {
          200: { description: "Chronological vital signs lists retrieved" },
        },
      },
    },
    "/documents": {
      post: {
        summary: "Upload a clinical medical document",
        description: "Uploads form-data attachments with MIME filters and size limits <= 5MB.",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "patient_id"],
                properties: {
                  file: { type: "string", format: "binary" },
                  patient_id: { type: "string", format: "uuid" },
                  document_type: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Document uploaded successfully" },
        },
      },
    },
    "/audit-logs": {
      get: {
        summary: "Fetch administrative system audit logs",
        responses: {
          200: { description: "Audit trail events retrieved" },
        },
      },
    },
  },
};

module.exports = swaggerDocument;
