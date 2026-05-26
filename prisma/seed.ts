/**
 * @license GPL-3.0-or-later
 * Omnixys Seat Service Seed
 *
 * Multi Event Adaptive Seat Layout Generator
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
   EVENTS CONFIG
============================================================ */

const LAYOUTS = [
  {
    eventId: 'b45e1644-70ec-4a30-8b8b-ffbcb2302877',
    label: 'The Future Experience',

    sections: 5,
    tablesPerSection: 2,
    maxSeats: 50,
  },

  {
    eventId: 'd974fea7-3a32-4ba3-bee3-779715c24090',
    label: 'Wedding Root',

    sections: 6,
    tablesPerSection: 5,
    maxSeats: 300,
  },

  {
    eventId: '36a65807-48f8-4a41-b285-c63d2cc7286f',
    label: 'Wedding Ceremony',

    sections: 1,
    tablesPerSection: 1,
    maxSeats: 10,
  },

  {
    eventId: '8bd5664d-bd22-4ee7-af59-8f4c2422b515',
    label: 'Wedding Reception',

    sections: 6,
    tablesPerSection: 5,
    maxSeats: 300,
  },
];

/* ============================================================
   GEOMETRY CONFIG
============================================================ */

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

function computeTableRingRadius(
  tableCount: number,
  seatRing: number,
): number {
  const tableDiameter = TABLE_RADIUS * 2 + TABLE_PADDING;

  const minimalRing = tableDiameter * 1.2;
  const packedRing = (tableCount * tableDiameter) / (2 * Math.PI);

  return Math.max(minimalRing, packedRing, seatRing + TABLE_RADIUS + 20);
}

function computeSectionRadius(
  tableRing: number,
  seatRing: number,
): number {
  return Math.max(
    300,
    tableRing + TABLE_RADIUS + seatRing + 70,
  );
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
   EVENT LAYOUT GENERATOR
============================================================ */

async function generateEventLayout(layout: {
  eventId: string;
  label: string;

  sections: number;
  tablesPerSection: number;
  maxSeats: number;
}) {
  console.log(`\n🌱 Generating layout for ${layout.label}`);

  const seatsPerTable = Math.ceil(
    layout.maxSeats /
      (layout.sections * layout.tablesPerSection),
  );

  const seatRing = computeSeatRingRadius(seatsPerTable);

  const tableRing = computeTableRingRadius(
    layout.tablesPerSection,
    seatRing,
  );

  const sectionRadius = computeSectionRadius(
    tableRing,
    seatRing,
  );

  const sectionDistance =
    computeSectionDistance(sectionRadius);

  const sections = [];

  /* -------------------------------------------------------
     Sections
  ------------------------------------------------------- */

  for (let i = 0; i < layout.sections; i++) {
    const angle =
      (2 * Math.PI * i) / layout.sections;

    const section = await prisma.section.create({
      data: {
        eventId: layout.eventId,

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

  console.log(`✓ Sections: ${sections.length}`);

  /* -------------------------------------------------------
     Tables
  ------------------------------------------------------- */

  const tables: Table[] = [];

  for (const section of sections) {
    for (
      let t = 0;
      t < layout.tablesPerSection;
      t++
    ) {
      const angle =
        (2 * Math.PI * t) /
        layout.tablesPerSection;

      const table = await prisma.table.create({
        data: {
          eventId: layout.eventId,

          sectionId: section.id,

          name: `${section.name}-T${t + 1}`,

          order: t + 1,

          x:
            section.x +
            Math.cos(angle) * tableRing,

          y:
            section.y +
            Math.sin(angle) * tableRing,

          meta: {
            radius: TABLE_RADIUS,
            tableRing,
          },
        },
      });

      tables.push(table);
    }
  }

  console.log(`✓ Tables: ${tables.length}`);

  /* -------------------------------------------------------
     Seats
  ------------------------------------------------------- */

  let seatTotal = 0;

  for (const table of tables) {
    const seats = generateCircleSeats(
      table,
      seatsPerTable,
    );

    await prisma.seat.createMany({
      data: seats,
    });

    seatTotal += seats.length;
  }

  console.log(`✓ Seats: ${seatTotal}`);

  /* -------------------------------------------------------
     Layout Version
  ------------------------------------------------------- */

  await prisma.layoutVersion.create({
    data: {
      eventId: layout.eventId,

      version: 1,

      label: `${layout.label} Auto Generated Layout`,

      data: {
        sections: sections.length,
        tables: tables.length,
        seats: seatTotal,
      },
    },
  });

  console.log('✓ LayoutVersion created');
}

/* ============================================================
   MAIN
============================================================ */

async function main() {
  console.log('🌱 Omnixys Multi Event Seat Seed');

  for (const layout of LAYOUTS) {
    await generateEventLayout(layout);
  }

  console.log('\n🎉 All layouts generated');
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