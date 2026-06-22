import { LayoutChangeLogFieldsResolver } from '../../../src/layout/resolvers/layout-change-log-fields.resolver.js';
import type { LayoutMutationResolver as LayoutMutationResolverType } from '../../../src/layout/resolvers/layout-mutation.resolver.js';
import type { LayoutQueryResolver as LayoutQueryResolverType } from '../../../src/layout/resolvers/layout-query.resolver.js';
import { LayoutVersionFieldsResolver } from '../../../src/layout/resolvers/layout-version-fields.resolver.js';
import { LayoutReadService } from '../../../src/layout/services/layout-read.service.js';
import { LayoutWriteService } from '../../../src/layout/services/layout-write.service.js';
import { SectionShape } from '../../../src/prisma/generated/client.js';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

import {
  actor,
  eventId,
  layoutChangeLog,
  layoutVersion,
  seat,
  seatId,
  section,
  sectionId,
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
  RoleGuard: class RoleGuard {},
  Roles: () => () => undefined,
}));

const { LayoutMutationResolver } =
  await import('../../../src/layout/resolvers/layout-mutation.resolver.js');
const { LayoutQueryResolver } =
  await import('../../../src/layout/resolvers/layout-query.resolver.js');

describe('Layout resolvers integration', () => {
  const read = {
    getEventLayout: jest.fn(),
    getLayoutVersions: jest.fn(),
    getLatestLayoutVersion: jest.fn(),
    getLayoutChangeLog: jest.fn(),
  };
  const write = {
    saveLayoutVersion: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    autoGenerate: jest.fn(),
    duplicateTable: jest.fn(),
    cloneSection: jest.fn(),
    moveSeat: jest.fn(),
    moveSection: jest.fn(),
    moveTable: jest.fn(),
  };

  let queryResolver: LayoutQueryResolverType;
  let mutationResolver: LayoutMutationResolverType;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        LayoutQueryResolver,
        LayoutMutationResolver,
        LayoutChangeLogFieldsResolver,
        LayoutVersionFieldsResolver,
        { provide: LayoutReadService, useValue: read },
        { provide: LayoutWriteService, useValue: write },
      ],
    }).compile();

    queryResolver = moduleRef.get(LayoutQueryResolver);
    mutationResolver = moduleRef.get(LayoutMutationResolver);

    expect(moduleRef.get(LayoutChangeLogFieldsResolver)).toBeInstanceOf(
      LayoutChangeLogFieldsResolver,
    );
    expect(moduleRef.get(LayoutVersionFieldsResolver)).toBeInstanceOf(
      LayoutVersionFieldsResolver,
    );
  });

  it('resolves layout queries', async () => {
    const version = layoutVersion();
    const change = layoutChangeLog();
    read.getEventLayout.mockResolvedValue([section()]);
    read.getLayoutVersions.mockResolvedValue([version]);
    read.getLatestLayoutVersion.mockResolvedValue(version);
    read.getLayoutChangeLog.mockResolvedValue([change]);

    await expect(queryResolver.seatLayout(eventId)).resolves.toMatchObject([
      { id: sectionId },
    ]);
    await expect(queryResolver.layoutVersions(eventId)).resolves.toEqual([
      version,
    ]);
    await expect(queryResolver.latestLayoutVersion(eventId)).resolves.toEqual(
      version,
    );
    await expect(queryResolver.layoutChangeLog(eventId, 25)).resolves.toEqual([
      change,
    ]);
    expect(read.getEventLayout).toHaveBeenCalledWith(eventId);
    expect(read.getLayoutVersions).toHaveBeenCalledWith(eventId);
    expect(read.getLatestLayoutVersion).toHaveBeenCalledWith(eventId);
    expect(read.getLayoutChangeLog).toHaveBeenCalledWith(eventId, 25);
  });

  it('uses default layout change-log limit', async () => {
    read.getLayoutChangeLog.mockResolvedValue([]);

    await expect(queryResolver.layoutChangeLog(eventId)).resolves.toEqual([]);
    expect(read.getLayoutChangeLog).toHaveBeenCalledWith(eventId, 200);
  });

  it('resolves versioning and auto-layout mutations with current user id', async () => {
    const saveInput = {
      eventId,
      version: 1,
      label: 'Initial',
      data: { sections: [] },
    };
    const autoGenerateInput = {
      eventId,
      adaptiveRadius: true,
      sections: [{ name: 'Main', shape: SectionShape.CIRCLE, tables: [] }],
    };
    write.saveLayoutVersion.mockResolvedValue(layoutVersion());
    write.undo.mockResolvedValue(true);
    write.redo.mockResolvedValue(true);
    write.autoGenerate.mockResolvedValue(true);

    await expect(
      mutationResolver.saveLayoutVersion(saveInput, actor),
    ).resolves.toMatchObject({
      id: layoutVersion().id,
    });
    await expect(mutationResolver.undoLayout(eventId)).resolves.toBe(true);
    await expect(mutationResolver.redoLayout(eventId)).resolves.toBe(true);
    await expect(
      mutationResolver.autoGenerateLayout(autoGenerateInput, actor),
    ).resolves.toBe(true);

    expect(write.saveLayoutVersion).toHaveBeenCalledWith(saveInput, actor.id);
    expect(write.undo).toHaveBeenCalledWith(eventId);
    expect(write.redo).toHaveBeenCalledWith(eventId);
    expect(write.autoGenerate).toHaveBeenCalledWith(
      autoGenerateInput,
      actor.id,
    );
  });

  it('resolves layout object mutations with current user id', async () => {
    const duplicateInput = { tableId, offsetX: 10, offsetY: 20 };
    const cloneInput = { sectionId, offsetX: 10, offsetY: 20 };
    const moveSeatInput = { id: seatId, x: 100, y: 200, rotation: 30 };
    const moveSectionInput = { id: sectionId, x: 100, y: 200 };
    const moveTableInput = { id: tableId, x: 100, y: 200 };
    write.duplicateTable.mockResolvedValue(table({ id: 'table-clone' }));
    write.cloneSection.mockResolvedValue(section({ id: 'section-clone' }));
    write.moveSeat.mockResolvedValue(seat(moveSeatInput));
    write.moveSection.mockResolvedValue(section(moveSectionInput));
    write.moveTable.mockResolvedValue(table(moveTableInput));

    await expect(
      mutationResolver.duplicateTable(duplicateInput, actor),
    ).resolves.toMatchObject({
      id: 'table-clone',
    });
    await expect(
      mutationResolver.cloneSection(cloneInput, actor),
    ).resolves.toMatchObject({
      id: 'section-clone',
    });
    await expect(
      mutationResolver.moveSeat(moveSeatInput, actor),
    ).resolves.toMatchObject({
      x: 100,
      y: 200,
    });
    await expect(
      mutationResolver.moveSection(moveSectionInput, actor),
    ).resolves.toMatchObject({
      x: 100,
      y: 200,
    });
    await expect(
      mutationResolver.moveTable(moveTableInput, actor),
    ).resolves.toMatchObject({
      x: 100,
      y: 200,
    });

    expect(write.duplicateTable).toHaveBeenCalledWith(duplicateInput, actor.id);
    expect(write.cloneSection).toHaveBeenCalledWith(cloneInput, actor.id);
    expect(write.moveSeat).toHaveBeenCalledWith(moveSeatInput, actor.id);
    expect(write.moveSection).toHaveBeenCalledWith(moveSectionInput, actor.id);
    expect(write.moveTable).toHaveBeenCalledWith(moveTableInput, actor.id);
  });
});
