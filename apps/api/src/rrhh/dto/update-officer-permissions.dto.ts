import { IsArray, IsString } from 'class-validator';

export class UpdateOfficerPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
