async function loadData() {

  // ---------------------------
  // 🚦 Risk Status
  // ---------------------------
  const risk = await fetch("/api/risk").then(r => r.json());

  document.getElementById("currentRisk").innerHTML =
    `<span class="${risk.current}">${risk.current}</span>`;

  document.getElementById("futureRisk").innerHTML =
    `<span class="${risk.future}">${risk.future}</span>`;

  // ✅ Confidence text + bar
  document.getElementById("confidence").innerText = risk.confidence;
  document.getElementById("confidenceBar").style.width = risk.confidence + "%";

  document.getElementById("uncertainty").innerText = risk.uncertainty;

  // ---------------------------
  // 🔊 Voice Alert Visualization
  // ---------------------------
  const voiceIndicator = document.getElementById("voiceIndicator");

  if (risk.current === "High") {
    voiceIndicator.classList.add("voice-active");
  } else {
    voiceIndicator.classList.remove("voice-active");
  }

  // ---------------------------
  // 🚶 Human Fall Status
  // ---------------------------
  const fall = await fetch("/api/fall").then(r => r.json());

  const fallEl = document.getElementById("fallDetected");

  if (fall.detected) {
    fallEl.innerText = "YES";
    fallEl.className = "status-badge status-yes";
  } else {
    fallEl.innerText = "NO";
    fallEl.className = "status-badge status-no";
  }

  document.getElementById("fallConfidence").innerText =
    fall.confidence ?? 0;

  // ---------------------------
  // ⏳ Inactivity Timer (✅ STEP 5)
  // ---------------------------
  const inactivity = await fetch("/api/inactivity").then(r => r.json());

  const duration = inactivity.duration ?? 0;
  const threshold = inactivity.threshold ?? 20;
  const unconscious = inactivity.unconscious ?? false;

  const percent = Math.min((duration / threshold) * 100, 100);

  const bar = document.getElementById("inactivityBar");
  bar.style.width = percent + "%";

  // Color logic
  bar.classList.remove("warning", "critical");

  if (percent > 70 && percent < 100) {
    bar.classList.add("warning");
  }
  if (percent >= 100) {
    bar.classList.add("critical");
  }

  document.getElementById("inactivityTime").innerText = duration;
  document.getElementById("inactivityThreshold").innerText = threshold;

  document.getElementById("inactivityStatus").innerText =
    unconscious ? "UNCONSCIOUS" : "Monitoring";

  // ---------------------------
  // 🧠 Counterfactual Reasoning
  // ---------------------------
  const cf = await fetch("/api/counterfactual").then(r => r.json());

  let cfHtml = "";
  for (let k in cf) {
    cfHtml += `<li>${k}: <b>${cf[k]}</b></li>`;
  }
  document.getElementById("counterfactual").innerHTML = cfHtml;

  // ---------------------------
  // 🌍 Spatial Risk
  // ---------------------------
  const spatial = await fetch("/api/spatial").then(r => r.json());

  let spHtml = "";
  for (let k in spatial) {
    spHtml += `<li>${k}: <span class="${spatial[k]}">${spatial[k]}</span></li>`;
  }
  document.getElementById("spatial").innerHTML = spHtml;

  // ---------------------------
  // 📩 Alerts Log (Auto-scroll)
  // ---------------------------
  const alerts = await fetch("/api/alerts").then(r => r.json());

  let alHtml = "";
  alerts.forEach(a => {
    alHtml += `<li>${a.time} — ${a.recipient}: ${a.message}</li>`;
  });

  const alertsEl = document.getElementById("alerts");
  alertsEl.innerHTML = alHtml;

  // 🔽 Auto-scroll to latest alert
  alertsEl.parentElement.scrollTop =
    alertsEl.parentElement.scrollHeight;
}


// ---------------------------------
// 🔁 AUTO-REFRESH DASHBOARD
// ---------------------------------
setInterval(loadData, 2000);  // refresh every 2 seconds
loadData();                   // initial load
