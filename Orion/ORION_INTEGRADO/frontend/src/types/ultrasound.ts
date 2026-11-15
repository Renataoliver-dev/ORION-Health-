import type { RegionId } from '../components/anatomy/BodyMap';

/** A local demo image; not a persisted clinical examination. */
export type LocalExam = {
  id: string;
  athleteId: string;
  region: RegionId;
  muscle: string;
  fileName: string;
  imageUrl: string;
  date: string;
};
