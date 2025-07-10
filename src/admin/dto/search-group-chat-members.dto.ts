import { IsOptional, IsString } from 'class-validator';

export class SearchGroupChatMembersDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}
