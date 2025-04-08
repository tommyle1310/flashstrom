import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from 'src/utils/types/admin';

// Key để lưu metadata
export const PERMISSIONS_KEY = 'permissions';

// Decorator để set required permissions
export const Permissions = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
