import { SeatWriteService } from '../../dist/seat/services/seat-write.service.js';
import { SectionWriteService } from '../../dist/section/services/section-write.service.js';
import { SeatShape, SeatType } from '../../dist/prisma/generated/enums.js';
import assert from 'node:assert/strict';
import test from 'node:test';

const logger = {
  log() {
    return {
      debug() {},
      info() {},
      warn() {},
      error() {},
    };
  },
};

function seat(overrides = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    eventId: '00000000-0000-4000-8000-000000000002',
    sectionId: '00000000-0000-4000-8000-000000000003',
    tableId: null,
    label: null,
    note: null,
    number: null,
    seatType: SeatType.STANDARD,
    shape: SeatShape.CIRCLE,
    x: 0,
    y: 0,
    width: null,
    height: null,
    rotation: null,
    ...overrides,
  };
}

function section(overrides = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    eventId: '00000000-0000-4000-8000-000000000002',
    name: 'Main',
    order: 1,
    capacity: null,
    shape: 'RECTANGLE',
    x: 0,
    y: 0,
    width: null,
    height: null,
    rotation: null,
    meta: null,
    ...overrides,
  };
}

test('updateSeat persists width, height, shape and rotation when provided', async () => {
  const existing = seat();
  let updatedData;
  const service = new SeatWriteService(
    {
      seat: {
        async findUnique() {
          return existing;
        },
        async update({ data }) {
          updatedData = data;
          return { ...existing, ...data };
        },
      },
    },
    logger,
    { async logChange() {} },
    { async enqueue() {} },
  );

  const result = await service.updateSeat(
    {
      id: existing.id,
      x: 12,
      y: 34,
      rotation: 90,
      width: 40,
      height: 32,
      shape: SeatShape.RECTANGLE,
    },
    '00000000-0000-4000-8000-000000000008',
  );

  assert.equal(updatedData.x, 12);
  assert.equal(updatedData.y, 34);
  assert.equal(updatedData.rotation, 90);
  assert.equal(updatedData.width, 40);
  assert.equal(updatedData.height, 32);
  assert.equal(updatedData.shape, SeatShape.RECTANGLE);
  assert.equal(result.width, 40);
  assert.equal(result.height, 32);
  assert.equal(result.shape, SeatShape.RECTANGLE);
});

test('updateSeat leaves geometry untouched when not provided', async () => {
  const existing = seat({ width: 22, height: 22, rotation: 45 });
  let updatedData;
  const service = new SeatWriteService(
    {
      seat: {
        async findUnique() {
          return existing;
        },
        async update({ data }) {
          updatedData = data;
          return { ...existing, ...data };
        },
      },
    },
    logger,
    { async logChange() {} },
    { async enqueue() {} },
  );

  await service.updateSeat({ id: existing.id, label: 'A1' }, '00000000-0000-4000-8000-000000000008');

  assert.equal(updatedData.width, undefined);
  assert.equal(updatedData.height, undefined);
  assert.equal(updatedData.shape, undefined);
  assert.equal(updatedData.rotation, undefined);
});

test('updateSeat throws when the seat does not exist', async () => {
  const service = new SeatWriteService(
    {
      seat: {
        async findUnique() {
          return null;
        },
        async update() {
          throw new Error('must not be called');
        },
      },
    },
    logger,
    { async logChange() {} },
    { async enqueue() {} },
  );

  await assert.rejects(
    service.updateSeat({ id: '00000000-0000-4000-8000-000000000099' }, '00000000-0000-4000-8000-000000000008'),
    /not found/i,
  );
});

test('updateSection persists rotation alongside existing geometry fields', async () => {
  const existing = section({ width: 400, height: 300 });
  let updatedData;
  const service = new SectionWriteService(
    {
      section: {
        async findUnique() {
          return existing;
        },
        async update({ data }) {
          updatedData = data;
          return { ...existing, ...data };
        },
      },
    },
    logger,
    { async logChange() {} },
  );

  const result = await service.updateSection(
    { id: existing.id, width: 420, height: 320, rotation: 45 },
    '00000000-0000-4000-8000-000000000008',
  );

  assert.equal(updatedData.width, 420);
  assert.equal(updatedData.height, 320);
  assert.equal(updatedData.rotation, 45);
  assert.equal(result.rotation, 45);
});

test('updateSection leaves rotation untouched when not provided', async () => {
  const existing = section({ rotation: 90 });
  let updatedData;
  const service = new SectionWriteService(
    {
      section: {
        async findUnique() {
          return existing;
        },
        async update({ data }) {
          updatedData = data;
          return { ...existing, ...data };
        },
      },
    },
    logger,
    { async logChange() {} },
  );

  await service.updateSection(
    { id: existing.id, name: 'Renamed' },
    '00000000-0000-4000-8000-000000000008',
  );

  assert.equal(updatedData.rotation, undefined);
});

test('updateSection throws when the section does not exist', async () => {
  const service = new SectionWriteService(
    {
      section: {
        async findUnique() {
          return null;
        },
        async update() {
          throw new Error('must not be called');
        },
      },
    },
    logger,
    { async logChange() {} },
  );

  await assert.rejects(
    service.updateSection({ id: '00000000-0000-4000-8000-000000000099' }, '00000000-0000-4000-8000-000000000008'),
    /not found/i,
  );
});