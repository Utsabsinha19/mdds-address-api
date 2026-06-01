const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {

  const india = await prisma.country.create({
    data: {
      code: "IN",
      name: "India"
    }
  });

  const maharashtra = await prisma.state.create({
    data: {
      code: "27",
      name: "Maharashtra",
      countryId: india.id
    }
  });

  const nandurbar = await prisma.district.create({
    data: {
      code: "497",
      name: "Nandurbar",
      stateId: maharashtra.id
    }
  });

  const akkalkuwa = await prisma.subDistrict.create({
    data: {
      code: "3950",
      name: "Akkalkuwa",
      districtId: nandurbar.id
    }
  });

  await prisma.village.createMany({
    data: [
      {
        code: "525002",
        name: "Manibeli",
        subDistrictId: akkalkuwa.id
      },
      {
        code: "525003",
        name: "Dhankhedi",
        subDistrictId: akkalkuwa.id
      },
      {
        code: "525004",
        name: "Chimalkhadi",
        subDistrictId: akkalkuwa.id
      },
      {
        code: "525005",
        name: "Sinduri",
        subDistrictId: akkalkuwa.id
      }
    ]
  });

  console.log("Sample Data Imported Successfully");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });