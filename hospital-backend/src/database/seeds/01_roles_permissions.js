exports.seed = async function (knex) {
  // Deletes ALL existing entries in dependent tables first
  await knex("role_permissions").del();
  await knex("user_roles").del();
  await knex("roles").del();
  await knex("permissions").del();

  // 1. Seed Permissions
  const permissionsData = [
    { name: "patient:register", description: "Register a new patient" },
    { name: "patient:view_profile", description: "View a patient profile" },
    { name: "patient:view_all", description: "List all patients" },
    { name: "patient:update", description: "Update patient details" },
    
    { name: "appointment:create", description: "Book an appointment" },
    { name: "appointment:cancel", description: "Cancel an appointment" },
    { name: "appointment:reschedule", description: "Reschedule an appointment" },
    { name: "appointment:view_all", description: "View all scheduled appointments" },
    
    { name: "prescription:write", description: "Write prescriptions for patients" },
    { name: "prescription:view", description: "View prescriptions" },
    
    { name: "billing:create", description: "Generate bills" },
    { name: "billing:view", description: "View billing details" },
    { name: "billing:delete", description: "Void or delete invoices" },
    
    { name: "lab:upload", description: "Upload lab test reports" },
    { name: "lab:approve", description: "Approve lab results" },
    { name: "lab:view", description: "View lab results" },
    
    { name: "inventory:manage", description: "Manage pharmacy and equipment stock" },
    { name: "reports:view", description: "View management and revenue reports" },
    { name: "audit:view", description: "View system audit logs" },
  ];

  const permissions = await knex("permissions")
    .insert(permissionsData)
    .returning(["id", "name"]);

  // Create a helper map for permission IDs
  const permMap = {};
  permissions.forEach(p => {
    permMap[p.name] = p.id;
  });

  // 2. Seed Roles
  const rolesData = [
    { name: "ADMIN", description: "System Administrator with full access" },
    { name: "DOCTOR", description: "Medical practitioner" },
    { name: "RECEPTIONIST", description: "Front desk staff managing bookings and registration" },
    { name: "LAB_TECHNICIAN", description: "Laboratory staff running tests and reports" },
    { name: "PHARMACIST", description: "Pharmacy stock and dispensing manager" },
    { name: "CASHIER", description: "Billing and payment processor" },
    { name: "NURSE", description: "Nursing staff supporting doctors and patients" },
    { name: "INSURANCE_OFFICER", description: "Manages claims and policies" },
    { name: "PATIENT", description: "Registered customer seeking medical services" },
  ];

  const roles = await knex("roles")
    .insert(rolesData)
    .returning(["id", "name"]);

  const roleMap = {};
  roles.forEach(r => {
    roleMap[r.name] = r.id;
  });

  // 3. Map Permissions to Roles
  const rolePermissions = [];

  // ADMIN gets all permissions
  permissions.forEach(p => {
    rolePermissions.push({ role_id: roleMap["ADMIN"], permission_id: p.id });
  });

  // DOCTOR permissions
  const doctorPerms = [
    "patient:view_profile",
    "patient:view_all",
    "appointment:view_all",
    "prescription:write",
    "prescription:view",
    "lab:view",
  ];
  doctorPerms.forEach(name => {
    if (permMap[name]) {
      rolePermissions.push({ role_id: roleMap["DOCTOR"], permission_id: permMap[name] });
    }
  });

  // RECEPTIONIST permissions
  const recepPerms = [
    "patient:register",
    "patient:view_profile",
    "patient:view_all",
    "patient:update",
    "appointment:create",
    "appointment:cancel",
    "appointment:reschedule",
    "appointment:view_all",
  ];
  recepPerms.forEach(name => {
    if (permMap[name]) {
      rolePermissions.push({ role_id: roleMap["RECEPTIONIST"], permission_id: permMap[name] });
    }
  });

  // LAB_TECHNICIAN permissions
  const labPerms = [
    "patient:view_profile",
    "lab:upload",
    "lab:view",
  ];
  labPerms.forEach(name => {
    if (permMap[name]) {
      rolePermissions.push({ role_id: roleMap["LAB_TECHNICIAN"], permission_id: permMap[name] });
    }
  });

  // PHARMACIST permissions
  const pharmPerms = [
    "prescription:view",
    "inventory:manage",
  ];
  pharmPerms.forEach(name => {
    if (permMap[name]) {
      rolePermissions.push({ role_id: roleMap["PHARMACIST"], permission_id: permMap[name] });
    }
  });

  // CASHIER permissions
  const cashierPerms = [
    "billing:create",
    "billing:view",
    "patient:view_profile",
  ];
  cashierPerms.forEach(name => {
    if (permMap[name]) {
      rolePermissions.push({ role_id: roleMap["CASHIER"], permission_id: permMap[name] });
    }
  });

  // PATIENT permissions
  const patientPerms = [
    "patient:view_profile",
    "appointment:create",
    "appointment:cancel",
    "prescription:view",
    "lab:view",
  ];
  patientPerms.forEach(name => {
    if (permMap[name]) {
      rolePermissions.push({ role_id: roleMap["PATIENT"], permission_id: permMap[name] });
    }
  });

  // Insert role permissions
  await knex("role_permissions").insert(rolePermissions);
};
