/* ================= CONFIG ================= */
const SHEET_ID =
  "2PACX-1vQpueWZ1bGx04P79rJ_fiXOawJzqBf0T9TTJppeeGldYqvzrUHhu_wKZe8nzcChDlYG7Q484QkAGyKz";

const SHEET_URL =
  `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;

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
  const now = new Date();
  document.getElementById("current-time").innerText =
    now.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
}
setInterval(updateTime, 1000);
updateTime();

/* ================= LOAD DATA ================= */
Promise.all([
  fetch(SHEET_URL).then(res => res.text()),
  fetch(`https://api.aladhan.com/v1/timings/${new Date().getDate()}-${new Date().getMonth()+1}-${new Date().getFullYear()}?latitude=${UNIVERSITY_LAT}&longitude=${UNIVERSITY_LON}&method=1&school=1`)
    .then(res => res.json())
])
.then(([csv, apiData]) => {

  const rows = csv
    .trim()
    .split(/\r?\n/)
    .map(r => r.split(",").map(c => c.trim()));

  const dataRows = rows.slice(1);
  dataRows.sort((a, b) => new Date(b[0]) - new Date(a[0]));
  const row = dataRows[0];

  if (!row) {
    document.getElementById("next-prayer").innerText =
      "No timetable available";
    return;
  }

  document.getElementById("masjid-name").innerText = "IUST Masjid";

  const timings = apiData.data.timings;
  const hijri = apiData.data.date.hijri;

  // ✅ Show Hijri date from prayer timings API
  document.getElementById("hijri-date").innerText =
    `${hijri.day} ${hijri.month.en}, ${hijri.year} AH`;

  // ✅ Fajr +1 minute
  const fajrAzan = addMinutes(timings.Fajr.split(" ")[0], 1);

  // ✅ Maghrib +2 minutes
  const maghribAzan = addMinutes(timings.Maghrib.split(" ")[0], 2);

  // Maghrib Iqamah = adjusted Maghrib + 6 minutes
  const maghribIqamah = addMinutes(maghribAzan, 6);

  document.getElementById("sehri").innerText = to12Hour(fajrAzan);
  document.getElementById("iftaar").innerText = to12Hour(maghribAzan);

  const today = new Date();
  const isFriday = today.getDay() === 5;

  let prayers;
  if (isFriday) {
    prayers = [
      { name: "Fajr", azan: fajrAzan, iqamah: row[2] },
      { name: "Jummah", azan: "13:00", iqamah: "13:30" }, // fixed Jummah times
      { name: "Asr", azan: row[5], iqamah: row[6] },
      { name: "Maghrib", azan: maghribAzan, iqamah: maghribIqamah },
      { name: "Isha", azan: row[9], iqamah: row[10] }
    ];
  } else {
    prayers = [
      { name: "Fajr", azan: fajrAzan, iqamah: row[2] },
      { name: "Zuhr", azan: row[3], iqamah: row[4] },
      { name: "Asr", azan: row[5], iqamah: row[6] },
      { name: "Maghrib", azan: maghribAzan, iqamah: maghribIqamah },
      { name: "Isha", azan: row[9], iqamah: row[10] }
    ];
  }

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
    let activeIndex = -1;

    for (let i = 0; i < prayers.length; i++) {
      const az = toDate24(prayers[i].azan);
      const iq = toDate24(prayers[i].iqamah);
      if (!az || !iq) continue;

      if (now < az) {
        activeIndex = i;
        document.getElementById("next-prayer").innerText =
          `Next Azan (${prayers[i].name}) in ${formatRemaining(az - now)}`;
        document.getElementById("next-iqamah").innerText =
          `Next Iqamah in ${formatRemaining(iq - now)}`;
        break;
      }

      if (now >= az && now < iq) {
        activeIndex = i;
        document.getElementById("next-prayer").innerText = "--";
        document.getElementById("next-iqamah").innerText =
          `Iqamah in ${formatRemaining(iq - now)}`;
        break;
      }
    }

    if (activeIndex === -1) {
      document.getElementById("next-prayer").innerText = "--";
      document.getElementById("next-iqamah").innerText = "--";
    }

    document.querySelectorAll("#prayer-table tr").forEach((tr, i) => {
      tr.classList.toggle("current-prayer", i === activeIndex);
    });
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

})
.catch(() => {
  document.getElementById("next-prayer").innerText =
    "Unable to load timetable";
});
