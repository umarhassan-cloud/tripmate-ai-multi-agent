let currentThreadId = localStorage.getItem("travel_thread_id") || null;
let latestAnswerMarkdown = "";
let waitingForApproval = false;
let latestData = null;

const AGENT_LABELS = {
  flight_agent: "Flight Agent",
  hotel_agent: "Hotel Agent",
  weather_agent: "Weather Agent",
  budget_agent: "Budget Agent",
  itinerary_agent: "Itinerary Agent"
};

const SPECIALISTS = Object.keys(AGENT_LABELS);

// Result tabs: the plan itself plus each specialist's raw output (when present).
const RESULT_TABS = [
  { key: "plan", label: "Travel plan" },
  { key: "flight_results", label: "Flights" },
  { key: "hotel_results", label: "Hotels" },
  { key: "weather_results", label: "Weather" },
  { key: "budget_results", label: "Budget" }
];

function setPrompt(text) {
  const input = document.getElementById("userInput");
  input.value = text;
  input.focus();
}

function setLoading(isLoading, mode = "draft") {
  const sendBtn = document.getElementById("sendBtn");
  const btnText = document.getElementById("btnText");
  const btnLoader = document.getElementById("btnLoader");
  const approveBtn = document.getElementById("approveBtn");
  const reviseBtn = document.getElementById("reviseBtn");

  sendBtn.disabled = isLoading;
  approveBtn.disabled = isLoading;
  reviseBtn.disabled = isLoading;

  if (isLoading && mode === "draft") {
    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");
  } else {
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
  }
}

function showError(message) {
  const errorBox = document.getElementById("errorBox");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  const errorBox = document.getElementById("errorBox");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function renderMarkdown(element, markdown) {
  if (typeof marked !== "undefined") {
    const html = marked.parse(markdown || "");
    // LLM output is untrusted, so sanitize before injecting it into the page.
    element.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(html) : html;
  } else {
    element.innerText = markdown || "";
  }
}

// ---------- Pipeline graph ----------

function setNodeState(name, state) {
  const node = document.querySelector(`.node[data-node="${name}"]`);
  if (!node) {
    return;
  }
  node.classList.remove("active", "done", "waiting", "blocked", "skipped");
  if (state) {
    node.classList.add(state);
  }
}

function setPipelineStatus(text, state) {
  const status = document.getElementById("pipelineStatus");
  status.textContent = text;
  status.className = `pipeline-status ${state || ""}`;
}

function pipelineRunning(stage) {
  if (stage === "draft") {
    ["guardrail", "supervisor", ...SPECIALISTS].forEach((n) => setNodeState(n, "active"));
    ["human_approval", "final_agent"].forEach((n) => setNodeState(n, null));
    setPipelineStatus("Running agents…", "running");
  } else {
    setNodeState("human_approval", "done");
    setNodeState("final_agent", "active");
    setPipelineStatus("Writing final plan…", "running");
  }
}

function pipelineFromResult(data) {
  if (data.guardrail_allowed === false) {
    setNodeState("guardrail", "blocked");
    ["supervisor", ...SPECIALISTS, "human_approval", "final_agent"].forEach((n) =>
      setNodeState(n, "skipped")
    );
    setPipelineStatus("Blocked by guardrail", "blocked");
    return;
  }

  const selected = new Set(data.selected_agents || []);
  // The itinerary agent always runs before human review.
  selected.add("itinerary_agent");

  setNodeState("guardrail", "done");
  setNodeState("supervisor", "done");
  SPECIALISTS.forEach((n) => setNodeState(n, selected.has(n) ? "done" : "skipped"));

  if (data.requires_approval) {
    setNodeState("human_approval", "waiting");
    setNodeState("final_agent", null);
    setPipelineStatus("Awaiting your review", "waiting");
  } else {
    setNodeState("human_approval", "done");
    setNodeState("final_agent", "done");
    setPipelineStatus("Completed", "done");
  }
}

function pipelineReset() {
  ["guardrail", "supervisor", ...SPECIALISTS, "human_approval", "final_agent"].forEach((n) =>
    setNodeState(n, null)
  );
  setPipelineStatus("Idle", "");
}

// ---------- Workflow summary ----------

function showWorkflow(data, elapsedMs) {
  const section = document.getElementById("workflowSection");
  const reasoning = document.getElementById("supervisorReasoning");
  const chips = document.getElementById("agentChips");
  const guardrailBadge = document.getElementById("guardrailBadge");

  reasoning.textContent =
    data.supervisor_reasoning || data.guardrail_reason || "Supervisor routing completed.";
  chips.innerHTML = "";

  const agents = data.selected_agents || [];
  agents.forEach((agent) => {
    const chip = document.createElement("span");
    chip.className = "agent-chip";
    chip.textContent = AGENT_LABELS[agent] || agent;
    chips.appendChild(chip);
  });

  document.getElementById("statAgents").textContent = agents.length;
  document.getElementById("statLlm").textContent = data.llm_calls || 0;
  if (typeof elapsedMs === "number") {
    document.getElementById("statTime").textContent = `${(elapsedMs / 1000).toFixed(1)}s`;
  }

  if (data.guardrail_allowed === false) {
    guardrailBadge.textContent = "Guardrail blocked";
    guardrailBadge.classList.add("blocked");
  } else {
    guardrailBadge.textContent = "Guardrail passed";
    guardrailBadge.classList.remove("blocked");
  }

  section.classList.remove("hidden");
}

// ---------- Result + tabs ----------

function tabContent(key) {
  if (!latestData) {
    return "";
  }
  if (key === "plan") {
    return latestData.__plan || "";
  }
  return latestData[key] || "";
}

function selectTab(key) {
  document.querySelectorAll("#resultTabs .tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.key === key);
  });
  latestAnswerMarkdown = tabContent(key);
  renderMarkdown(document.getElementById("resultBox"), latestAnswerMarkdown);
}

function renderTabs() {
  const tabs = document.getElementById("resultTabs");
  tabs.innerHTML = "";

  const available = RESULT_TABS.filter((t) => t.key === "plan" || tabContent(t.key).trim());
  if (available.length < 2) {
    return;
  }

  available.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.type = "button";
    btn.dataset.key = t.key;
    btn.textContent = t.label;
    btn.onclick = () => selectTab(t.key);
    tabs.appendChild(btn);
  });
}

function showResult(data, answer, isDraft = false) {
  latestData = { ...data, __plan: answer || "" };

  const resultSection = document.getElementById("resultSection");
  const threadInfo = document.getElementById("threadInfo");
  const resultTitle = document.getElementById("resultTitle");
  const resultEyebrow = document.getElementById("resultEyebrow");

  threadInfo.textContent = `Thread ID: ${data.thread_id}`;
  resultTitle.textContent = isDraft ? "Draft travel plan" : "Your final travel plan";
  resultEyebrow.textContent = isDraft ? "Step 2 · Draft" : "Step 4 · Final plan";

  renderTabs();
  selectTab("plan");
  resultSection.classList.remove("hidden");

  resultSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function showApproval(data) {
  waitingForApproval = true;
  const section = document.getElementById("approvalSection");
  const approvalRequest = document.getElementById("approvalRequest");
  approvalRequest.textContent = data.approval_request ||
    "Approve the draft or provide feedback before the final plan is generated.";
  section.classList.remove("hidden");
}

function hideApproval() {
  waitingForApproval = false;
  document.getElementById("approvalSection").classList.add("hidden");
  document.getElementById("approvalFeedback").value = "";
}

// ---------- API calls ----------

async function sendMessage() {
  hideError();

  if (waitingForApproval) {
    showError("Please approve or revise the current draft before starting another plan.");
    return;
  }

  const input = document.getElementById("userInput");
  const message = input.value.trim();

  if (!message) {
    showError("Please enter your travel request first.");
    return;
  }

  setLoading(true, "draft");
  pipelineRunning("draft");
  const startedAt = performance.now();

  try {
    const response = await fetch("/api/travel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message,
        thread_id: currentThreadId
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Something went wrong.");
    }

    currentThreadId = data.thread_id;
    localStorage.setItem("travel_thread_id", currentThreadId);

    showWorkflow(data, performance.now() - startedAt);
    pipelineFromResult(data);

    if (data.requires_approval) {
      showResult(data, data.itinerary || data.answer, true);
      showApproval(data);
    } else {
      hideApproval();
      showResult(data, data.answer, false);
    }
  } catch (error) {
    pipelineReset();
    showError(error.message);
  } finally {
    setLoading(false, "draft");
  }
}

async function submitApproval(approved) {
  hideError();

  if (!currentThreadId || !waitingForApproval) {
    showError("There is no draft waiting for approval.");
    return;
  }

  const feedbackInput = document.getElementById("approvalFeedback");
  const feedback = feedbackInput.value.trim();

  if (!approved && !feedback) {
    showError("Please enter revision feedback before requesting changes.");
    feedbackInput.focus();
    return;
  }

  setLoading(true, "approval");
  pipelineRunning("final");
  const startedAt = performance.now();

  try {
    const response = await fetch("/api/travel/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        thread_id: currentThreadId,
        approved: approved,
        feedback: feedback
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not resume the travel workflow.");
    }

    showWorkflow(data, performance.now() - startedAt);
    pipelineFromResult(data);
    hideApproval();
    showResult(data, data.answer, false);
  } catch (error) {
    setNodeState("human_approval", "waiting");
    setNodeState("final_agent", null);
    setPipelineStatus("Awaiting your review", "waiting");
    showError(error.message);
  } finally {
    setLoading(false, "approval");
  }
}

// ---------- Utilities ----------

async function checkHealth() {
  const pill = document.getElementById("statusPill");
  const text = document.getElementById("statusText");

  try {
    const response = await fetch("/health");
    if (!response.ok) {
      throw new Error();
    }
    pill.classList.add("online");
    pill.classList.remove("offline");
    text.textContent = "API online";
  } catch {
    pill.classList.add("offline");
    pill.classList.remove("online");
    text.textContent = "API offline";
  }
}

function copyResult() {
  const resultBox = document.getElementById("resultBox");
  const text = resultBox.innerText;

  if (!text) {
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      const copyBtn = document.querySelector(".copy-btn");
      const oldText = copyBtn.textContent;
      copyBtn.textContent = "Copied!";

      setTimeout(() => {
        copyBtn.textContent = oldText;
      }, 1400);
    })
    .catch(() => {
      showError("Could not copy result.");
    });
}

function downloadPDF() {
  const pdfContent = document.getElementById("pdfContent");

  if (!latestAnswerMarkdown || !pdfContent) {
    showError("No travel plan available to download.");
    return;
  }

  const downloadBtn = document.querySelector(".download-btn");
  const oldText = downloadBtn.textContent;
  downloadBtn.textContent = "Preparing PDF...";
  downloadBtn.disabled = true;

  const pdfTitle = pdfContent.querySelector(".pdf-title");
  pdfTitle.style.display = "block";

  const options = {
    margin: 0.5,
    filename: "tripmate-travel-plan.pdf",
    image: {
      type: "jpeg",
      quality: 0.98
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff"
    },
    jsPDF: {
      unit: "in",
      format: "a4",
      orientation: "portrait"
    },
    pagebreak: {
      mode: ["avoid-all", "css", "legacy"]
    }
  };

  const restore = () => {
    pdfTitle.style.display = "";
    downloadBtn.textContent = oldText;
    downloadBtn.disabled = false;
  };

  html2pdf()
    .set(options)
    .from(pdfContent)
    .save()
    .then(restore)
    .catch(() => {
      restore();
      showError("Could not download PDF.");
    });
}

document.addEventListener("keydown", function(event) {
  if (event.ctrlKey && event.key === "Enter") {
    sendMessage();
  }
});

checkHealth();
