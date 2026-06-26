import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PrismaService, RangeRole } from '@polisur/database';
import type { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  PanicAlertPayload,
  TACTICAL_EVENTS,
  TACTICAL_WS_AUTHORIZED_ROLES,
  TacticalIncidentPayload,
} from './tactical.types';

const GLOBAL_OPS_ROOM = 'global:ops';
const deptRoom = (departmentId: string): string => `dept:${departmentId}`;
const squadRoom = (squadId: string): string => `squad:${squadId}`;

function resolveCorsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

  if (raw.includes(',')) {
    return raw.split(',').map((origin) => origin.trim());
  }

  return raw;
}

function extractHandshakeToken(client: Socket): string | null {
  const authToken = client.handshake.auth?.token;

  if (typeof authToken === 'string' && authToken.length > 0) {
    return authToken;
  }

  const authorization = client.handshake.headers.authorization;

  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return null;
}

@WebSocketGateway({
  namespace: '/tactical',
  cors: {
    origin: resolveCorsOrigins(),
    credentials: true,
  },
})
export class TacticalGateway implements OnGatewayConnection {
  private readonly logger = new Logger(TacticalGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = extractHandshakeToken(client);

    if (!token) {
      this.logger.warn('Conexión WS rechazada: token ausente');
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const officer = await this.prisma.officer.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          rangeRole: true,
          departmentId: true,
          squadId: true,
          isSuspended: true,
        },
      });

      if (
        !officer ||
        officer.isSuspended ||
        !TACTICAL_WS_AUTHORIZED_ROLES.has(officer.rangeRole)
      ) {
        this.logger.warn(
          `Conexión WS rechazada: rol no autorizado (${officer?.rangeRole ?? 'desconocido'})`,
        );
        client.disconnect(true);
        return;
      }

      if (
        officer.rangeRole !== payload.rangeRole ||
        officer.departmentId !== payload.departmentId ||
        (officer.squadId ?? null) !== (payload.squadId ?? null)
      ) {
        this.logger.warn('Conexión WS rechazada: token desincronizado con DB');
        client.disconnect(true);
        return;
      }

      await client.join(deptRoom(officer.departmentId));

      if (officer.rangeRole === RangeRole.SUPER_ADMIN) {
        await client.join(GLOBAL_OPS_ROOM);
      }

      if (officer.squadId) {
        await client.join(squadRoom(officer.squadId));
      }

      client.data.officerId = officer.id;
      client.data.rangeRole = officer.rangeRole;
      client.data.departmentId = officer.departmentId;
      this.logger.debug(
        `Cliente táctico autenticado: ${officer.id} (${officer.rangeRole})`,
      );
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Token JWT inválido o expirado';
      this.logger.warn(`Conexión WS rechazada: ${reason}`);
      client.disconnect(true);
    }
  }

  private emitScoped(
    event: string,
    payload: TacticalIncidentPayload,
    logMessage: string,
  ): void {
    const room = deptRoom(payload.department.id);
    this.server.to(room).to(GLOBAL_OPS_ROOM).emit(event, payload);
    this.logger.log(`${logMessage} → room ${room}`);
  }

  broadcastIncidentCreated(payload: TacticalIncidentPayload): void {
    this.emitScoped(
      TACTICAL_EVENTS.INCIDENT_CREATED,
      payload,
      `Broadcast incident:created ${payload.code} (${payload.origen})`,
    );
  }

  broadcastPanicAlert(payload: PanicAlertPayload): void {
    this.emitScoped(
      TACTICAL_EVENTS.PANIC_ALERT,
      payload,
      `Broadcast panic:alert ${payload.code} @ ${payload.cuadrante}`,
    );
    this.emitScoped(
      TACTICAL_EVENTS.INCIDENT_CREATED,
      payload,
      `Broadcast incident:created (pánico) ${payload.code}`,
    );
  }
}
