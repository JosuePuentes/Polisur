import { DivisionRole } from '@polisur/database';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignOfficerCommandDto {
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @IsOptional()
  @IsString()
  squadId?: string | null;

  @IsEnum(DivisionRole)
  divisionRole!: DivisionRole;
}
