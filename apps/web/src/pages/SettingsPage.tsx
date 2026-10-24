import EvidenceNotice from '../components/common/EvidenceNotice';
import { useCatalogs } from '../services/catalogs';
import { errorMessage, format } from '../services/simulation';
import { Chip, SectionCard } from './scenarios/shared';

const TH = 'border-b border-pv-divider px-3 py-2 text-[12px] font-medium text-pv-muted';
const TD = 'border-b border-pv-hairline px-3 py-2.5 align-top';

export default function SettingsPage() {
  const catalogs = useCatalogs();
  return (
    <div className="flex flex-col gap-6 text-pv-ink">
      <div className="flex max-w-[760px] flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-tight">Workspace settings</h1>
        <p className="text-[14px] text-pv-muted">
          The versioned grid factors and calculation models available to new scenarios. Each run freezes the exact
          values it used, so later catalog changes never alter stored results.
        </p>
      </div>

      {catalogs.isPending ? <p role="status">Loading catalogs…</p> : null}
      {catalogs.isError ? <p role="alert" className="text-pv-err-ink">{errorMessage(catalogs.error)}</p> : null}
      {catalogs.data ? (
        <>
          <SectionCard className="gap-3">
            <h2 className="text-[18px] font-semibold">Grid emission factors</h2>
            <p className="text-[12px] text-pv-muted">A scenario’s whole reporting period must fall within the factor’s year and region.</p>
            <div className="overflow-x-auto pv-scroll">
              <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
                <thead><tr>{['Region', 'Year', 'Gas basis', 'Method', 'kg per kWh', 'Evidence', 'Source'].map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}</tr></thead>
                <tbody className="tabular-nums">
                  {catalogs.data.factors.map((factor) => (
                    <tr key={factor.version_id}>
                      <td className={TD + ' font-medium'}>{factor.grid_region}</td>
                      <td className={TD}>{factor.reporting_year}</td>
                      <td className={TD}>{factor.gas_basis}</td>
                      <td className={TD}>{factor.factor_method}</td>
                      <td className={TD + ' font-medium'}>{format(factor.kg_per_kwh, 4)}</td>
                      <td className={TD}><Chip tone={factor.evidence_status === 'verified' ? 'ok' : 'neutral'}>{factor.evidence_status.replace('_', ' ')}</Chip></td>
                      <td className={TD + ' text-pv-muted'}>{factor.source_ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard className="gap-3">
            <h2 className="text-[18px] font-semibold">Calculation models</h2>
            <div className="overflow-x-auto pv-scroll">
              <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
                <thead><tr>{['Module', 'Version', 'Status', 'Description'].map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {catalogs.data.models.map((model) => (
                    <tr key={model.module}>
                      <td className={TD + ' font-medium capitalize'}>{model.module}</td>
                      <td className={TD + ' font-mono text-[12px]'}>{model.version}</td>
                      <td className={TD}><Chip tone={model.status === 'production' ? 'ok' : 'warn'}>{model.status}</Chip></td>
                      <td className={TD + ' text-pv-muted'}>{model.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-pv-muted">Catalog versions are managed in the backend; there is no in-app editor yet.</p>
          </SectionCard>
        </>
      ) : null}

      <EvidenceNotice
        variant="attribution"
        title="Workspace roles"
        body="Analysts prepare data, run scenarios, export reports and submit public snapshots. Reviewers approve, reject or withdraw public snapshots, and cannot decide on their own submissions. Administrators can do both. Public visitors read approved summaries only. Accounts are provisioned with `python -m app.bootstrap create-user`."
      />
    </div>
  );
}
