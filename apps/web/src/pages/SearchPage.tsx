import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listPublications } from '../services/publications';
import { listReports } from '../services/reports';
import { searchWorkspace } from '../services/search';
import { errorMessage, listAll, listRuns } from '../services/simulation';
import type { Scenario } from '../services/simulation';
import type { DatasetSummary } from '../services/datasets';
import { SectionCard } from './scenarios/shared';

/**
 * Workspace search over scenarios, runs, datasets, reports and publications.
 * One research workspace holds a bounded number of records, so the lists are
 * fetched (and cached) and filtered on the client.
 */

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  const data = useQuery({
    queryKey: ['workspace-search-index'],
    queryFn: async () => {
      const [scenarios, runs, datasets, reports, publications] = await Promise.all([
        listAll<Scenario>('/scenarios'), listRuns(), listAll<DatasetSummary>('/datasets'), listReports(), listPublications(),
      ]);
      return { scenarios, runs, datasets, reports, publications };
    },
    staleTime: 30_000,
  });
  const groups = data.data && query ? searchWorkspace(query, data.data) : [];
  const total = groups.reduce((sum, group) => sum + group.hits.length, 0);

  return (
    <div className="flex flex-col gap-6 text-pv-ink">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-tight">Search</h1>
        <p className="text-[14px] text-pv-muted">
          {query ? <>Results for “{query}”{data.data ? ` · ${total} match${total === 1 ? '' : 'es'}` : ''}</> : 'Use the search box above to find scenarios, runs, datasets and reports.'}
        </p>
      </div>
      {data.isPending ? <p role="status">Searching your workspace…</p> : null}
      {data.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(data.error)}</p> : null}
      {query && data.data && !total ? <SectionCard><p className="text-[14px]">Nothing in this workspace matches “{query}”.</p></SectionCard> : null}
      {groups.filter((group) => group.hits.length).map((group) => (
        <SectionCard key={group.title} className="gap-3">
          <h2 className="text-[18px] font-semibold">{group.title} · {group.hits.length}</h2>
          <ul className="flex flex-col gap-2">
            {group.hits.slice(0, 25).map((hit) => (
              <li key={hit.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-pv-hairline pb-2 last:border-b-0">
                <Link to={hit.to} className="text-[14px] font-semibold text-pv-teal hover:underline">{hit.title}</Link>
                <span className="text-[12px] text-pv-muted">{hit.detail}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  );
}
