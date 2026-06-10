// ============================================
// UTILITIES & SHARED FUNCTIONS
// ============================================

function createTableRow(tVal = "", rVal = "") {
  const tr = document.createElement("tr");
  tr.className = "border-b border-slate-100 data-row";
  tr.innerHTML = `
    <td class="p-2">
      <input type="number" class="w-full p-2 border border-slate-200 rounded input-t" value="${tVal}">
    </td>
    <td class="p-2">
      <input type="number" class="w-full p-2 border border-slate-200 rounded input-r" value="${rVal}">
    </td>
    <td class="p-2 text-center">
      <button class="text-red-500 font-bold hover:text-red-700 btn-delete px-2">&times;</button>
    </td>
  `;
  const deleteBtn = tr.querySelector(".btn-delete");
  deleteBtn.addEventListener("click", () => tr.remove());
  return tr;
}

function attachDeleteListeners() {
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.removeEventListener("click", deleteRowHandler);
    btn.addEventListener("click", deleteRowHandler);
  });
}

function deleteRowHandler(e) {
  e.target.closest("tr").remove();
}

function getTableData() {
  const rows = document.querySelectorAll(".data-row");
  let xData = [];
  let yData = [];

  rows.forEach((row) => {
    const tVal = parseFloat(row.querySelector(".input-t").value);
    const rVal = parseFloat(row.querySelector(".input-r").value);
    if (!isNaN(tVal) && !isNaN(rVal)) {
      xData.push(tVal);
      yData.push(rVal);
    }
  });

  return { xData, yData };
}

// ============================================
// INDEX.HTML - EVALUASI DASAR
// ============================================

function initEvaluasiPage() {
  const aInput = document.getElementById("batas-bawah");
  const bInput = document.getElementById("batas-atas");
  const fInput = document.getElementById("fungsi");
  const previewMath = document.getElementById("preview-math");
  const btnHitung = document.getElementById("btn-hitung");
  const outputWrapper = document.getElementById("output-wrapper");

  if (!btnHitung) return; // Page not loaded

  function updatePreview() {
    const a = aInput.value || "\\square";
    const b = bInput.value || "\\square";
    const f = fInput.value || "\\square";
    previewMath.value = `\\int_{${a}}^{${b}} (${f}) \\,dx`;
  }

  aInput.addEventListener("keyup", updatePreview);
  bInput.addEventListener("keyup", updatePreview);
  fInput.addEventListener("keyup", updatePreview);

  btnHitung.addEventListener("click", async () => {
    btnHitung.textContent = "Menghitung...";

    try {
      const response = await fetch("/api/hitung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batas_bawah: aInput.value,
          batas_atas: bInput.value,
          fungsi: fInput.value.replace(/\^/g, "**"),
        }),
      });

      const res = await response.json();

      if (res.status === "success") {
        outputWrapper.classList.remove("hidden");

        const v = res.variabel;
        const varTotal = "D";

        previewMath.value = `\\int_{${res.batas_bawah}}^{${res.batas_atas}} (${res.fungsi_latex}) \\,d${v}`;

        document.getElementById("step1-math").value =
          `\\int (${res.fungsi_latex}) \\,d${v} = ${res.antiturunan_latex}`;
        document.getElementById("step-bracket-math").value =
          `${varTotal} = ${res.bracket_latex}`;

        document.getElementById("step-atas-raw").value = res.step_atas_raw;
        document.getElementById("step-atas-final").value = res.hasil_atas;

        document.getElementById("step-bawah-raw").value = res.step_bawah_raw;
        document.getElementById("step-bawah-final").value = res.hasil_bawah;

        document.getElementById("step3-selisih").value =
          `${varTotal} = ${res.hasil_atas} - ${res.hasil_bawah}`;
        document.getElementById("step3-final").value =
          `${varTotal} = ${res.hasil_akhir}`;

        document.getElementById("teks-kesimpulan").innerHTML =
          `Kesimpulannya, nilai total akumulasi dari interval batas <strong>${v} = ${res.batas_bawah}</strong> sampai <strong>${v} = ${res.batas_atas}</strong> adalah <strong>${res.hasil_akhir}</strong>.`;
        document.getElementById("hasil-final-text").textContent =
          res.hasil_desimal;
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert("Tidak Terhubung Pada BackEnd.");
    } finally {
      btnHitung.textContent = "Hitung Integral";
    }
  });
}

// ============================================
// PERMODELAN.HTML - CURVE FITTING & REGRESSION
// ============================================

let regChart = null;

function initPermodelanPage() {
  const tableBody = document.getElementById("table-body");
  const btnAddRow = document.getElementById("btn-add-row");
  const fileCsv = document.getElementById("file-csv");
  const btnHitung = document.getElementById("btn-hitung");
  const outputWrapper = document.getElementById("output-wrapper");

  if (!btnHitung) return; // Page not loaded

  // Initialize Chart.js
  const ctx = document.getElementById("regression-chart");
  if (ctx) {
    regChart = new Chart(ctx.getContext("2d"), {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Data Mentah (t, r)",
            data: [],
            backgroundColor: "rgb(239, 68, 68)",
            pointRadius: 6,
          },
          {
            type: "line",
            label: "Kurva Regresi",
            data: [],
            borderColor: "rgb(37, 99, 235)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: "Waktu (t)" } },
          y: { title: { display: true, text: "Laju (r)" } },
        },
      },
    });
  }

  // Add Row Button
  if (btnAddRow) {
    btnAddRow.addEventListener("click", () => {
      tableBody.appendChild(createTableRow());
    });
  }

  // Delete Listeners
  attachDeleteListeners();

  // CSV Upload
  if (fileCsv) {
    fileCsv.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split("\n").filter((row) => row.trim() !== "");

        tableBody.innerHTML = "";

        rows.forEach((row) => {
          const cols = row.split(",");
          if (cols.length >= 2) {
            const t = parseFloat(cols[0].trim());
            const r = parseFloat(cols[1].trim());
            if (!isNaN(t) && !isNaN(r)) {
              tableBody.appendChild(createTableRow(t, r));
            }
          }
        });
      };
      reader.readAsText(file);
    });
  }

  // Calculate Button
  btnHitung.addEventListener("click", async () => {
    btnHitung.textContent = "Memproses Data...";

    const { xData, yData } = getTableData();

    if (xData.length < 2) {
      alert("Bro, minimal masukin 2 titik data biar bisa diregresi!");
      btnHitung.textContent = "Proses Regresi & Hitung Integral";
      return;
    }

    const orde = parseInt(document.getElementById("orde-regresi").value);

    try {
      const response = await fetch("/api/regresi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xData: xData, yData: yData, orde: orde }),
      });

      const res = await response.json();

      if (res.status === "success") {
        outputWrapper.classList.remove("hidden");

        // Update Chart
        const rawDataPoints = xData.map((x, i) => ({ x: x, y: yData[i] }));
        regChart.data.datasets[0].data = rawDataPoints;
        regChart.data.datasets[1].data = res.chart_data;
        regChart.update();

        // Update Math Fields
        const v = res.variabel;
        const varTotal = "D";

        document.getElementById("preview-math").value =
          `f(${v}) = ${res.fungsi_latex}`;
        document.getElementById("step1-math").value =
          `\\int (${res.fungsi_latex}) \\,d${v} = ${res.antiturunan_latex}`;
        document.getElementById("step-bracket-math").value =
          `${varTotal} = ${res.bracket_latex}`;

        document.getElementById("step-atas-raw").value = res.step_atas_raw;
        document.getElementById("step-atas-final").value = res.hasil_atas;

        document.getElementById("step-bawah-raw").value = res.step_bawah_raw;
        document.getElementById("step-bawah-final").value = res.hasil_bawah;

        document.getElementById("step3-selisih").value =
          `${varTotal} = ${res.hasil_atas} - ${res.hasil_bawah}`;
        document.getElementById("step3-final").value =
          `${varTotal} = ${res.hasil_akhir}`;

        document.getElementById("teks-kesimpulan").innerHTML =
          `Kesimpulannya, nilai total akumulasi dari rentang observasi <strong>${v} = ${res.batas_bawah}</strong> sampai <strong>${v} = ${res.batas_atas}</strong> adalah <strong>${res.hasil_akhir}</strong>.`;
        document.getElementById("hasil-final-text").textContent =
          res.hasil_desimal;
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert(
        "Tidak Terhubung Pada BackEnd.",
      );
    } finally {
      btnHitung.textContent = "Proses Regresi & Hitung Integral";
    }
  });
}

// ============================================
// KOMPARASI.HTML - NUMERIC vs ANALYTIC
// ============================================

function initKomparasiPage() {
  const tableBody = document.getElementById("table-body");
  const btnAddRow = document.getElementById("btn-add-row");
  const btnHitung = document.getElementById("btn-hitung");
  const outputWrapper = document.getElementById("output-wrapper");

  if (!btnHitung) return; // Page not loaded

  // Add Row Button
  if (btnAddRow) {
    btnAddRow.addEventListener("click", () => {
      tableBody.appendChild(createTableRow());
    });
  }

  // Delete Listeners
  attachDeleteListeners();

  // Calculate Button
  btnHitung.addEventListener("click", async () => {
    btnHitung.textContent = "Menghitung...";

    const { xData, yData } = getTableData();

    if (xData.length < 2) {
      alert("Minimal 2 titik data bro!");
      btnHitung.textContent = "Jalankan Komparasi";
      return;
    }

    try {
      const res = await fetch("/api/komparasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xData: xData,
          yData: yData,
          orde: parseInt(document.getElementById("orde-regresi").value),
        }),
      }).then((r) => r.json());

      if (res.status === "success") {
        outputWrapper.classList.remove("hidden");

        // Numerik
        document.getElementById("math-numerik-raw").value =
          `A \\approx ${res.numerik_raw_latex}`;
        document.getElementById("hasil-numerik").textContent = res.numerik_luas;

        // Analitik
        document.getElementById("math-analitik-fungsi").value =
          `f(t) = ${res.analitik_fungsi_latex}`;
        document.getElementById("hasil-analitik").textContent =
          res.analitik_luas;

        // Selisih
        document.getElementById("hasil-selisih").textContent =
          res.selisih_error;
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert("Tidak Terhubung Pada BackEnd.");
    } finally {
      btnHitung.textContent = "Jalankan Komparasi";
    }
  });
}

// ============================================
// INITIALIZE ON DOCUMENT LOAD
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // Detect which page is loaded and init accordingly
  if (document.getElementById("btn-hitung")) {
    // Check which page by looking for unique elements
    if (document.getElementById("regression-chart")) {
      initPermodelanPage();
    } else if (document.getElementById("math-numerik-raw")) {
      initKomparasiPage();
    } else if (document.getElementById("batas-bawah")) {
      initEvaluasiPage();
    }
  }
});
