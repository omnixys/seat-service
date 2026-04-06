/**
 * @license GPL-3.0-or-later
 * Omnixys Seat Service Seed
 *
 * Adaptive Seat Layout Generator
 */

import {
  PrismaClient,
  SeatStatus,
  SeatType,
  Table,
} from '../src/prisma/generated/client.js';

import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

/* ============================================================
   CONFIG
============================================================ */

const EVENT_ID = 'cmnkom96a000bgjijcyk02mpf';

const SECTIONS = 6;
const TABLES_PER_SECTION = 5;
const MAX_SEATS = 400;

const SEAT_RADIUS = 18;
const SEAT_PADDING = 10;

const TABLE_RADIUS = 55;
const TABLE_PADDING = 40;

/* ============================================================
   GEOMETRY ENGINE
============================================================ */

function computeSeatRingRadius(seatCount: number): number {
  const seatDiameter = SEAT_RADIUS * 2 + SEAT_PADDING;

  return Math.max(
    seatDiameter * 1.3,
    (seatCount * seatDiameter) / (2 * Math.PI),
  );
}

function computeTableRingRadius(tableCount: number, seatRing: number): number {
  const tableDiameter = TABLE_RADIUS * 2 + TABLE_PADDING;

  const minimalRing = tableDiameter * 1.2;
  const packedRing = (tableCount * tableDiameter) / (2 * Math.PI);

  return Math.max(minimalRing, packedRing, seatRing + TABLE_RADIUS + 20);
}

function computeSectionRadius(tableRing: number, seatRing: number): number {
  return Math.max(300, tableRing + TABLE_RADIUS + seatRing + 70);
}

function computeSectionDistance(sectionRadius: number): number {
  return sectionRadius * 2.8;
}

/* ============================================================
   SEAT GENERATOR
============================================================ */

function generateCircleSeats(table: Table, count: number) {
  const seatRing = computeSeatRingRadius(count);
  const step = (2 * Math.PI) / count;

  const seats = [];

  for (let i = 0; i < count; i++) {
    const angle = i * step;
    const deg = (angle * 180) / Math.PI;

    seats.push({
      eventId: table.eventId,
      sectionId: table.sectionId,
      tableId: table.id,

      number: i + 1,
      label: `S-${table.name}-${i + 1}`,

      x: table.x + Math.cos(angle) * seatRing,
      y: table.y + Math.sin(angle) * seatRing,

      rotation: deg + 180,

      seatType: SeatType.STANDARD,
      status: SeatStatus.AVAILABLE,

      meta: {
        seatRing,
        seatRadius: SEAT_RADIUS,
      },
    });
  }

  return seats;
}

/* ============================================================
   MAIN SEED
============================================================ */

async function main() {
  console.log('🌱 Omnixys Seat Layout Seed');

  const seatsPerTable = Math.ceil(MAX_SEATS / (SECTIONS * TABLES_PER_SECTION));

  const seatRing = computeSeatRingRadius(seatsPerTable);

  const tableRing = computeTableRingRadius(TABLES_PER_SECTION, seatRing);

  const sectionRadius = computeSectionRadius(tableRing, seatRing);

  const sectionDistance = computeSectionDistance(sectionRadius);

  const sections = [];

  /* -------------------------------------------------------
     Sections
  ------------------------------------------------------- */

  for (let i = 0; i < SECTIONS; i++) {
    const angle = (2 * Math.PI * i) / SECTIONS;

    const section = await prisma.section.create({
      data: {
        eventId: EVENT_ID,
        name: `Section ${i + 1}`,
        order: i + 1,

        x: Math.cos(angle) * sectionDistance,
        y: Math.sin(angle) * sectionDistance,

        meta: {
          shape: 'circle',
          radius: sectionRadius,
        },
      },
    });

    sections.push(section);
  }

  console.log('✓ Sections:', sections.length);

  /* -------------------------------------------------------
     Tables
  ------------------------------------------------------- */

  const tables: Table[] = [];

  for (const section of sections) {
    for (let t = 0; t < TABLES_PER_SECTION; t++) {
      const angle = (2 * Math.PI * t) / TABLES_PER_SECTION;

      const table = await prisma.table.create({
        data: {
          eventId: EVENT_ID,
          sectionId: section.id,
          name: `${section.name}-T${t + 1}`,
          order: t + 1,

          x: section.x + Math.cos(angle) * tableRing,
          y: section.y + Math.sin(angle) * tableRing,

          meta: {
            radius: TABLE_RADIUS,
            tableRing,
          },
        },
      });

      tables.push(table);
    }
  }

  console.log('✓ Tables:', tables.length);

  /* -------------------------------------------------------
     Seats
  ------------------------------------------------------- */

  let seatTotal = 0;

  for (const table of tables) {
    const seats = generateCircleSeats(table, seatsPerTable);

    await prisma.seat.createMany({
      data: seats,
    });

    seatTotal += seats.length;
  }

  console.log('✓ Seats:', seatTotal);

  /* -------------------------------------------------------
     Layout Versions
  ------------------------------------------------------- */

  await prisma.layoutVersion.create({
    data: {
      eventId: EVENT_ID,
      version: 1,
      label: 'Auto Generated Layout',

      data: {
        sections: sections.length,
        tables: tables.length,
        seats: seatTotal,
      },
    },
  });

  console.log('✓ LayoutVersion created');
  console.log('🎉 Seed completed');
}

/* ============================================================
   RUN
============================================================ */

main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
