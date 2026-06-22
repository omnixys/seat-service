import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { TableFieldsResolver } from '../../../src/table/resolvers/table-fields.resolver.js';
import type { TableMutationResolver as TableMutationResolverType } from '../../../src/table/resolvers/table-mutation.resolver.js';
import type { TableQueryResolver as TableQueryResolverType } from '../../../src/table/resolvers/table-query.resolver.js';
import { TableReadService } from '../../../src/table/services/table-read.service.js';
import { TableWriteService } from '../../../src/table/services/table-write.service.js';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

import {
  actor,
  eventId,
  seat,
  section,
  sectionId,
  table,
  tableId,
  tablePayload,
} from './resolver-test.fixtures.js';

const mockSecurity = jest as unknown as {
  unstable_mockModule: (
    moduleName: string,
    factory: () => Record<string, unknown>,
  ) => Promise<void>;
};

await mockSecurity.unstable_mockModule('@omnixys/security', () => ({
  CookieAuthGuard: class CookieAuthGuard {
    canActivate(): boolean {
      return true;
    }
  },
  CurrentUser: () => (): undefined => undefined,
  CurrentUserData: class CurrentUserData {},
  RoleGuard: class RoleGuard {},
  Roles: () => () => undefined,
}));

const { TableMutationResolver } =
  await import('../../../src/table/resolvers/table-mutation.resolver.js');
const { TableQueryResolver } =
  await import('../../../src/table/resolvers/table-query.resolver.js');

describe('Table resolvers integration', () => {
  const read = {
    getTablesBySection: jest.fn(),
    getTableById: jest.fn(),
    getEventTables: jest.fn(),
  };
  const write = {
    createTable: jest.fn(),
    updateTable: jest.fn(),
    deleteTable: jest.fn(),
    renameTable: jest.fn(),
    bulkRenameTables: jest.fn(),
  };
  const prisma = {
    section: { findUnique: jest.fn() },
    seat: { findMany: jest.fn() },
  };

  let queryResolver: TableQueryResolverType;
  let mutationResolver: TableMutationResolverType;
  let fieldsResolver: TableFieldsResolver;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        TableQueryResolver,
        TableMutationResolver,
        TableFieldsResolver,
        { provide: TableReadService, useValue: read },
        { provide: TableWriteService, useValue: write },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    queryResolver = moduleRef.get(TableQueryResolver);
    mutationResolver = moduleRef.get(TableMutationResolver);
    fieldsResolver = moduleRef.get(TableFieldsResolver);
  });

  it('resolves table queries', async () => {
    const payload = table();
    read.getTablesBySection.mockResolvedValue([payload]);
    read.getTableById.mockResolvedValue(payload);
    read.getEventTables.mockResolvedValue([payload]);

    await expect(queryResolver.tablesBySection(sectionId)).resolves.toEqual([
      payload,
    ]);
    await expect(queryResolver.table(tableId)).resolves.toEqual(payload);
    await expect(queryResolver.eventTables(eventId)).resolves.toEqual([
      payload,
    ]);
    expect(read.getTablesBySection).toHaveBeenCalledWith(sectionId);
    expect(read.getTableById).toHaveBeenCalledWith(tableId);
    expect(read.getEventTables).toHaveBeenCalledWith(eventId);
  });

  it('resolves table fields through Prisma', async () => {
    prisma.section.findUnique.mockResolvedValue(section());
    prisma.seat.findMany.mockResolvedValue([seat()]);

    await expect(fieldsResolver.section(tablePayload())).resolves.toMatchObject(
      {
        id: sectionId,
      },
    );
    await expect(fieldsResolver.seats(tablePayload())).resolves.toMatchObject([
      { id: seat().id, tableId },
    ]);
    expect(prisma.section.findUnique).toHaveBeenCalledWith({
      where: { id: sectionId },
    });
    expect(prisma.seat.findMany).toHaveBeenCalledWith({
      where: { tableId },
      orderBy: { number: 'asc' },
    });
  });

  it('returns null-safe field errors for missing section', async () => {
    prisma.section.findUnique.mockResolvedValue(null);

    await expect(fieldsResolver.section(tablePayload())).rejects.toThrow(
      'section was not found',
    );
  });

  it('resolves table mutations with current user id', async () => {
    const created = table({ name: 'Dinner' });
    const createInput = { eventId, sectionId, name: 'Dinner' };
    const updateInput = { id: tableId, name: 'Dinner Updated' };
    const renameInput = { tableId, newName: 'Dinner Renamed' };
    const bulkInput = [renameInput];
    write.createTable.mockResolvedValue(created);
    write.updateTable.mockResolvedValue(table(updateInput));
    write.deleteTable.mockResolvedValue(true);
    write.renameTable.mockResolvedValue({ success: true, affectedSeats: 3 });
    write.bulkRenameTables.mockResolvedValue({
      affectedTables: 1,
      affectedSeats: 3,
      conflicts: [],
    });

    await expect(
      mutationResolver.createTable(createInput, actor),
    ).resolves.toEqual(created);
    await expect(
      mutationResolver.updateTable(updateInput, actor),
    ).resolves.toMatchObject(updateInput);
    await expect(mutationResolver.deleteTable(tableId, actor)).resolves.toBe(
      true,
    );
    await expect(
      mutationResolver.renameTable(renameInput, actor),
    ).resolves.toMatchObject({
      success: true,
    });
    await expect(
      mutationResolver.bulkRenameTables(bulkInput, actor),
    ).resolves.toMatchObject({
      success: true,
      affectedTables: 1,
      affectedSeats: 3,
    });

    expect(write.createTable).toHaveBeenCalledWith(createInput, actor.id);
    expect(write.updateTable).toHaveBeenCalledWith(updateInput, actor.id);
    expect(write.deleteTable).toHaveBeenCalledWith(tableId, actor.id);
    expect(write.renameTable).toHaveBeenCalledWith(renameInput, actor.id);
    expect(write.bulkRenameTables).toHaveBeenCalledWith(bulkInput, actor.id);
  });
});
