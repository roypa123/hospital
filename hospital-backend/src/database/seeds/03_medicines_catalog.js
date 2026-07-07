exports.seed = async function (knex) {
  // Truncate prescription items that might reference medicines first
  await knex("prescription_items").del();
  await knex("medicines").del();

  const medicinesData = [
    {
      name: "Paracetamol",
      generic_name: "Acetaminophen",
      category: "Analgesic/Antipyretic",
      strength: "500mg",
      form: "Tablet",
      is_active: true,
    },
    {
      name: "Amoxicillin",
      generic_name: "Amoxicillin",
      category: "Antibiotic",
      strength: "500mg",
      form: "Capsule",
      is_active: true,
    },
    {
      name: "Ibuprofen",
      generic_name: "Ibuprofen",
      category: "NSAID",
      strength: "400mg",
      form: "Tablet",
      is_active: true,
    },
    {
      name: "Metformin Hydrochloride",
      generic_name: "Metformin",
      category: "Antidiabetic",
      strength: "850mg",
      form: "Tablet",
      is_active: true,
    },
    {
      name: "Atorvastatin Calcium",
      generic_name: "Atorvastatin",
      category: "Cardiovascular / Lipid-lowering",
      strength: "20mg",
      form: "Tablet",
      is_active: true,
    },
    {
      name: "Omeprazole Delayed-Release",
      generic_name: "Omeprazole",
      category: "Proton Pump Inhibitor (PPI)",
      strength: "20mg",
      form: "Capsule",
      is_active: true,
    },
    {
      name: "Cetirizine Hydrochloride",
      generic_name: "Cetirizine",
      category: "Antihistamine",
      strength: "10mg",
      form: "Tablet",
      is_active: true,
    },
    {
      name: "Amlodipine Besylate",
      generic_name: "Amlodipine",
      category: "Antihypertensive / Calcium Channel Blocker",
      strength: "5mg",
      form: "Tablet",
      is_active: true,
    },
    {
      name: "Salbutamol Inhaler",
      generic_name: "Albuterol",
      category: "Bronchodilator",
      strength: "100mcg",
      form: "Inhaler",
      is_active: true,
    },
    {
      name: "Azithromycin",
      generic_name: "Azithromycin",
      category: "Antibiotic / Macrolide",
      strength: "250mg",
      form: "Tablet",
      is_active: true,
    },
  ];

  await knex("medicines").insert(medicinesData);
};
