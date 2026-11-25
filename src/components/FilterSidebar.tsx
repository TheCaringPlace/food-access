import { DAYS, TYPE_COLORS } from "../location-utils";
import type { Day, LocationType } from "../types";

type FilterModel = {
  types: LocationType[];
  selectedTypes: LocationType[] | null;
  selectedDay: Day | "";
  toggleType: (type: LocationType) => void;
  setSelectedDay: (day: Day | "") => void;
};

type FilterSidebarProps = { filters: FilterModel };

export function FilterSidebar({ filters }: FilterSidebarProps) {
  const { types, selectedTypes, selectedDay, toggleType, setSelectedDay } = filters;

  return (
    <aside className="h-fit rounded border border-slate-200 bg-white p-4" aria-label="Filters">
      <h2 className="mb-4 text-base font-semibold">Filters</h2>
      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Location type</legend>
          <div className="flex flex-col gap-2">
            {types.map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTypes === null || selectedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                />
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[type] ?? TYPE_COLORS.Other }}
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Open on</span>
          <select
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5"
            value={selectedDay}
            onChange={(event) =>
              setSelectedDay(DAYS.find((day) => day === event.target.value) ?? "")
            }
          >
            <option value="">Any day</option>
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  );
}
