export function parseWorkbook(wb) {
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
 
  let title = "";
  for (let r = 0; r < Math.min(3, aoa.length); r++) {
    if (aoa[r] && typeof aoa[r][0] === "string" && aoa[r][0].trim().length > 5) {
      title = aoa[r][0].trim();
      break;
    }
  }
 
  let diffColsRaw = [];
  let headerRow = -1;
  for (let r = 0; r < Math.min(6, aoa.length); r++) {
    const row = aoa[r] || [];
    row.forEach((cell, c) => {
      if (typeof cell === "string" && cell.toLowerCase().includes("daily difference")) {
        diffColsRaw.push(c);
        headerRow = r;
      }
    });
  }
  diffColsRaw = [...new Set(diffColsRaw)].sort((a, b) => a - b);
  if (diffColsRaw.length === 0) {
    throw new Error(
      'Could not find "Daily Difference" columns in this sheet — the file layout looks different from the expected meter-reading template.'
    );
  }
 
  const headerRowData = aoa[headerRow] || [];
  const paired = diffColsRaw.map((c) => ({ col: c, date: headerRowData[c + 1] })).filter((p) => p.date instanceof Date);
 
  const monthKeyCounts = {};
  paired.forEach((p) => {
    const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
    monthKeyCounts[key] = (monthKeyCounts[key] || 0) + 1;
  });
  const targetMonthKey = Object.entries(monthKeyCounts).sort((a, b) => b[1] - a[1])[0][0];
 
  const diffCols = paired
    .filter((p) => `${p.date.getFullYear()}-${p.date.getMonth()}` === targetMonthKey)
    .sort((a, b) => a.date - b.date);
 
  let nameRow = -1;
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r] || [];
    if (row.some((c) => typeof c === "string" && c.toLowerCase().includes("exchange name"))) {
      nameRow = r;
      break;
    }
  }
  const dataStart = nameRow >= 0 ? nameRow + 2 : (headerRow >= 0 ? headerRow + 2 : 3);
 
  const days = diffCols.map((p) => p.date.getDate());
 
  const sites = [];
  for (let r = dataStart; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const rawName = row[1];
    if (!rawName || String(rawName).trim() === "") continue;
    const name = String(rawName).replace(/\s+/g, " ").trim();
    const readings = diffCols.map((p) => {
      const v = row[p.col];
      return typeof v === "number" && isFinite(v) ? v : null;
    });
    const fuel = diffCols.map((p) => {
      const v = row[p.col + 1];
      return typeof v === "number" && isFinite(v) ? v : null;
    });
    sites.push({ name, faulty: isFaulty(name), readings, fuel });
  }
 
  if (sites.length === 0) {
    throw new Error("Found the day columns but no exchange/site rows underneath them.");
  }
 
  const [targetYear, targetMonth] = targetMonthKey.split("-").map(Number);
  const monthLabel = new Date(targetYear, targetMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
 
  return { title, days, sites, monthKey: targetMonthKey, monthLabel };
}