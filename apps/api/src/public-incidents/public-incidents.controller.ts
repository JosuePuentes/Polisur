import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  CreatePublicDenunciaDto,
  PublicDenunciaResponseDto,
} from './dto/create-public-denuncia.dto';
import {
  CreatePanicAlertDto,
  PanicAlertResponseDto,
} from './dto/create-panic-alert.dto';
import { PublicEvidenceUploadInterceptor } from './interceptors/public-evidence-upload.interceptor';
import { PublicIncidentsService } from './public-incidents.service';

@ApiTags('Portal Civil Público')
@Controller('public')
@UseGuards(ThrottlerGuard)
export class PublicIncidentsController {
  constructor(
    private readonly publicIncidentsService: PublicIncidentsService,
  ) {}

  @Post('denuncias')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @UseInterceptors(PublicEvidenceUploadInterceptor('evidencias', 3))
  @ApiOperation({
    summary: 'Registrar denuncia anónima ciudadana',
    description:
      'Endpoint público sin JWT. Acepta multipart/form-data con hasta 3 evidencias fotográficas opcionales.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['delito', 'parroquia', 'sector', 'descripcion'],
      properties: {
        delito: { type: 'string', maxLength: 120 },
        parroquia: { type: 'string', maxLength: 80 },
        sector: { type: 'string', maxLength: 120 },
        descripcion: { type: 'string', minLength: 10, maxLength: 4000 },
        evidencias: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 3,
          description: 'Fotos opcionales desde la cámara del dispositivo',
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: PublicDenunciaResponseDto })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  createDenuncia(
    @Body() dto: CreatePublicDenunciaDto,
    @UploadedFiles() evidencias?: Express.Multer.File[],
  ): Promise<PublicDenunciaResponseDto> {
    return this.publicIncidentsService.createAnonymousDenuncia(
      dto,
      evidencias ?? [],
    );
  }

  @Post('panico')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 300_000, limit: 2 } })
  @ApiOperation({
    summary: 'Botón de pánico geolocalizado',
    description:
      'Genera incidente prioritario EN_TRANSITO y emite alerta WebSocket al despacho central.',
  })
  @ApiResponse({ status: 201, type: PanicAlertResponseDto })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  createPanicAlert(
    @Body() dto: CreatePanicAlertDto,
  ): Promise<PanicAlertResponseDto> {
    return this.publicIncidentsService.createPanicAlert(dto);
  }
}
