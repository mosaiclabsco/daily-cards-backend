import { expect, it } from "vitest";
import { addDays, targetWeek, weekStart } from "./catalog";

it("calcula a segunda-feira da semana", () => {
  expect(weekStart(new Date("2026-11-18T12:00:00Z"))).toBe("2026-11-16");
  expect(weekStart(new Date("2026-11-22T12:00:00Z"))).toBe("2026-11-16");
  expect(addDays("2026-11-16", 4)).toBe("2026-11-20");
});

it("de sexta em diante a trend vai para a semana seguinte", () => {
  expect(targetWeek(new Date("2026-11-19T12:00:00Z"))).toBe("2026-11-16");
  expect(targetWeek(new Date("2026-11-20T12:00:00Z"))).toBe("2026-11-23");
});
