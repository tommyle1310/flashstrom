import { IsBoolean, IsOptional } from 'class-validator';

export class ToggleRestaurantAvailabilityDto {
  @IsOptional()
  @IsBoolean()
  is_open?: boolean;
}
