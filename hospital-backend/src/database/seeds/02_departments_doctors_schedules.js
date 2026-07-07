const bcrypt = require("bcrypt");

exports.seed = async function (knex) {
  // Clear dependent tables first
  await knex("doctor_schedules").del();
  await knex("doctors").del();
  await knex("departments").del();

  // 1. Seed Departments
  const departmentsData = [
    { name: "General Medicine", code: "GMED", description: "Primary care, health checks, general illnesses" },
    { name: "Cardiology", code: "CARD", description: "Heart health and cardiovascular system diagnostics" },
    { name: "Pediatrics", code: "PED", description: "Infant, child, and adolescent medical care" },
    { name: "Dermatology", code: "DERM", description: "Skin, hair, and nails treatment" },
  ];

  const departments = await knex("departments")
    .insert(departmentsData)
    .returning(["id", "code"]);

  const deptMap = {};
  departments.forEach((d) => {
    deptMap[d.code] = d.id;
  });

  // 2. Fetch DOCTOR role ID
  const doctorRole = await knex("roles").where({ name: "DOCTOR" }).first();
  if (!doctorRole) {
    throw new Error("DOCTOR role must be seeded first in 01_roles_permissions.js");
  }

  // Define doctor users to seed
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // We should check if these users already exist or clean them up.
  // To avoid duplicates, let's delete them if they exist.
  await knex("users")
    .whereIn("email", ["jane.smith@hospital.com", "robert.jones@hospital.com"])
    .del();

  // Seed Users
  const usersData = [
    {
      first_name: "Jane",
      last_name: "Smith",
      email: "jane.smith@hospital.com",
      password: passwordHash,
      email_verified: true,
    },
    {
      first_name: "Robert",
      last_name: "Jones",
      email: "robert.jones@hospital.com",
      password: passwordHash,
      email_verified: true,
    },
  ];

  const users = await knex("users").insert(usersData).returning(["id", "email"]);
  
  const userMap = {};
  users.forEach((u) => {
    userMap[u.email] = u.id;
  });

  // Link users to DOCTOR role
  const userRolesData = users.map((u) => ({
    user_id: u.id,
    role_id: doctorRole.id,
  }));
  await knex("user_roles").insert(userRolesData);

  // 3. Seed Doctors
  const doctorsData = [
    {
      user_id: userMap["jane.smith@hospital.com"],
      department_id: deptMap["PED"],
      specialization: "Pediatric Cardiologist",
      qualification: "MD in Pediatrics, Fellow in Cardiology",
      consultation_fee: 150.0,
      room_number: "Room 102",
      experience_years: 12,
      license_number: "LIC-PED-998877",
    },
    {
      user_id: userMap["robert.jones@hospital.com"],
      department_id: deptMap["CARD"],
      specialization: "Interventional Cardiologist",
      qualification: "MD, DM in Cardiology",
      consultation_fee: 200.0,
      room_number: "Room 305",
      experience_years: 18,
      license_number: "LIC-CARD-554433",
    },
  ];

  const doctors = await knex("doctors").insert(doctorsData).returning(["id", "user_id"]);
  
  const docMap = {};
  doctors.forEach((d) => {
    if (d.user_id === userMap["jane.smith@hospital.com"]) docMap["jane"] = d.id;
    if (d.user_id === userMap["robert.jones@hospital.com"]) docMap["robert"] = d.id;
  });

  // 4. Seed Doctor Schedules
  const schedulesData = [
    // Dr. Jane: Mondays (1), Wednesdays (3), Fridays (5) 09:00:00 to 12:00:00, slot duration 30m
    {
      doctor_id: docMap["jane"],
      day_of_week: 1,
      start_time: "09:00:00",
      end_time: "12:00:00",
      slot_duration: 30,
    },
    {
      doctor_id: docMap["jane"],
      day_of_week: 3,
      start_time: "09:00:00",
      end_time: "12:00:00",
      slot_duration: 30,
    },
    {
      doctor_id: docMap["jane"],
      day_of_week: 5,
      start_time: "09:00:00",
      end_time: "12:00:00",
      slot_duration: 30,
    },
    // Dr. Robert: Tuesdays (2), Thursdays (4) 13:00:00 to 17:00:00, slot duration 30m
    {
      doctor_id: docMap["robert"],
      day_of_week: 2,
      start_time: "13:00:00",
      end_time: "17:00:00",
      slot_duration: 30,
    },
    {
      doctor_id: docMap["robert"],
      day_of_week: 4,
      start_time: "13:00:00",
      end_time: "17:00:00",
      slot_duration: 30,
    },
  ];

  await knex("doctor_schedules").insert(schedulesData);
};
