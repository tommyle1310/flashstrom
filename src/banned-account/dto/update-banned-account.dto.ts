import { PartialType } from '@nestjs/mapped-types';
import { CreateBannedAccountDto } from './create-banned-account.dto';

export class UpdateBannedAccountDto extends PartialType(CreateBannedAccountDto) {}
