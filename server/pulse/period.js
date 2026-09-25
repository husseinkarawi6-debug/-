// Calendar handling in the project timezone. Report dates are plain calendar
// dates (YYYY-MM-DD) exactly as printed; "today" is computed in the project TZ
// so a report never slides to another day because of UTC.

export function todayIn(tz, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
}

export function datesIn(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * period: day | 7 | 30 | month | custom
 * Returns { kind, from, to, anchor, prev:{from,to}|null, label }
 */
export function resolvePeriod({ period = 'day', date, from, to } = {}, tz) {
  const anchor = ISO.test(date || '') ? date : todayIn(tz);
  let f, t, prev = null;
  switch (String(period)) {
    case 'day': f = t = anchor; prev = { from: addDays(anchor, -1), to: addDays(anchor, -1) }; break;
    case '7': f = addDays(anchor, -6); t = anchor; prev = { from: addDays(anchor, -13), to: addDays(anchor, -7) }; break;
    case '30': f = addDays(anchor, -29); t = anchor; prev = { from: addDays(anchor, -59), to: addDays(anchor, -30) }; break;
    case 'month': {
      f = `${anchor.slice(0, 8)}01`; t = anchor;
      const pm = new Date(`${f}T00:00:00Z`); pm.setUTCMonth(pm.getUTCMonth() - 1);
      const pf = pm.toISOString().slice(0, 10);
      const pmEnd = addDays(f, -1);
      const pt = addDays(pf, daysBetween(f, t));
      prev = { from: pf, to: pt < pmEnd ? pt : pmEnd };
      break;
    }
    case 'custom': {
      if (!ISO.test(from || '') || !ISO.test(to || '') || from > to) throw Object.assign(new Error('فترة مخصصة غير صالحة'), { code: 'BAD_PERIOD', status: 400 });
      if (daysBetween(from, to) > 366) throw Object.assign(new Error('الفترة أطول من سنة'), { code: 'BAD_PERIOD', status: 400 });
      f = from; t = to;
      const len = daysBetween(from, to) + 1;
      prev = { from: addDays(from, -len), to: addDays(from, -1) };
      break;
    }
    default: throw Object.assign(new Error('فترة غير معروفة'), { code: 'BAD_PERIOD', status: 400 });
  }
  return { kind: String(period), from: f, to: t, anchor, prev, days: daysBetween(f, t) + 1 };
}
