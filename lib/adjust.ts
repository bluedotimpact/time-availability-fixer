interface Interval {
  start: number,
  end: number,
}

const UNITS_IN_HOUR = 2;
const UNIT_MAXIMUM = 24 * 7 * UNITS_IN_HOUR;

const dayMapping = {
  M: 0,
  T: 1,
  W: 2,
  R: 3,
  F: 4,
  S: 5,
  U: 6,
};

const isDay = (d: string): d is keyof typeof dayMapping => {
  return d in dayMapping
}

/**
 * @param time String in format eHH:mm
 * @returns Number representing hours from midnight on Monday
 * @example parseDayTime("T09:30") === (24 + 9.5) * UNITS_IN_HOUR
 */
export const parseDayTime = (daytime: string): number => {
  const match = daytime.match(/^([MTWRFSU])(\d\d):(\d\d)$/);
  if (!match) throw new Error(`Invalid daytime string: ${daytime}`)
  if (!isDay(match[1])) throw new Error(`Invalid daytime string (invalid day): ${daytime}`)
  const hours = dayMapping[match[1]] * 24 + parseInt(match[2]) + parseInt(match[3]) / 60
  return hours * UNITS_IN_HOUR;
}

/**
 * @param interval String in format eHH:mm eHH:mm
 * Should not
 * @returns Pair of numbers representing start and end units
 * @example parseInterval("M14:00 T09:30") === [14 * UNITS_IN_HOUR, (24 + 9.5) * UNITS_IN_HOUR]
 */
export const parseInterval = (interval: string): Interval => {
  if (!/^[MTWRFSU]\d\d:\d\d [MTWRFSU]\d\d:\d\d$/.test(interval)) {
    throw new Error(`Invalid interval string: ${interval}`)
  }
  const [daytime1, daytime2] = interval.split(' ')

  return {
    start: parseDayTime(daytime1),
    end: parseDayTime(daytime2),
  };
}

export const parseTimeAv = (times: string | undefined): Interval[] => {
  if (!times) return [];
  return times.split(", ").map((ts) => parseInterval(ts.trim()));
}

export const explodeToUnits = (intervals: Interval[]): number[] => {
  const times: number[] = []
  for (const interval of intervals) {
    if (interval.start > interval.end) {
      for (let i = 0; i < interval.end; i++) {
        times.push(i)
      }

      interval.end = UNIT_MAXIMUM;
    }

    for (let i = interval.start; i < interval.end; i++) {
      times.push(i)
    }
  }
  return times;
}

export const adjustUnitInUnits = (time: number, offsetInUnits: number = 0): number => {
  return (time + offsetInUnits + UNIT_MAXIMUM) % UNIT_MAXIMUM;
}

export const adjustUnitInHours = (time: number, offsetInHours: number = 0): number => {
  return adjustUnitInUnits(time, offsetInHours * UNITS_IN_HOUR);
}

export const adjustUnitsInHours = (times: number[], offsetInHours: number = 0): number[] => {
  return times.map((t) => adjustUnitInHours(t, offsetInHours));
}

export const coalesceAvailability = (inputTimes: number[]): Interval[] => {
  // Normalize times (by wrapping above UNIT_MAXIMUM), remove duplicates and sort
  const times = Array.from(new Set(inputTimes.map(t => adjustUnitInUnits(t)))).sort((a, b) => a - b)

  const intervals: Interval[] = [];
  for (const time of times) {
    const lastInterval = intervals[intervals.length - 1];

    // If this is a separate interval, create a new interval
    if (!lastInterval || lastInterval.end !== time || lastInterval.end === 0) {
      intervals.push({ start: time, end: time });
    }

    intervals[intervals.length - 1].end = adjustUnitInUnits(time, 1);
  }
  return intervals;
}

const daySymbols = ["M", "T", "W", "R", "F", "S", "U"];
export const stringifyUnit = (inputUnit: number): string => {
  const unit = adjustUnitInUnits(inputUnit)
  const day = Math.floor(unit / (24 * UNITS_IN_HOUR))
  const hour = Math.floor((unit % (24 * UNITS_IN_HOUR)) / UNITS_IN_HOUR);
  const minute = (((unit % (24 * UNITS_IN_HOUR)) / UNITS_IN_HOUR) - hour) * 60;
  const dayName = daySymbols[(day + 7) % 7];
  return `${dayName}${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export const stingifyAvailability = (intervals: Interval[]): string => {
  return intervals
    .map(({ start, end }) => `${stringifyUnit(start)} ${stringifyUnit(end)}`)
    .join(", ");
}

export function parseTimezoneToOffsetInHours(timezone: string): number {
  if (timezone === "UTC00:00") return 0;

  if (!/UTC(\+|-)\d\d:\d\d/.test(timezone)) throw new Error("Unsupported timezone: " + timezone)

  const sign = timezone[3] === "-" ? 1 : -1;
  const minutes = (parseInt(timezone[4]) * 10 + parseInt(timezone[5])) * 60 + (parseInt(timezone[7]) * 10 + parseInt(timezone[8]))
  return sign * minutes / 60;
}

export const adjustTimeAv = (timeAv: string, offsetInHours: number): string => {
  const parsed = parseTimeAv(timeAv)
  const exploded = explodeToUnits(parsed)
  const adjusted = adjustUnitsInHours(exploded, offsetInHours)
  const coalesced = coalesceAvailability(adjusted)
  const serialized = stingifyAvailability(coalesced)
  return serialized;
}

// We shifted participants times the opposite direction
// So we need to shift the times in the correct direction, twice
export const correctTimeAv = (timeAv: string, timezone: string): string => {
  const offsetInHours = parseTimezoneToOffsetInHours(timezone) * 2
  return adjustTimeAv(timeAv, offsetInHours)
}