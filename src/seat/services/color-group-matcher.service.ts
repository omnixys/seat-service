import { PrismaService } from '../../prisma/prisma.service.js';
import type { SeatColorGroupPayload } from '../models/payloads/seat-color-group.payload.js';
import { Injectable } from '@nestjs/common';

interface SeatColorGroupEntry {
  id: string;
  name: string;
  style: { background: string; foreground: string; border: string; legendIcon: string };
  matchType: string;
  invitedByValues: string[];
  priority: number;
  order: number;
  isOrphaned: boolean;
}

@Injectable()
export class ColorGroupMatcherService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Given eventId and selectedInvitedBy, returns the matched SeatColorGroup or null.
   */
  async match(eventId: string, selectedInvitedBy: string[]): Promise<SeatColorGroupPayload | null> {
    const projection = await this.prisma.eventSettingsProjection.findUnique({
      where: { eventId },
      select: { seatColorGroups: true },
    });

    if (!projection?.seatColorGroups) {
      return null;
    }

    const groups = projection.seatColorGroups as unknown as SeatColorGroupEntry[];

    if (!Array.isArray(groups) || groups.length === 0) {
      return null;
    }

    const sorted = [...groups].sort((a, b) => a.priority - b.priority);

    for (const group of sorted) {
      if (group.isOrphaned) {
        continue;
      }

      switch (group.matchType) {
        case 'NONE':
          if (selectedInvitedBy.length === 0) {
            return this.toPayload(group);
          }
          break;

        case 'SINGLE': {
          const firstValue = group.invitedByValues[0];
          if (firstValue !== undefined && selectedInvitedBy.includes(firstValue)) {
            return this.toPayload(group);
          }
          break;
        }

        case 'CUSTOM':
          if (group.invitedByValues.every((v) => selectedInvitedBy.includes(v))) {
            return this.toPayload(group);
          }
          break;

        case 'ALL':
          if (group.invitedByValues.every((v) => selectedInvitedBy.includes(v))) {
            return this.toPayload(group);
          }
          break;
      }
    }

    return null;
  }

  /**
   * Given an invitationId, resolves selectedInvitedBy from InvitationProjection
   * and matches against the event's seatColorGroups.
   */
  async matchByInvitation(
    eventId: string,
    invitationId: string | null | undefined,
  ): Promise<SeatColorGroupPayload | null> {
    if (!invitationId) {
      return null;
    }

    const invitation = await this.prisma.invitationProjection.findUnique({
      where: { invitationId },
      select: { selectedInvitedBy: true },
    });

    if (!invitation?.selectedInvitedBy) {
      return null;
    }

    const selectedInvitedBy = invitation.selectedInvitedBy as string[];

    return this.match(eventId, selectedInvitedBy);
  }

  private toPayload(group: SeatColorGroupEntry): SeatColorGroupPayload {
    return {
      id: group.id,
      name: group.name,
      style: {
        background: group.style.background,
        foreground: group.style.foreground,
        border: group.style.border,
        legendIcon: group.style.legendIcon,
      },
      matchType: group.matchType as SeatColorGroupPayload['matchType'],
      invitedByValues: group.invitedByValues,
      priority: group.priority,
      order: group.order,
      isOrphaned: group.isOrphaned,
    };
  }
}
