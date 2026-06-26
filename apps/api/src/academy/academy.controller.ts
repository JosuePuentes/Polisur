import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SITOP_PERMISSIONS } from '@polisur/database';
import { AuditController } from '../audit/decorators/audit-controller.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { AuthenticatedOfficer } from '../common/interfaces/authenticated-officer.interface';
import { resolveClientIp } from '../common/utils/client-ip.util';
import { AcademyService } from './academy.service';
import {
  GraduatePromocionResult,
  GraduatedOfficer,
  Promocion,
  PromocionWithDiscentes,
} from './academy.types';
import { CreateDiscenteDto } from './dto/create-discente.dto';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';

@AuditController()
@Controller('academy')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('promociones')
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_VIEW)
  findAllPromociones(): Promise<PromocionWithDiscentes[]> {
    return this.academyService.findAllPromociones();
  }

  @Get('departamento')
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_VIEW)
  getAcademyDepartment(): Promise<{ id: string; name: string; code: string }> {
    return this.academyService.getAcademyDepartment();
  }

  @Post('promociones')
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_PROMOCIONES)
  createPromocion(
    @Body() dto: CreatePromocionDto,
  ): Promise<Promocion> {
    return this.academyService.createPromocion(dto);
  }

  @Patch('promociones/:id')
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_PROMOCIONES)
  updatePromocion(
    @Param('id') id: string,
    @Body() dto: UpdatePromocionDto,
  ): Promise<Promocion> {
    return this.academyService.updatePromocion(id, dto);
  }

  @Post('discentes')
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_DISCENTES)
  registerDiscente(
    @Body() dto: CreateDiscenteDto,
  ): Promise<GraduatedOfficer> {
    return this.academyService.registerDiscente(dto);
  }

  @Post('promociones/:id/graduar')
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_PROMOCIONES)
  graduatePromocion(
    @Param('id') id: string,
    @GetUser() officer: AuthenticatedOfficer,
    @Req() request: Request,
  ): Promise<GraduatePromocionResult> {
    return this.academyService.graduatePromocion(
      id,
      officer,
      resolveClientIp(request),
    );
  }
}
