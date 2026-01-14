/* ================= CONFIG ================= */
const SHEET_ID =
  "2PACX-1vQpueWZ1bGx04P79rJ_fiXOawJzqBf0T9TTJppeeGldYqvzrUHhu_wKZe8nzcChDlYG7Q484QkAGyKz";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;

/* ================= TIME FORMAT HELPERS ================= */
function to12Hour(timeStr) {
  if (!timeStr || timeStr === "-" || timeStr === "--") return "--";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function toDate24(timeStr) {
  if (!timeStr || timeStr === "-" || timeStr === "--") return null;
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

/* ================= CURRENT TIME ================= */
function updateTime() {
  document.getElementById("current-time").innerText =
    new Date().toLocaleTimeString();
}
setInterval(updateTime, 1000);
updateTime();

/* ================= HIJRI DATE (PHONE SAFE) ================= */
function loadHijriDate() {
  const d = new Date();
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  fetch(`https://api.aladhan.com/v1/gToH/${day}-${month}-${year}`)
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

/* ================= MAIN LOGIC ================= */
fetch(SHEET_URL)
  .then(res => res.text())
  .then(csv => {
    const rows = csv.trim().split("\n").map(r => r.split(","));
    const today = new Date().toISOString().split("T")[0];

    const row = rows.find(r => r[0] === today);
    if (!row) {
      document.getElementById("next-prayer").innerText =
        "No timetable for today";
      return;
    }

    /* ===== MASJID NAME (FIXED) ===== */
    document.getElementById("masjid-name").innerText = "IUST Masjid";

    /* ===== SEHRI / IFTAAR ===== */
    document.getElementById("sehri").innerText = to12Hour(row[11]);
    document.getElementById("iftaar").innerText = to12Hour(row[12]);

    /* ===== PRAYERS ===== */
    const prayers = [
      { name: "Fajr", azan: row[1], iqamah: row[2] },
      { name: "Zuhr", azan: row[3], iqamah: row[4] },
      { name: "Asr", azan: row[5], iqamah: row[6] },
      { name: "Maghrib", azan: row[7], iqamah: row[8] },
      { name: "Isha", azan: row[9], iqamah: row[10] }
    ];

    /* ===== TABLE RENDER ===== */
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

    /* ===== COUNTDOWN + HIGHLIGHT ===== */
    function updateCountdown() {
      const now = new Date();
      let nextA = null,
        nextI = null,
        nextName = "";
      let currentIndex = -1;

      const azanDates = prayers.map(p => toDate24(p.azan));

      prayers.forEach((p, i) => {
        const az = azanDates[i];
        const nextAz = azanDates[i + 1] || null;

        // CURRENT PRAYER
        if (az && az <= now && (!nextAz || now < nextAz)) {
          currentIndex = i;
        }

        // NEXT AZAN
        if (az && az > now && (!nextA || az < nextA)) {
          nextA = az;
          nextName = p.name;
        }

        // NEXT IQAMAH
        const iq = toDate24(p.iqamah);
        if (iq && iq > now && (!nextI || iq < nextI)) {
          nextI = iq;
        }
      });

      document.getElementById("next-prayer").innerText =
        nextA
          ? `Next Azan (${nextName}) in ${formatRemaining(nextA - now)}`
          : "--";

      document.getElementById("next-iqamah").innerText =
        nextI
          ? `Next Iqamah in ${formatRemaining(nextI - now)}`
          : "--";

      // HIGHLIGHT CURRENT PRAYER
      document.querySelectorAll("#prayer-table tr").forEach((tr, i) => {
        tr.classList.toggle("current-prayer", i === currentIndex);
      });
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();
  });
