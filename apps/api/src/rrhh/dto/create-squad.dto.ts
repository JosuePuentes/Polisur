import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSquadDto {
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  callsign?: string;
}
