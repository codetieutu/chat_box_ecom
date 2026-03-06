import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);

export function parseDateTime(input) {
    const parsed = dayjs(input, "DD-MM-YYYY", true); // strict mode

    if (!parsed.isValid()) return null;

    return parsed.format("YYYY-MM-DD"); // format MySQL DATETIME
}