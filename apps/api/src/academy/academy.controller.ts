import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
  Promocion,
  PromocionWithDiscentes,
} from './academy.types';
import { CreateDiscenteDto } from './dto/create-discente.dto';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { AcademyAccessGuard } from './guards/academy-access.guard';
import { DiscenteFilesInterceptor } from './interceptors/discente-files.interceptor';

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
  @UseGuards(AcademyAccessGuard)
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_PROMOCIONES)
  createPromocion(
    @Body() dto: CreatePromocionDto,
  ): Promise<Promocion> {
    return this.academyService.createPromocion(dto);
  }

  @Patch('promociones/:id')
  @UseGuards(AcademyAccessGuard)
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_PROMOCIONES)
  updatePromocion(
    @Param('id') id: string,
    @Body() dto: UpdatePromocionDto,
  ): Promise<Promocion> {
    return this.academyService.updatePromocion(id, dto);
  }

  @Post('discentes')
  @UseGuards(AcademyAccessGuard)
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_DISCENTES)
  @UseInterceptors(DiscenteFilesInterceptor())
  registerDiscente(
    @Body() dto: CreateDiscenteDto,
    @Req() request: { files?: Record<string, Express.Multer.File[]> },
  ): Promise<unknown> {
    return this.academyService.registerDiscente(dto, request.files);
  }

  @Get('discentes/files/:filename')
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_VIEW)
  async streamDiscenteFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.academyService.streamDiscenteFile(filename, res);
  }

  @Get('discentes/:id')
  @RequirePermissions(SITOP_PERMISSIONS.ACADEMY_VIEW)
  getDiscente(@Param('id') id: string): Promise<unknown> {
    return this.academyService.getDiscenteDetail(id);
  }

  @Post('promociones/:id/graduar')
  @UseGuards(AcademyAccessGuard)
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
