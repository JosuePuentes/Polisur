import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SetOfficerCredentialsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
