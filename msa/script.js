/* ================= CONFIG ================= */
const SHEET_ID = "2PACX-1vQpueWZ1bGx04P79rJ_fiXOawJzqBf0T9TTJppeeGldYqvzrUHhu_wKZe8nzcChDlYG7Q484QkAGyKz";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;

/* ================= TIME ================= */
function updateTime() {
  document.getElementById("current-time").innerText =
    new Date().toLocaleTimeString();
}
setInterval(updateTime, 1000);
updateTime();

/* ================= HIJRI DATE (FIXED, PHONE-SAFE) ================= */
function loadHijriDate() {
  const today = new Date();
  const d = today.getDate();
  const m = today.getMonth() + 1;
  const y = today.getFullYear();

  fetch(`https://api.aladhan.com/v1/gToH/${d}-${m}-${y}`)
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

/* call once on page load */
loadHijriDate();


/* ================= HELPERS ================= */
function toDate24(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatRemaining(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

/* ================= MAIN ================= */
fetch(SHEET_URL)
  .then(r => r.text())
  .then(csv => {
    const rows = csv.trim().split("\n").map(r => r.split(","));
    const today = new Date().toISOString().split("T")[0];

    const row = rows.find(r => r[0] === today);
    if (!row) {
      document.getElementById("next-prayer").innerText =
        "No timetable for today";
      return;
    }

    document.getElementById("masjid-name").innerText = "IUST-Masjid";

    document.getElementById("sehri").innerText = row[11];
    document.getElementById("iftaar").innerText = row[12];

    const prayers = [
      { name: "Fajr", azan: row[1], iqamah: row[2] },
      { name: "Zuhr", azan: row[3], iqamah: row[4] },
      { name: "Asr", azan: row[5], iqamah: row[6] },
      { name: "Maghrib", azan: row[7], iqamah: row[8] },
      { name: "Isha", azan: row[9], iqamah: row[10] }
    ];

    const table = document.getElementById("prayer-table");
    table.innerHTML = "";
    prayers.forEach(p => {
      table.innerHTML += `
        <tr>
          <td>${p.name}</td>
          <td>${p.azan}</td>
          <td>${p.iqamah}</td>
        </tr>`;
    });

  function updateCountdown() {
  const now = new Date();
  let nextA = null, nextI = null, name = "";
  let currentPrayerIndex = -1;

  const azanTimes = prayers.map(p => toDate24(p.azan));

  prayers.forEach((p, i) => {
    const az = toDate24(p.azan);
    const nextAz = azanTimes[i + 1] || null;

    // CURRENT PRAYER DETECTION
    if (az && az <= now && (!nextAz || now < nextAz)) {
      currentPrayerIndex = i;
    }

    // NEXT AZAN
    if (az && az > now && (!nextA || az < nextA)) {
      nextA = az;
      name = p.name;
    }

    // NEXT IQAMAH
    const iq = toDate24(p.iqamah);
    if (iq && iq > now && (!nextI || iq < nextI)) {
      nextI = iq;
    }
  });

  // UPDATE COUNTDOWN TEXT
  document.getElementById("next-prayer").innerText =
    nextA ? `Next Azan (${name}) in ${formatRemaining(nextA - now)}` : "--";

  document.getElementById("next-iqamah").innerText =
    nextI ? `Next Iqamah in ${formatRemaining(nextI - now)}` : "--";

  // 🔥 HIGHLIGHT CURRENT PRAYER ROW
  document.querySelectorAll("#prayer-table tr").forEach((row, i) => {
    row.classList.toggle("current-prayer", i === currentPrayerIndex);
  });
}


    setInterval(updateCountdown, 1000);
    updateCountdown();
  });

