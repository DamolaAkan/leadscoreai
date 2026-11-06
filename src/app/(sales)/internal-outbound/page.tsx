"use client";

import { useCallback, useEffect, useState } from "react";
import { useInvoiceAuth } from "@/lib/useInvoiceAuth";
import ImportPanel from "@/components/outbound/ImportPanel";
import DncPanel from "@/components/outbound/DncPanel";
import {
  CompanyRow,
  ContactRow,
  DncEntry,
  SEGMENTS,
  SEGMENT_LABEL,
  STAGES,
  STAGE_LABEL,
  Stage,
} from "@/lib/outbound";

// Staff-only outbound list. It never sends anything: it holds lender leads,
// writes first lines from each lender's website, tracks stages and exports a
// CSV for the separate sending tool.

type View = "contacts" | "companies";
interface Facet {
  value: string;
  n: number;
}
interface Filters {
  niche: string;
  country: string;
  segment: string;
  stage: string;
  q: string;
}

const STAGE_STYLE: Record<Stage, string> = {
  new: "bg-gray-100 text-gray-600",
  researched: "bg-blue-50 text-blue-700",
  contacted: "bg-amber-50 text-amber-700",
  replied: "bg-violet-50 text-violet-700",
  meeting: "bg-green-50 text-green-700",
  not_a_fit: "bg-red-50 text-red-600",
};

const selectCls = "rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800";

export default function InternalOutboundPage() {
  const { user, getAuthHeaders } = useInvoiceAuth();
  const [view, setView] = useState<View>("contacts");
  const [filters, setFilters] = useState<Filters>({ niche: "", country: "", segment: "", stage: "", q: "" });
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<(ContactRow | CompanyRow)[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [facets, setFacets] = useState<{ niches: Facet[]; countries: Facet[] }>({ niches: [], countries: [] });
  const [dnc, setDnc] = useState<DncEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [researching, setResearching] = useState<Set<string>>(new Set());
  const [researchErrors, setResearchErrors] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [panel, setPanel] = useState<"" | "import" | "dnc">("");
  const [editing, setEditing] = useState<{ id: string; kind: "contact" | "company"; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams({ view, page: String(page) });
    for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
    try {
      const res = await fetch(`/api/internal-outbound?${p}`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load the list");
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setPageSize(data.pageSize || 100);
      setFacets(data.facets || { niches: [], countries: [] });
      if (data.dnc) setDnc(data.dnc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the list");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [view, page, filters, getAuthHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setFilters((f) => (f.q === qInput.trim() ? f : { ...f, q: qInput.trim() }));
    }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => setSelected(new Set()), [view, filters, page]);

  function setFilter(k: keyof Filters, v: string) {
    setPage(0);
    setFilters((f) => ({ ...f, [k]: v }));
  }

  const contacts = view === "contacts" ? (rows as ContactRow[]) : [];
  const companies = view === "companies" ? (rows as CompanyRow[]) : [];
  const selectable = (view === "contacts" ? contacts.filter((c) => !c.suppressed) : companies.filter((c) => !c.suppressed)).map(
    (r) => r.id
  );

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function research(companyId: string): Promise<boolean> {
    setResearching((s) => new Set(s).add(companyId));
    setResearchErrors((e) => {
      const n = { ...e };
      delete n[companyId];
      return n;
    });
    try {
      const res = await fetch("/api/internal-outbound/first-line", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ company_id: companyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not write a first line");
      setRows((rs) =>
        rs.map((r) => {
          if (view === "contacts" && (r as ContactRow).company_id === companyId) {
            const c = r as ContactRow;
            return {
              ...c,
              first_line: c.contact_first_line || data.first_line,
              website_summary: data.summary,
              researched_at: new Date().toISOString(),
              stage: c.stage === "new" ? "researched" : c.stage,
            };
          }
          if (view === "companies" && r.id === companyId) {
            return { ...(r as CompanyRow), first_line: data.first_line, website_summary: data.summary, researched_at: new Date().toISOString() };
          }
          return r;
        })
      );
      return true;
    } catch (e) {
      setResearchErrors((er) => ({ ...er, [companyId]: e instanceof Error ? e.message : "Failed" }));
      return false;
    } finally {
      setResearching((s) => {
        const n = new Set(s);
        n.delete(companyId);
        return n;
      });
    }
  }

  async function researchSelected() {
    const ids =
      view === "contacts"
        ? Array.from(new Set(contacts.filter((c) => selected.has(c.id) && !c.suppressed && c.domain).map((c) => c.company_id)))
        : companies.filter((c) => selected.has(c.id) && !c.suppressed && c.domain).map((c) => c.id);
    const list = ids.slice(0, 25);
    if (!list.length) return setNotice("None of the picked rows has a website to read.");
    if (ids.length > 25) setNotice(`Writing first lines for the first 25 of ${ids.length} companies.`);
    setBatch({ done: 0, total: list.length });
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      if (await research(list[i])) ok++;
      setBatch({ done: i + 1, total: list.length });
    }
    setBatch(null);
    setNotice(`First lines written for ${ok} of ${list.length} companies.`);
  }

  async function setStage(ids: string[], stage: Stage) {
    const res = await fetch("/api/internal-outbound/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ ids, stage }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Could not change the stage");
    setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...(r as ContactRow), stage } : r)));
    if (ids.length > 1) setNotice(`${data.updated} contacts moved to ${STAGE_LABEL[stage]}.`);
  }

  async function saveEdit() {
    if (!editing) return;
    const isContact = editing.kind === "contact";
    const res = await fetch(isContact ? "/api/internal-outbound/contacts" : "/api/internal-outbound/first-line", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(isContact ? { id: editing.id, first_line: editing.text } : { company_id: editing.id, first_line: editing.text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Could not save");
    const text = editing.text.trim() || null;
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== editing.id) return r;
        return isContact
          ? { ...(r as ContactRow), contact_first_line: text, first_line: text || (r as ContactRow).first_line }
          : { ...(r as CompanyRow), first_line: text };
      })
    );
    setEditing(null);
    if (isContact && !text) load();
  }

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      const body =
        view === "contacts" && selected.size
          ? { ids: Array.from(selected) }
          : { niche: filters.niche, country: filters.country, segment: filters.segment, stage: filters.stage };
      const res = await fetch("/api/internal-outbound/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed");
      }
      const count = res.headers.get("X-Row-Count") || "0";
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `outbound-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      setNotice(
        `Exported ${Number(count).toLocaleString()} contacts. Do-not-contact, no-email, invalid-email and "not a fit" rows are always left out.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const allPicked = selectable.length > 0 && selectable.every((id) => selected.has(id));

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Outbound</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lender leads for outreach. Nothing is sent from here: export a CSV for the sending tool.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPanel(panel === "import" ? "" : "import")}
            className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white"
          >
            Import CSV
          </button>
          <button
            onClick={() => setPanel(panel === "dnc" ? "" : "dnc")}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
          >
            Do not contact ({dnc.length})
          </button>
          <button
            onClick={exportCsv}
            disabled={exporting || view !== "contacts"}
            title={view !== "contacts" ? "Switch to Contacts to export" : undefined}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
          >
            {exporting ? "Exporting..." : selected.size && view === "contacts" ? `Export ${selected.size} picked` : "Export filtered CSV"}
          </button>
        </div>
      </div>

      {panel === "import" && <ImportPanel authHeaders={getAuthHeaders} onDone={load} onClose={() => setPanel("")} />}
      {panel === "dnc" && (
        <DncPanel
          dnc={dnc}
          canRemove={user?.role === "super_admin"}
          authHeaders={getAuthHeaders}
          onChange={(d) => {
            setDnc(d);
            load();
          }}
          onClose={() => setPanel("")}
        />
      )}

      <div className="bg-white rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-gray-100 p-0.5 text-sm">
          {(["contacts", "companies"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                setPage(0);
              }}
              className={`rounded-full px-3 py-1 capitalize ${view === v ? "bg-white shadow text-[#111827] font-medium" : "text-gray-500"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={view === "contacts" ? "Search name, email, company" : "Search company or domain"}
          className="flex-1 min-w-[180px] rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />
        <select value={filters.segment} onChange={(e) => setFilter("segment", e.target.value)} className={selectCls}>
          <option value="">All segments</option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>{SEGMENT_LABEL[s]}</option>
          ))}
        </select>
        <select value={filters.niche} onChange={(e) => setFilter("niche", e.target.value)} className={selectCls}>
          <option value="">All niches</option>
          {facets.niches.map((f) => (
            <option key={f.value} value={f.value}>{f.value} ({f.n})</option>
          ))}
        </select>
        <select value={filters.country} onChange={(e) => setFilter("country", e.target.value)} className={selectCls}>
          <option value="">All countries</option>
          {facets.countries.map((f) => (
            <option key={f.value} value={f.value}>{f.value} ({f.n})</option>
          ))}
        </select>
        {view === "contacts" && (
          <select value={filters.stage} onChange={(e) => setFilter("stage", e.target.value)} className={selectCls}>
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABEL[s]}</option>
            ))}
          </select>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-14 md:top-0 z-20 bg-[#111827] text-white rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm">
          <span>{selected.size} picked</span>
          <button
            onClick={researchSelected}
            disabled={!!batch}
            className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 disabled:opacity-50"
          >
            {batch ? `Writing ${batch.done}/${batch.total}...` : "Write first lines"}
          </button>
          {view === "contacts" && (
            <select
              value=""
              onChange={(e) => e.target.value && setStage(Array.from(selected), e.target.value as Stage)}
              className="rounded-full bg-white/10 px-3 py-1 text-white"
            >
              <option value="" className="text-gray-800">Move to stage...</option>
              {STAGES.map((s) => (
                <option key={s} value={s} className="text-gray-800">{STAGE_LABEL[s]}</option>
              ))}
            </select>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-white/60 hover:text-white">Clear</button>
        </div>
      )}

      {notice && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 flex justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-blue-400">×</button>
        </div>
      )}
      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={() => setSelected(allPicked ? new Set() : new Set(selectable))}
                  aria-label="Pick all on this page"
                />
              </th>
              {view === "contacts" ? (
                <>
                  <th className="p-3 min-w-[200px]">Contact</th>
                  <th className="p-3 min-w-[180px]">Company</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3 min-w-[280px]">First line</th>
                </>
              ) : (
                <>
                  <th className="p-3 min-w-[200px]">Company</th>
                  <th className="p-3">Contacts</th>
                  <th className="p-3 min-w-[280px]">First line</th>
                </>
              )}
              <th className="p-3 w-36" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {error ? "" : "No leads match. Import a CSV to start."}
                </td>
              </tr>
            ) : view === "contacts" ? (
              contacts.map((c) => (
                <tr key={c.id} className={`border-b border-gray-50 align-top ${c.suppressed ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    <input type="checkbox" disabled={c.suppressed} checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label="Pick" />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-[#111827]">{c.full_name || "No name"}</div>
                    {c.title && <div className="text-xs text-gray-500">{c.title}</div>}
                    <div className="text-xs text-gray-500 mt-0.5 break-all">
                      {c.email || "No email"}
                      {c.email_status && <span className="ml-1 text-gray-400">({c.email_status})</span>}
                    </div>
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C3AED]">LinkedIn</a>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="text-[#111827]">{c.company_name}</div>
                    {c.domain && (
                      <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C3AED]">{c.domain}</a>
                    )}
                    <div className="text-xs text-gray-400">
                      {[c.country, c.niche, SEGMENT_LABEL[c.segment]].filter(Boolean).join(" · ")}
                    </div>
                    {c.suppressed && (
                      <span className="mt-1 inline-block text-[11px] rounded-full bg-red-50 text-red-600 px-2 py-0.5">Do not contact</span>
                    )}
                  </td>
                  <td className="p-3">
                    <select
                      value={c.stage}
                      onChange={(e) => setStage([c.id], e.target.value as Stage)}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STAGE_STYLE[c.stage]}`}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <FirstLineCell
                      text={c.first_line}
                      summary={c.website_summary}
                      own={!!c.contact_first_line}
                      editing={editing?.id === c.id ? editing.text : null}
                      onEdit={() => setEditing({ id: c.id, kind: "contact", text: c.contact_first_line || c.first_line || "" })}
                      onChange={(t) => setEditing((e) => (e ? { ...e, text: t } : e))}
                      onSave={saveEdit}
                      onCancel={() => setEditing(null)}
                      error={researchErrors[c.company_id]}
                    />
                  </td>
                  <td className="p-3 text-right">
                    <ResearchButton
                      disabled={c.suppressed || !c.domain}
                      busy={researching.has(c.company_id)}
                      done={!!c.researched_at}
                      onClick={() => research(c.company_id)}
                      title={!c.domain ? "No website on file" : c.suppressed ? "Do not contact" : undefined}
                    />
                  </td>
                </tr>
              ))
            ) : (
              companies.map((co) => (
                <tr key={co.id} className={`border-b border-gray-50 align-top ${co.suppressed ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    <input type="checkbox" disabled={co.suppressed} checked={selected.has(co.id)} onChange={() => toggle(co.id)} aria-label="Pick" />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-[#111827]">{co.name}</div>
                    {co.domain && (
                      <a href={`https://${co.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C3AED]">{co.domain}</a>
                    )}
                    <div className="text-xs text-gray-400">
                      {[co.country, co.niche, SEGMENT_LABEL[co.segment]].filter(Boolean).join(" · ")}
                    </div>
                    {co.suppressed && (
                      <span className="mt-1 inline-block text-[11px] rounded-full bg-red-50 text-red-600 px-2 py-0.5">Do not contact</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-600">{co.contact_count ?? 0}</td>
                  <td className="p-3">
                    <FirstLineCell
                      text={co.first_line}
                      summary={co.website_summary}
                      own={false}
                      editing={editing?.id === co.id ? editing.text : null}
                      onEdit={() => setEditing({ id: co.id, kind: "company", text: co.first_line || "" })}
                      onChange={(t) => setEditing((e) => (e ? { ...e, text: t } : e))}
                      onSave={saveEdit}
                      onCancel={() => setEditing(null)}
                      error={researchErrors[co.id]}
                    />
                  </td>
                  <td className="p-3 text-right">
                    <ResearchButton
                      disabled={!!co.suppressed || !co.domain}
                      busy={researching.has(co.id)}
                      done={!!co.researched_at}
                      onClick={() => research(co.id)}
                      title={!co.domain ? "No website on file" : co.suppressed ? "Do not contact" : undefined}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {total.toLocaleString()} {view}
        </span>
        <div className="flex items-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-full border border-gray-200 bg-white disabled:opacity-40">
            Previous
          </button>
          <span>
            Page {page + 1} of {pages}
          </span>
          <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-full border border-gray-200 bg-white disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function ResearchButton({
  disabled,
  busy,
  done,
  onClick,
  title,
}: {
  disabled: boolean;
  busy: boolean;
  done: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      className="whitespace-nowrap rounded-full border border-[#7C3AED]/30 px-3 py-1 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/5 disabled:opacity-40"
    >
      {busy ? "Reading site..." : done ? "Rewrite line" : "Write first line"}
    </button>
  );
}

function FirstLineCell({
  text,
  summary,
  own,
  editing,
  onEdit,
  onChange,
  onSave,
  onCancel,
  error,
}: {
  text: string | null;
  summary: string | null;
  own: boolean;
  editing: string | null;
  onEdit: () => void;
  onChange: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
  error?: string;
}) {
  if (editing !== null) {
    return (
      <div className="space-y-1">
        <textarea
          value={editing}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-200 p-2 text-sm"
          autoFocus
        />
        <div className="flex gap-2 text-xs">
          <button onClick={onSave} className="rounded-full bg-[#7C3AED] px-3 py-1 text-white">Save</button>
          <button onClick={onCancel} className="text-gray-500">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      {text ? (
        <button onClick={onEdit} className="text-left text-gray-800 hover:text-[#7C3AED]">
          {text}
        </button>
      ) : (
        <button onClick={onEdit} className="text-xs text-gray-400 hover:text-gray-600">Add by hand</button>
      )}
      {own && <span className="ml-1 text-[10px] text-gray-400">(this contact only)</span>}
      {summary && <div className="text-[11px] text-gray-400 mt-1">{summary}</div>}
      {error && <div className="text-[11px] text-red-500 mt-1">{error}</div>}
    </div>
  );
}
