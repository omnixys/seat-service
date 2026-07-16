import { PrismaClient, SeatStatus } from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const totalSeats = await prisma.seat.count();
  const sections = await prisma.section.count();
  const tables = await prisma.table.count();
  const layoutVersions = await prisma.layoutVersion.count();

  const result = {
    service: 'seat',
    checks: [
      { name: 'Sections', ok: sections > 0, count: sections },
      { name: 'Tables', ok: tables > 0, count: tables },
      { name: 'Seats', ok: totalSeats > 0, count: totalSeats },
      { name: 'Layout Versions', ok: layoutVersions > 0, count: layoutVersions },
    ],
  };

  console.log('VALIDATE_JSON:' + JSON.stringify(result));
}

main()
  .catch((e) => {
    console.error('❌ Validate failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
