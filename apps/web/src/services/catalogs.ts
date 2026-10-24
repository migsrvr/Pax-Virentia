import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Factor, Technology } from './simulation';

export type ModelVersion = { module: string; version: string; name: string; status: string; description: string };

/** The versioned catalogs that runs freeze: grid factors, technology specifications and models. */
export function useCatalogs() {
  return useQuery({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const [factors, technologies, models] = await Promise.all([
        api.get<{ items: Factor[] }>('/catalogs/factors'),
        api.get<{ items: Technology[] }>('/catalogs/technologies'),
        api.get<{ items: ModelVersion[] }>('/catalogs/models'),
      ]);
      return { factors: factors.items, technologies: technologies.items, models: models.items };
    },
    staleTime: 5 * 60_000,
  });
}
