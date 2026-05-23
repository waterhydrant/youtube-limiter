export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getDaysSinceLocalDate(dateKey) {
  if (!dateKey) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = parseLocalDateKey(dateKey);
  lastDate.setHours(0, 0, 0, 0);

  return Math.floor((today - lastDate) / 86400000);
}
