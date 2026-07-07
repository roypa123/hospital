const bcrypt = require("bcrypt");

exports.seed = async function (knex) {
  // Truncate financial and pharmacy support tables
  await knex("payments").del();
  await knex("bill_items").del();
  await knex("bills").del();
  await knex("lab_tests").del();
  await knex("medicine_dispense_items").del();
  await knex("medicine_dispenses").del();
  await knex("medicine_stock").del();

  // 1. Seed Medicine Stock Levels
  const paracetamol = await knex("medicines").where({ name: "Paracetamol" }).first();
  const amoxicillin = await knex("medicines").where({ name: "Amoxicillin" }).first();
  const ibuprofen = await knex("medicines").where({ name: "Ibuprofen" }).first();

  const stock = [];
  if (paracetamol) {
    stock.push(
      // Far expiry
      {
        medicine_id: paracetamol.id,
        batch_number: "BAT-PARA-27A",
        expiry_date: "2027-12-31",
        quantity: 100,
        cost_price: 1.00,
        selling_price: 2.50,
      },
      // Near expiry (should be dispensed first!)
      {
        medicine_id: paracetamol.id,
        batch_number: "BAT-PARA-26B",
        expiry_date: "2026-11-30",
        quantity: 30,
        cost_price: 1.10,
        selling_price: 2.50,
      }
    );
  }

  if (amoxicillin) {
    stock.push({
      medicine_id: amoxicillin.id,
      batch_number: "BAT-AMOX-27C",
      expiry_date: "2027-06-30",
      quantity: 150,
      cost_price: 2.00,
      selling_price: 5.00,
    });
  }

  if (ibuprofen) {
    stock.push({
      medicine_id: ibuprofen.id,
      batch_number: "BAT-IBU-28D",
      expiry_date: "2028-03-31",
      quantity: 200,
      cost_price: 0.50,
      selling_price: 1.50,
    });
  }

  if (stock.length > 0) {
    await knex("medicine_stock").insert(stock);
  }

  // 2. Fetch role IDs for Staff
  const roles = await knex("roles").whereIn("name", ["PHARMACIST", "LAB_TECHNICIAN", "CASHIER", "NURSE"]);
  const roleMap = {};
  roles.forEach((r) => {
    roleMap[r.name] = r.id;
  });

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Clean previous staff accounts to prevent email duplication conflict
  const staffEmails = [
    "pharmacist@hospital.com",
    "labtech@hospital.com",
    "cashier@hospital.com",
    "nurse@hospital.com",
  ];
  await knex("users").whereIn("email", staffEmails).del();

  // Create users
  const staffUsers = [
    {
      first_name: "Philip",
      last_name: "Pharmacist",
      email: "pharmacist@hospital.com",
      password: passwordHash,
      email_verified: true,
    },
    {
      first_name: "Lenny",
      last_name: "Labtech",
      email: "labtech@hospital.com",
      password: passwordHash,
      email_verified: true,
    },
    {
      first_name: "Claire",
      last_name: "Cashier",
      email: "cashier@hospital.com",
      password: passwordHash,
      email_verified: true,
    },
    {
      first_name: "Nancy",
      last_name: "Nurse",
      email: "nurse@hospital.com",
      password: passwordHash,
      email_verified: true,
    },
  ];

  const createdUsers = await knex("users").insert(staffUsers).returning(["id", "email"]);
  
  const userMap = {};
  createdUsers.forEach((u) => {
    userMap[u.email] = u.id;
  });

  // Assign user roles
  const userRoles = [
    { user_id: userMap["pharmacist@hospital.com"], role_id: roleMap["PHARMACIST"] },
    { user_id: userMap["labtech@hospital.com"], role_id: roleMap["LAB_TECHNICIAN"] },
    { user_id: userMap["cashier@hospital.com"], role_id: roleMap["CASHIER"] },
    { user_id: userMap["nurse@hospital.com"], role_id: roleMap["NURSE"] },
  ];

  await knex("user_roles").insert(userRoles);
};
