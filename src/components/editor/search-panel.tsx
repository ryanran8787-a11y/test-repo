import { searchFiles, useWorkspace } from "@/lib/workspace/store";
import { Input } from "@/components/ui/input";

export function SearchPanel() {
  const query = useWorkspace((s) => s.searchQuery);
  const files = useWorkspace((s) => s.files);
  const hits = searchFiles(files, query);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2">
        <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-subtle">Search</p>
        <Input
          value={query}
          onChange={(e) => useWorkspace.getState().setSearchQuery(e.target.value)}
          placeholder="Search workspace"
          className="h-8 text-xs"
        />
      </div>
      <div className="forge-scroll min-h-0 flex-1 overflow-auto px-1 pb-3">
        {query.trim() && hits.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted">No matches</p>
        ) : null}
        {hits.map((hit, i) => (
          <button
            key={`${hit.path}:${hit.line}:${i}`}
            type="button"
            className="block w-full rounded-sm px-2 py-1.5 text-left hover:bg-elevated"
            onClick={() => useWorkspace.getState().openFile(hit.path)}
          >
            <p className="truncate font-mono text-2xs text-fg">{hit.path}</p>
            <p className="truncate text-2xs text-muted">
              {hit.line}: {hit.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
