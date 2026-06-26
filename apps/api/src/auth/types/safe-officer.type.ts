import { Officer } from '@polisur/database';

export type SafeOfficer = Omit<Officer, 'passwordHash'> & {
  passwordHash?: string | null;
};
