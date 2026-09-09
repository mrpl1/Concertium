type Entry = {
  userId: string;
  name: string;
  email: string;
  role?: string | null;
};

type Candidate = { id: string; name: string; email: string };

/**
 * Who can see this project or client. Rendered for admins only — members see
 * the data itself, not the roster that controls it.
 */
export function AccessPanel({
  title,
  hint,
  entries,
  candidates,
  addAction,
  removeAction,
  showRole = false,
}: {
  title: string;
  hint: string;
  entries: Entry[];
  candidates: Candidate[];
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (formData: FormData) => Promise<void>;
  showRole?: boolean;
}) {
  const assignable = candidates.filter(
    (c) => !entries.some((e) => e.userId === c.id)
  );

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {title} ({entries.length})
        </h2>
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      </div>

      {entries.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-500">
          Nobody yet — only admins can see this.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entries.map((e) => (
            <li
              key={e.userId}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {e.name}
                  {showRole && e.role ? (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600">
                      {e.role}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-gray-500">{e.email}</p>
              </div>
              <form action={removeAction}>
                <input type="hidden" name="userId" value={e.userId} />
                <button
                  type="submit"
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {assignable.length > 0 ? (
        <form
          action={addAction}
          className="flex flex-wrap items-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3"
        >
          <div className="min-w-[12rem] flex-1">
            <label className="label" htmlFor={`add-${title}`}>
              Add someone
            </label>
            <select
              id={`add-${title}`}
              name="userId"
              className="input"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Choose a teammate…
              </option>
              {assignable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
            </select>
          </div>
          {showRole ? (
            <div>
              <label className="label" htmlFor={`role-${title}`}>
                Role
              </label>
              <select
                id={`role-${title}`}
                name="role"
                className="input"
                defaultValue="member"
              >
                <option value="lead">Lead</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          ) : null}
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      ) : null}
    </section>
  );
}
