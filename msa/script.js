/* ================= CONFIG ================= */
const SHEET_ID =
  "2PACX-1vQpueWZ1bGx04P79rJ_fiXOawJzqBf0T9TTJppeeGldYqvzrUHhu_wKZe8nzcChDlYG7Q484QkAGyKz";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;

const UNIVERSITY_LAT = 33.92638793514241;
const UNIVERSITY_LON = 75.01850788847442;

/* ================= TIME HELPERS ================= */
function to12Hour(timeStr) {
  if (!timeStr) return "--";
  const clean = timeStr.split(" ")[0];
  const [h, m] = clean.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function addMinutes(timeStr, minutesToAdd) {
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m + minutesToAdd, 0, 0);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function toDate24(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.split(" ")[0];
  const [h, m] = clean.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatRemaining(ms) {
  if (!ms || ms <= 0) return "--";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

/* ================= CURRENT TIME ================= */
function updateTime() {
  document.getElementById("current-time").innerText =
    new Date().toLocaleTimeString();
}
setInterval(updateTime, 1000);
updateTime();

/* ================= HIJRI DATE ================= */
function loadHijriDate() {
  const d = new Date();
  fetch(`https://api.aladhan.com/v1/gToH/${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`)
    .then(res => res.json())
    .then(data => {
      const h = data.data.hijri;
      document.getElementById("hijri-date").innerText =
        `${h.day} ${h.month.en}, ${h.year} AH`;
    })
    .catch(() => {
      document.getElementById("hijri-date").innerText = "--";
    });
}
loadHijriDate();

/* ================= LOAD DATA ================= */
Promise.all([
  fetch(SHEET_URL).then(res => res.text()),
  fetch(`https://api.aladhan.com/v1/timings/${new Date().getDate()}-${new Date().getMonth()+1}-${new Date().getFullYear()}?latitude=${UNIVERSITY_LAT}&longitude=${UNIVERSITY_LON}&method=1`)
    .then(res => res.json())
])
.then(([csv, apiData]) => {

  const rows = csv
    .trim()
    .split(/\r?\n/)
    .map(r => r.split(",").map(c => c.trim()));

  // ✅ LATEST available date from sheet
  const row = rows[rows.length - 1];

  if (!row) {
    document.getElementById("next-prayer").innerText =
      "No timetable available";
    return;
  }

  document.getElementById("masjid-name").innerText = "IUST Masjid";

  const timings = apiData.data.timings;

  const fajrAzanAPI = timings.Fajr.split(" ")[0];
  const maghribAzanAPI = timings.Maghrib.split(" ")[0];
  const maghribIqamahCalculated = addMinutes(maghribAzanAPI, 5);

  // Sehri & Iftaar from API
  document.getElementById("sehri").innerText =
    to12Hour(fajrAzanAPI);

  document.getElementById("iftaar").innerText =
    to12Hour(maghribAzanAPI);

  const prayers = [
    { name: "Fajr", azan: fajrAzanAPI, iqamah: row[2] },
    { name: "Zuhr", azan: row[3], iqamah: row[4] },
    { name: "Asr", azan: row[5], iqamah: row[6] },
    { name: "Maghrib", azan: maghribAzanAPI, iqamah: maghribIqamahCalculated },
    { name: "Isha", azan: row[9], iqamah: row[10] }
  ];

  const table = document.getElementById("prayer-table");
  table.innerHTML = "";

  prayers.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${to12Hour(p.azan)}</td>
        <td>${to12Hour(p.iqamah)}</td>
      </tr>
    `;
  });

  function updateCountdown() {
    const now = new Date();
    let nextA = null;
    let nextName = "";
    let nextIndex = -1;

    prayers.forEach((p, i) => {
      const az = toDate24(p.azan);
      if (az && az > now && (!nextA || az < nextA)) {
        nextA = az;
        nextName = p.name;
        nextIndex = i;
      }
    });

    if (nextIndex === -1) nextIndex = 0;

    document.getElementById("next-prayer").innerText =
      nextA
        ? `Next Azan (${nextName}) in ${formatRemaining(nextA - now)}`
        : "--";

    document.querySelectorAll("#prayer-table tr").forEach((tr, i) => {
      tr.classList.toggle("current-prayer", i === nextIndex);
    });
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

})
.catch(() => {
  document.getElementById("next-prayer").innerText =
    "Unable to load timetable";
});
