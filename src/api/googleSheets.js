const API_URL =
  "https://script.google.com/macros/s/AKfycbz9-zDBNOWl5L1Ex_j1vpWwlshqU0TFsuLgUzttzqx8RoSpp9-7MZ7Xo1rVkeItaYKgNg/exec";

export async function getDailyMeterReadings() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Failed to load Google Sheet");
  }

  const data = await response.json();

  const headers = data[0];

  const dateCol = headers.indexOf("Date");
  const siteCol = headers.indexOf("Site");
  const dailyCol = headers.indexOf("Daily_Run_Hours");
  const meterCol = headers.indexOf("Total_Hour_Meter");

  return data.slice(1).map((row) => ({
    date: row[dateCol],
    site: row[siteCol],
    dailyHours: Number(row[dailyCol]),
    hourMeter: Number(row[meterCol]),
  }));
}