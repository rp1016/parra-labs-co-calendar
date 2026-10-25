import { describe, expect, it } from "vitest";
import { toDateKey } from "./dates";
import {
  HOLIDAY_COUNTRIES,
  countryName,
  easterSunday,
  holidayEvents,
  holidaysFor,
} from "./holidays";

const dates = (country: string, year: number) =>
  holidaysFor(country, year, "es").map((entry) => entry.date);

describe("holidays", () => {
  it("computes Gregorian Easter Sunday", () => {
    expect(toDateKey(easterSunday(2024))).toBe("2024-03-31");
    expect(toDateKey(easterSunday(2025))).toBe("2025-04-20");
    expect(toDateKey(easterSunday(2026))).toBe("2026-04-05");
    expect(toDateKey(easterSunday(2027))).toBe("2027-03-28");
  });

  it("lists Spanish national holidays in date order", () => {
    const list = holidaysFor("ES", 2026, "es");
    expect(list.map((entry) => entry.date)).toEqual([
      "2026-01-01",
      "2026-01-06",
      "2026-04-03",
      "2026-05-01",
      "2026-08-15",
      "2026-10-12",
      "2026-11-01",
      "2026-12-06",
      "2026-12-08",
      "2026-12-25",
    ]);
    expect(list[0].title).toBe("Año Nuevo");
    expect(list[2].title).toBe("Viernes Santo");
  });

  it("translates the names without changing the dates", () => {
    const english = holidaysFor("ES", 2026, "en");
    expect(dates("ES", 2026)).toEqual(english.map((entry) => entry.date));
    expect(english[0].title).toBe("New Year's Day");
  });

  it("uses the Monday rules where national law moves the holiday", () => {
    // Epiphany 2026 falls on a Tuesday, so Colombia observes it on the 12th.
    expect(dates("CO", 2026)).toContain("2026-01-12");
    expect(dates("CO", 2026)).not.toContain("2026-01-06");
  });

  it("uses nth-weekday rules for the United States", () => {
    const list = holidaysFor("US", 2026, "en");
    const byTitle = new Map(list.map((entry) => [entry.title, entry.date]));
    expect(byTitle.get("Martin Luther King Jr. Day")).toBe("2026-01-19");
    expect(byTitle.get("Presidents' Day")).toBe("2026-02-16");
    expect(byTitle.get("Memorial Day")).toBe("2026-05-25");
    expect(byTitle.get("Thanksgiving")).toBe("2026-11-26");
  });

  it("names the country in the interface language", () => {
    expect(countryName("MX", "es")).toBe("México");
    expect(countryName("MX", "en")).toBe("Mexico");
    expect(countryName("ZZ", "es")).toBe("ZZ");
    expect(HOLIDAY_COUNTRIES.map((item) => item.id)).toContain("ES");
  });

  it("builds deterministic all-day events with unique UIDs", () => {
    const first = holidayEvents("ES", [2026, 2027], "cal_es", "es");
    const second = holidayEvents("ES", [2026, 2027], "cal_es", "es");

    expect(first).toHaveLength(20);
    expect(first.every((event) => event.allDay)).toBe(true);
    expect(first.every((event) => event.showAs === "free")).toBe(true);
    expect(first.every((event) => event.calendarId === "cal_es")).toBe(true);
    expect(first.every((event) => event.start.endsWith("T00:00"))).toBe(true);
    expect(first.every((event) => event.end.endsWith("T23:59"))).toBe(true);

    const uids = new Set(first.map((event) => event.uid));
    expect(uids.size).toBe(first.length);
    expect(first.map((event) => event.uid)).toEqual(second.map((event) => event.uid));
  });

  it("ignores a country it does not know", () => {
    expect(holidaysFor("ZZ", 2026, "es")).toEqual([]);
    expect(holidayEvents("ZZ", [2026], "cal", "es")).toEqual([]);
  });
});
