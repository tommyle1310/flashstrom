import { PartialType } from '@nestjs/mapped-types';
import { CreateOnlineSessionDto } from './create-online-session.dto';

export class UpdateOnlineSessionDto extends PartialType(
  CreateOnlineSessionDto
) {}
