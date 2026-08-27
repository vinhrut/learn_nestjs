import {
  IsEnum,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

import { project_member_role } from '@prisma/client';

export class AddProjectMemberDto {
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsEnum(project_member_role)
  project_role: project_member_role;
}