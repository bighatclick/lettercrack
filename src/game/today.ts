import { type LocalDate, toLocalDate } from '@/engine/daily';

/** The device-local date right now (F5). The only place the app reads "today". */
export const today = (): LocalDate => toLocalDate(new Date());
