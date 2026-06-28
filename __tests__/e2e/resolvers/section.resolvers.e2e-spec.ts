import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { SectionFieldsResolver } from '../../../src/section/resolvers/section-fields.resolver.js';
import type { SectionMutationResolver as SectionMutationResolverType } from '../../../src/section/resolvers/section-mutation.resolver.js';
import type { SectionQueryResolver as SectionQueryResolverType } from '../../../src/section/resolvers/section-query.resolver.js';
import { SectionReadService } from '../../../src/section/services/section-read.service.js';
import { SectionWriteService } from '../../../src/section/services/section-write.service.js';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

import {
  actor,
  eventId,
  seat,
  section,
  sectionId,
  sectionPayload,
  table,
  tableId,
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
  EventAccessDeniedException: class EventAccessDeniedException extends Error {},
  EventRoleGuard: class EventRoleGuard {
    canActivate(): boolean {
      return true;
    }
  },
  EventRoleResolver: class EventRoleResolver {},
  EventRoles: () => () => undefined,
  RoleGuard: class RoleGuard {},
  Roles: () => () => undefined,
  extractEventId: () => undefined,
  isOwnerOrEventAdmin: () => true,
}));

const { SectionMutationResolver } =
  await import('../../../src/section/resolvers/section-mutation.resolver.js');
const { SectionQueryResolver } =
  await import('../../../src/section/resolvers/section-query.resolver.js');

describe('Section resolvers integration', () => {
  const read = {
    getEventSections: jest.fn(),
    getSectionById: jest.fn(),
  };
  const write = {
    createSection: jest.fn(),
    updateSection: jest.fn(),
    deleteSection: jest.fn(),
    renameSection: jest.fn(),
    bulkRenameSections: jest.fn(),
  };
  const prisma = {
    table: { findMany: jest.fn() },
    seat: { findMany: jest.fn() },
  };

  let queryResolver: SectionQueryResolverType;
  let mutationResolver: SectionMutationResolverType;
  let fieldsResolver: SectionFieldsResolver;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SectionQueryResolver,
        SectionMutationResolver,
        SectionFieldsResolver,
        { provide: SectionReadService, useValue: read },
        { provide: SectionWriteService, useValue: write },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    queryResolver = moduleRef.get(SectionQueryResolver);
    mutationResolver = moduleRef.get(SectionMutationResolver);
    fieldsResolver = moduleRef.get(SectionFieldsResolver);
  });

  it('resolves section queries', async () => {
    const payload = section();
    read.getEventSections.mockResolvedValue([payload]);
    read.getSectionById.mockResolvedValue(payload);

    await expect(queryResolver.sections(eventId)).resolves.toEqual([payload]);
    await expect(queryResolver.section(sectionId)).resolves.toEqual(payload);
    expect(read.getEventSections).toHaveBeenCalledWith(eventId);
    expect(read.getSectionById).toHaveBeenCalledWith(sectionId);
  });

  it('resolves section fields through Prisma', async () => {
    prisma.table.findMany.mockResolvedValue([table()]);
    prisma.seat.findMany.mockResolvedValue([seat({ tableId: null })]);

    await expect(
      fieldsResolver.tables(sectionPayload()),
    ).resolves.toMatchObject([{ id: tableId, sectionId }]);
    await expect(fieldsResolver.seats(sectionPayload())).resolves.toMatchObject(
      [{ id: seat().id, tableId: undefined }],
    );
    expect(prisma.table.findMany).toHaveBeenCalledWith({
      where: { sectionId },
      orderBy: { order: 'asc' },
    });
    expect(prisma.seat.findMany).toHaveBeenCalledWith({
      where: { sectionId, tableId: null },
      orderBy: { number: 'asc' },
    });
  });

  it('resolves section mutations with current user id', async () => {
    const created = section({ name: 'VIP' });
    const createInput = { eventId, name: 'VIP' };
    const updateInput = { id: sectionId, name: 'Main Updated' };
    const renameInput = { sectionId, newName: 'Main Renamed' };
    const bulkInput = [renameInput];
    write.createSection.mockResolvedValue(created);
    write.updateSection.mockResolvedValue(section(updateInput));
    write.deleteSection.mockResolvedValue(true);
    write.renameSection.mockResolvedValue({ success: true, affectedSeats: 2 });
    write.bulkRenameSections.mockResolvedValue({
      affectedSections: 1,
      affectedSeats: 2,
      conflicts: [],
    });

    await expect(
      mutationResolver.createSection(createInput, actor),
    ).resolves.toEqual(created);
    await expect(
      mutationResolver.updateSection(updateInput, actor),
    ).resolves.toMatchObject(updateInput);
    await expect(
      mutationResolver.deleteSection(sectionId, actor),
    ).resolves.toBe(true);
    await expect(
      mutationResolver.renameSection(renameInput, actor),
    ).resolves.toMatchObject({
      success: true,
    });
    await expect(
      mutationResolver.bulkRenameSections(bulkInput, actor),
    ).resolves.toMatchObject({
      success: true,
      affectedSections: 1,
      affectedSeats: 2,
    });

    expect(write.createSection).toHaveBeenCalledWith(createInput, actor.id);
    expect(write.updateSection).toHaveBeenCalledWith(updateInput, actor.id);
    expect(write.deleteSection).toHaveBeenCalledWith(sectionId, actor.id);
    expect(write.renameSection).toHaveBeenCalledWith(renameInput, actor.id);
    expect(write.bulkRenameSections).toHaveBeenCalledWith(bulkInput, actor.id);
  });
});
