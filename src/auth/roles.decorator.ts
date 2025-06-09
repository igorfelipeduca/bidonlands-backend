import { SetMetadata } from '@nestjs/common';
import { Role } from './enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (typeof Role)[keyof typeof Role][]) => SetMetadata(ROLES_KEY, roles);
