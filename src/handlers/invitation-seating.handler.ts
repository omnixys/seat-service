import { PrismaService } from '../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';
import type { InvitationSeatingInfoUpdatedDTO } from '@omnixys/contracts-ts';
import {
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
  type IKafkaEventContext,
} from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { TraceRunner } from '@omnixys/observability-ts';

@KafkaEventHandler('invitation')
@Injectable()
export class InvitationSeatingHandler {
  private readonly logger;

  constructor(
    private readonly omnixysLogger: OmnixysLogger,
    private readonly prisma: PrismaService,
  ) {
    this.logger = this.omnixysLogger.log(this.constructor.name, 'service:seat');
  }

  @KafkaEvent(KafkaTopics.invitation.seatingInfoUpdated)
  async handleSeatingInfoUpdated(
    payload: InvitationSeatingInfoUpdatedDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    return TraceRunner.run(
      '[HANDLER] invitation.seating.info.updated',
      async () => {
        const { invitationId, guestId, selectedInvitedBy } = payload;

        await this.prisma.invitationProjection.upsert({
          where: { invitationId },
          create: {
            invitationId,
            guestId: guestId || null,
            selectedInvitedBy,
          } satisfies Record<string, unknown>,
          update: {
            guestId: guestId || null,
            selectedInvitedBy,
          } satisfies Record<string, unknown>,
        });

        this.logger.debug('Invitation projection updated: %o', {
          invitationId,
        });
      },
    );
  }
}
