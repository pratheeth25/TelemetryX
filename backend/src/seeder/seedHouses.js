
const House = require("../models/House");
const { generateActivationCode } = require("../models/House");

async function seedHouses() {
  const existing = await House.countDocuments({ isSeeded: true });
  if (existing >= 100) {
    console.log(`[Seeder] ${existing} houses already seeded — skipping.`);
    return;
  }

  const bulk = [];
  for (let i = 1; i <= 100; i++) {
    const houseNumber = `H${String(i).padStart(3, "0")}`;
    const exists = await House.exists({ houseNumber });
    if (!exists) {
      bulk.push({
        houseNumber,
        houseName:      `House ${houseNumber}`,
        activationCode: generateActivationCode(8),
        isSeeded:       true,
        ownerId:        null,
      });
    }
  }

  if (bulk.length > 0) {
    await House.insertMany(bulk, { ordered: false });
    console.log(`[Seeder] Created ${bulk.length} houses (H001–H100).`);
  } else {
    console.log("[Seeder] All 100 houses already exist.");
  }
}

module.exports = { seedHouses };
