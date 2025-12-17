import { ServiceRegistry } from '../services/ServiceRegistry';
import type { PRWithStatus } from './github.types';

export async function fetchNeglectedPRs(
  minAge: number,
  timeUnit: 'hours' | 'days'
): Promise<PRWithStatus[]> {
  const github = ServiceRegistry.getGitHub();
  return github.getTop10MostNeglectedPRs(minAge, timeUnit);
}

export function pickRandomPR(prs: PRWithStatus[]): PRWithStatus {
  if (!prs.length) {
    throw new Error('No neglected PRs found');
  }

  const index = Math.floor(Math.random() * prs.length);
  return prs[index];
}
