import { adjustUnitInHours, coalesceAvailability, correctTimeAv, parseDayTime, parseInterval, parseTimeAv, stingifyAvailability, stringifyUnit } from "./adjust"

describe("parseDayTime", () => {
    test.each([
        ["M00:00", 0],
        ["M01:00", 2],
        ["M15:00", 30],
        ["T00:00", 48],
        ["T01:00", 50],
        ["U23:30", (6*24+23.5)*2],
    ])("%s -> %s", (daytime, value) => {
        expect(parseDayTime(daytime)).toEqual(value)
    })
})

describe("parseInterval", () => {
    test.each([
        ["M00:00 M00:00", [0, 0]],
        ["M00:00 M01:00", [0, 2]],
        ["M10:00 M15:00", [20, 30]],
        ["T00:00 R12:00", [48, 168]],
        ["U23:30 M00:00", [335, 0]],
        ["U23:30 M01:00", [335, 2]],
    ])("%s -> %s", (interval, [start, end]) => {
        expect(parseInterval(interval)).toEqual({ start, end })
    })
})

describe("parseTimeAv", () => {
    test.each([
        ["M00:00 M01:00, T00:00 T01:00, T23:00 W12:00", [[0, 2], [48, 50], [94, 120]]]
    ])("%s -> %s", (timeAv, value) => {
        expect(parseTimeAv(timeAv)).toEqual(value.map(([start, end]) => ({ start, end })))
    })
})

describe("adjustUnitInHours", () => {
    test.each([
        [0, 1, 2],
        [1, 1, 3],
        [1, -1, 335],
        [50, 5, 60],
        [336, 1, 2],
        [334, 2, 2],
        [334, 1.5, 1],
        [334, -1.5, 331],
    ])("%s + %s -> %s", (time, offset, value) => {
        expect(adjustUnitInHours(time, offset)).toEqual(value)
    })
})

describe("coalesceAvailability", () => {
    test.each([
        [[0], [[0, 1]]],
        [[0, 0], [[0, 1]]],
        [[0, 1], [[0, 2]]],
        [[0, 1, 2, 3], [[0, 4]]],
        [[2, 3, 4], [[2, 5]]],
        [[334, 335, 0, 1, 2], [[0, 3], [334, 0]]],
        [[334, 335, 336, 337, 338], [[0, 3], [334, 0]]],
    ])("%s -> %s", (times, value) => {
        expect(coalesceAvailability(times)).toEqual(value.map(([start, end]) => ({ start, end })))
    })
})

describe("stringifyUnit", () => {
    test.each([
        [0, "M00:00"],
        [1, "M00:30"],
        [2, "M01:00"],
        [24, "M12:00"],
        [48, "T00:00"],
        [50, "T01:00"],
        [335, "U23:30"],
        [336, "M00:00"],
        [337, "M00:30"],
    ])("%s -> %s", (time, value) => {
        expect(stringifyUnit(time)).toEqual(value)
    })
})

describe("stingifyAvailability", () => {
    test.each([
        [[[0, 1]], "M00:00 M00:30"],
        [[[0, 12]], "M00:00 M06:00"],
        [[[0, 48]], "M00:00 T00:00"],
        [[[12, 24]], "M06:00 M12:00"],
        [[[334, 0]], "U23:00 M00:00"],
        [[[334, 336]], "U23:00 M00:00"],
        [[[0, 1], [2, 3]], "M00:00 M00:30, M01:00 M01:30"],
        [[[0, 1], [2, 3], [12, 24]], "M00:00 M00:30, M01:00 M01:30, M06:00 M12:00"],
    ])("%s -> %s", (intervals, value) => {
        expect(stingifyAvailability(intervals.map(([start, end]) => ({ start, end })))).toEqual(value)
    })
})

describe("correctTimeAv", () => {
    test.each([
        ["M00:00 M00:30", "UTC00:00", "M00:00 M00:30"],
        ["U23:00 M00:00", "UTC00:00", "U23:00 M00:00"],
        ["U23:00 M01:00", "UTC00:00", "M00:00 M01:00, U23:00 M00:00"],
        ["M00:00 M01:00", "UTC-01:00", "M02:00 M03:00"],
        ["M00:00 M01:00", "UTC+01:00", "U22:00 U23:00"],
        ["M00:00 M02:00", "UTC+01:00", "U22:00 M00:00"],
        ["M00:00 M03:00", "UTC+01:00", "M00:00 M01:00, U22:00 M00:00"],
        ["T06:00 T07:00", "UTC-05:00", "T16:00 T17:00"],
        ["T06:00 T07:00", "UTC+05:00", "M20:00 M21:00"],
        ["U23:00 M00:00", "UTC-01:00", "M01:00 M02:00"],
        ["U23:00 M00:00", "UTC-04:30", "M08:00 M09:00"],
        ["U23:00 M00:00", "UTC+01:00", "U21:00 U22:00"],
        ["M00:00 M01:30, M02:00 M03:30", "UTC+01:00", "M00:00 M01:30, U22:00 U23:30"],
    ])("%s (%s) -> %s", (timeAv, timezone, value) => {
        expect(correctTimeAv(timeAv, timezone)).toEqual(value)
    })
})