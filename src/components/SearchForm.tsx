import type { SearchMode } from "../types";
import { LoaderCircle, Search } from "lucide-react";

type SearchFormModel = {
  text: string;
  mode: SearchMode;
  searching: boolean;
  setText: (value: string) => void;
  changeMode: (mode: SearchMode) => void;
  submit: (query: string) => void | Promise<void>;
  clear: () => void;
};

type SearchFormProps = { search: SearchFormModel };

export function SearchForm({ search }: SearchFormProps) {
  const { text, mode, searching, setText, changeMode, submit, clear } = search;

  return (
    <>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(text);
        }}
      >
        <fieldset className="flex items-center gap-4 text-sm" disabled={searching}>
          <legend className="mr-2 inline text-sm font-medium">Search by</legend>
          {(["address", "name"] as const).map((searchMode) => (
            <label key={searchMode} className="flex cursor-pointer items-center gap-1.5 capitalize">
              <input
                type="radio"
                name="search-mode"
                checked={search.mode === searchMode}
                onChange={() => changeMode(searchMode)}
              />
              {searchMode}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            aria-label={mode === "address" ? "Address" : "Location name"}
            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 focus:border-slate-500 focus:outline-none"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              mode === "address"
                ? "Enter a full street address (street, city, state, ZIP code)"
                : "Enter a location name"
            }
            autoComplete={mode === "address" ? "street-address" : "off"}
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white shadow-md shadow-blue-900/20 transition duration-150 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={searching || !text.trim()}
          >
            {searching ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Search aria-hidden="true" className="size-4" strokeWidth={2.5} />
            )}
            {searching ? "Searching…" : "Search"}
          </button>
          <button
            className="rounded border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={clear}
          >
            Clear
          </button>
        </div>
      </form>
    </>
  );
}
