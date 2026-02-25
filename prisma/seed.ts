/**
 * @license GPL-3.0-or-later
 * SEED SCRIPT – Omnixys Seat Service (FINAL ADAPTIVE AUTO-LAYOUT ENGINE)
 *
 * Features:
 * - Dynamischer Seat-Radius abhängig von seatCount
 * - Dynamischer Table-Ring abhängig von tableCount UND seatRing
 * - Section-Radius garantiert: nichts überlappt, auch bei vielen Tischen
 * - Dynamischer Abstand zwischen Sections
 * - Tables perfekt in Section positioniert (Innenkreis)
 * - Seats perfekt um Table positioniert (Außenkreis)
 *
 * Author: Caleb Gyamfi – Omnixys Technologies
 */

import {
  PrismaClient,
  SeatStatus,
  Table,
} from '../src/prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

/* ============================================================================
   CONFIG
=========================================================================== */

const EVENT_ID = 'cmlz996ya000nrbij16p2jnxk';

const SECTIONS = 6;
const TABLES_PER_SECTION = 5;
const MAX_SEATS = 400;

/* Geometry constants */
const SEAT_RADIUS = 18;
const SEAT_PADDING = 10;

const TABLE_RADIUS = 55;
const TABLE_PADDING = 40;

const SECTION_RADIUS = 55;
const SECTION_PADDING = 40;

/* ============================================================================
   GEOMETRY ENGINE
=========================================================================== */

/** Minimale Kreisbahn für Seats, abhängig von seatCount */
function computeSeatRingRadius(seatCount: number): number {
  const seatDiameter = SEAT_RADIUS * 2 + SEAT_PADDING;

  return Math.max(
    seatDiameter * 1.3,
    (seatCount * seatDiameter) / (2 * Math.PI),
  );
}

/** Minimale Kreisbahn für Tables */
function computeTableRingRadius(tableCount: number, seatRing: number): number {
  const tableDiameter = TABLE_RADIUS * 2 + TABLE_PADDING;

  const minimalRing = tableDiameter * 1.2;
  const packedRing = (tableCount * tableDiameter) / (2 * Math.PI);

  // Es muss IMMER größer sein als der Seat-Ring
  return Math.max(minimalRing, packedRing, seatRing + TABLE_RADIUS + 20);
}

/** Section muss genügend Platz für Tables + Seats haben */
function computeSectionRadius(tableRing: number, seatRing: number): number {
  return Math.max(
    300,
    tableRing + TABLE_RADIUS + seatRing + 70, // heuristische Sicherheit
  );
}

/** Abstand zwischen Sections */
function computeSectionDistance(sectionRadius: number): number {
  const sectionDiameter = SECTION_RADIUS * 2 + SECTION_PADDING;
  return sectionRadius * 2.8;
}

/* ============================================================================
   SEAT GENERATOR
=========================================================================== */
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

      x: Math.cos(angle) * seatRing,
      y: Math.sin(angle) * seatRing,
      rotation: deg + 180,

      seatType: 'STANDARD',
      status: SeatStatus.AVAILABLE,

      meta: {
        seatRing,
        seatRadius: SEAT_RADIUS,
      },
    });
  }

  return seats;
}

/* ============================================================================
   MAIN SEED
=========================================================================== */
async function main() {
  console.log('🌱 Omnixys Adaptive Auto-Layout Seed – START');

  // Seats pro Table gleichmäßig verteilt
  const seatCountPerTable = Math.ceil(
    MAX_SEATS / (SECTIONS * TABLES_PER_SECTION),
  );

  // Seat-Radius berechnen
  const EXAMPLE_SEAT_RING = computeSeatRingRadius(seatCountPerTable);

  // Table-Radius berechnen
  const EXAMPLE_TABLE_RING = computeTableRingRadius(
    TABLES_PER_SECTION,
    EXAMPLE_SEAT_RING,
  );

  // Section-Radius berechnen
  const SECTION_RADIUS = computeSectionRadius(
    EXAMPLE_TABLE_RING,
    EXAMPLE_SEAT_RING,
  );

  // Abstand zwischen Sections
  const SECTION_DISTANCE = computeSectionDistance(SECTION_RADIUS);

  const sections = [];

  /* -------------------------------------------------------
     1) Sections im Außenkreis anordnen
  ------------------------------------------------------- */
  for (let i = 0; i < SECTIONS; i++) {
    const angle = (2 * Math.PI * i) / SECTIONS;

    const sec = await prisma.section.create({
      data: {
        eventId: EVENT_ID,
        name: `Section ${i + 1}`,
        order: i + 1,

        x: Math.cos(angle) * SECTION_DISTANCE,
        y: Math.sin(angle) * SECTION_DISTANCE,

        meta: {
          shape: 'circle',
          radius: SECTION_RADIUS,
        },
      },
    });

    sections.push(sec);
  }

  console.log('✓ Sections created:', sections.length);

  /* -------------------------------------------------------
     2) Tables im Innenkreis jeder Section
  ------------------------------------------------------- */
  const tables = [];

  for (const sec of sections) {
    for (let t = 0; t < TABLES_PER_SECTION; t++) {
      const angle = (2 * Math.PI * t) / TABLES_PER_SECTION;

      const table = await prisma.table.create({
        data: {
          eventId: EVENT_ID,
          sectionId: sec.id,
          name: `${sec.name}-T${t + 1}`,
          order: t + 1,

          x: sec.x + Math.cos(angle) * EXAMPLE_TABLE_RING,
          y: sec.y + Math.sin(angle) * EXAMPLE_TABLE_RING,

          meta: {
            radius: TABLE_RADIUS,
            tableRing: EXAMPLE_TABLE_RING,
            insideSection: true,
          },
        },
      });

      tables.push(table);
    }
  }

  console.log('✓ Tables created:', tables.length);

  /* -------------------------------------------------------
     3) Seats um Tables anordnen
  ------------------------------------------------------- */
  let seatTotal = 0;

  for (const table of tables) {
    const seats = generateCircleSeats(table, seatCountPerTable);
    await prisma.seat.createMany({ data: seats });
    seatTotal += seats.length;
  }

  console.log('✓ Seats created:', seatTotal);

  /* -------------------------------------------------------
     4) Layout-Versionen generieren
  ------------------------------------------------------- */
  await prisma.layoutVersion.create({
    data: {
      eventId: EVENT_ID,
      version: 1,
      label: 'GRID Layout',
      data: { seats: [] },
    },
  });

  await prisma.layoutVersion.create({
    data: {
      eventId: EVENT_ID,
      version: 2,
      label: 'U-Form Layout',
      data: { seats: [] },
    },
  });

  await prisma.layoutVersion.create({
    data: {
      eventId: EVENT_ID,
      version: 3,
      label: 'VIP Random Layout',
      data: { seats: [] },
    },
  });

  console.log('✓ Layout Versions created');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY');
}

/* ============================================================================
   RUN
=========================================================================== */
main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
