import { IsBoolean } from 'class-validator';

export class ToggleDriverAvailabilityDto {
  @IsBoolean()
  available_for_work: boolean;
}
