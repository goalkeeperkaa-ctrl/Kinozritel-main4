const escapeCsv = (value) => {
  const source = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(source)) {
    return `"${source.replace(/"/g, '""')}"`;
  }
  return source;
};

export const toCsv = (rows) => {
  if (!rows || rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    const line = headers.map((header) => escapeCsv(row[header])).join(',');
    lines.push(line);
  }

  return lines.join('\n');
};
