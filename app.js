"use strict";

const FB = window.FloorBrief;
const harborExample = FB.defaultState();
let uploadMeta = { sourceFile: "", missingFromFolder: [], transcriptNote: "" };
let state = FB.defaultState();
let view = "input";

const TAGLINES = {
  input: "The brief stays closed until the inputs are in.",
  import: "Bring in a Zoom transcript or a text file. It stays in this browser.",
  record: "Record the meeting here. Speech is written under the person you select.",
  calendar: "Wednesdays at 7:30, plus the dates already on the Headcount charter.",
  feedback: "A specific note for each person, ready to send in WhatsApp.",
};

const MEETING_KEY = "openspace-meetings";
const FEEDBACK_KEY = "openspace-feedback";

let meetings = loadStore(MEETING_KEY);
let savedFeedback = loadStore(FEEDBACK_KEY);
let recording = false;
let mediaRecorder = null;
let recordChunks = [];
let recognition = null;
let recordStream = null;
let liveTranscript = "";
let recordSpeaker = "";
let recordStatus = "Ready when you are.";
let recordUrl = "";
let calCursor = new Date(2026, 9, 1);
let feedbackWho = "";

const inputs = document.getElementById("inputs");
const brief = document.getElementById("brief");
const tagline = document.getElementById("tagline");

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value != null) node.setAttribute(key, value);
  });
  [].concat(children || []).forEach((child) => {
    if (child == null || child === false) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

function field(label, node) {
  return el("div", {}, [el("label", {}, label), node]);
}

function membersNow() {
  return FB.parseRoster(state.rosterText);
}

function bandClass(score) {
  if (score >= 75) return "good";
  if (score >= 50) return "mid";
  return "low";
}

function fillClass(score) {
  if (score >= 75) return "fill-good";
  if (score >= 50) return "fill-mid";
  return "fill-low";
}

function packToState(pack, transcript) {
  return {
    teamName: pack.teamName || "Your team",
    rosterText: pack.rosterText || "",
    transcript: transcript || "",
    decisionRule: pack.decisionRule || "",
    participationNorm: pack.participationNorm || "",
    conflictPath: pack.conflictPath || "",
    channel: pack.channel || "",
    meetingLength: pack.meetingLength || "60 minutes",
    customerMix: pack.customerMixFromWorkplan || "",
    leadsCoordinate: pack.leadsCoordinate !== false,
  };
}

function dataSourcesPanel() {
  if (!uploadMeta.sourceFile && !uploadMeta.missingFromFolder.length) return null;
  const items = [
    el("li", {}, [
      el("span", { class: "mark ok" }),
      ` Loaded from your folder: ${uploadMeta.sourceFile}`,
    ]),
    ...uploadMeta.missingFromFolder.map((line) =>
      el("li", {}, [el("span", { class: "mark no" }), ` ${line}`])
    ),
  ];
  if (uploadMeta.transcriptNote) {
    items.push(el("li", { class: "help" }, uploadMeta.transcriptNote));
  }
  return el("div", { class: "sources" }, [
    el("p", { class: "field-label" }, "What came from your upload"),
    el("ul", { class: "source-list" }, items),
  ]);
}

function renderInputs() {
  const roster = el("textarea", { class: "roster" }, state.rosterText);
  roster.addEventListener("change", () => {
    state.rosterText = roster.value;
    render();
  });

  const team = el("input", { type: "text", value: state.teamName });
  team.addEventListener("input", () => {
    state.teamName = team.value;
    renderBriefOnly();
  });

  const rule = el("select", {}, [
    el("option", { value: "" }, "Not chosen yet"),
    el("option", { value: "consensus" }, "Consensus"),
    el("option", { value: "majority" }, "Majority vote"),
    el("option", { value: "facilitator" }, "Facilitator decides after everyone speaks"),
  ]);
  rule.value = state.decisionRule;
  rule.addEventListener("change", () => {
    state.decisionRule = rule.value;
    renderBriefOnly();
  });

  function textField(value, key, rows) {
    const box = el("textarea", {}, value);
    if (rows) box.style.minHeight = rows;
    box.addEventListener("input", () => {
      state[key] = box.value;
      renderBriefOnly();
    });
    return box;
  }

  const transcript = el("textarea", {}, state.transcript);
  transcript.addEventListener("input", () => {
    state.transcript = transcript.value;
    renderBriefOnly();
  });

  const file = el("input", { type: "file", accept: ".txt,.vtt,.md" });
  file.addEventListener("change", () => {
    const chosen = file.files && file.files[0];
    if (!chosen) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.transcript = String(reader.result || "");
      render();
    };
    reader.readAsText(chosen);
  });

  inputs.replaceChildren(
    el("div", { class: "panel" }, [
      el("h2", {}, "Inputs"),
      el(
        "p",
        { class: "note" },
        "The roster and charter come from Headcount_Team Charter Template.docx.pdf. The brief reads the meeting transcript and says what each person contributed."
      ),
      dataSourcesPanel(),
      field("Team name", team),
      field("Roster — one person per line, Name | Role", roster),
      field("Decision rule from the charter", rule),
      field("How you share speaking time", textField(state.participationNorm, "participationNorm", "72px")),
      field("What you do when you disagree", textField(state.conflictPath, "conflictPath", "72px")),
      field("Channel for decisions", textField(state.channel, "channel", "52px")),
      field("Meeting transcript", transcript),
      el("div", { class: "file" }, [el("span", { class: "help" }, "Or load a .txt or Zoom .vtt file. Names need to match the roster."), file]),
      el("div", { class: "actions" }, [
        el("button", { type: "button", onclick: () => setView("brief") }, "Open the brief"),
        el("button", { class: "ghost", type: "button", onclick: resetUploaded }, "Reload folder data"),
        el("button", { class: "ghost", type: "button", onclick: loadHarborExample }, "Harbor fiction example"),
        el("button", { class: "ghost", type: "button", onclick: copyBrief }, "Copy brief"),
      ]),
    ])
  );
}

async function resetUploaded() {
  await loadFromUpload();
  render();
}

function loadHarborExample() {
  uploadMeta = { sourceFile: "", missingFromFolder: [], transcriptNote: "" };
  state = FB.defaultState();
  render();
}

function renderBriefOnly() {
  renderBrief();
}

function render() {
  renderModes();
  const studio = document.getElementById("studio");
  const feature = document.getElementById("feature");
  if (view === "brief" || view === "input") {
    studio.hidden = false;
    feature.hidden = true;
    studio.classList.toggle("inputs-only", view === "input");
    renderInputs();
    if (view === "input") {
      brief.replaceChildren();
      tagline.textContent = TAGLINES.input;
    } else {
      renderBrief();
    }
    return;
  }
  studio.classList.remove("inputs-only");
  studio.hidden = true;
  feature.hidden = false;
  tagline.textContent = TAGLINES[view];
  if (view === "import") renderImport();
  if (view === "record") renderRecord();
  if (view === "calendar") renderCalendar();
  if (view === "feedback") renderFeedback();
}

function renderBrief() {
  const usingHarbor =
    state.transcript.trim() === harborExample.transcript.trim() && state.teamName === harborExample.teamName;
  tagline.textContent = usingHarbor
    ? "Harbor is a fiction example only. Use Reload folder data for your charter."
    : `${state.teamName || "Your team"}. Loaded from your Team Prototype folder where noted.`;

  const result = FB.analyze(state);
  if (result.error) {
    brief.replaceChildren(el("div", { class: "error" }, result.error));
    return;
  }

  const banner = el(
    "div",
    { class: "banner" },
    usingHarbor
      ? "Harbor is fictional. Choose Reload folder data to use Headcount_Team Charter Template.docx.pdf from your upload."
      : uploadMeta.sourceFile
        ? `Charter fields and roster are from ${uploadMeta.sourceFile}. Each card is what that person contributed in the transcript.`
        : "This brief is from the inputs on the left. It stays in this browser."
  );

  const scores = el("div", { class: "dims" }, result.dimensions.map(dimensionCard));
  const floor = floorCard(result);
  const people = el("div", {}, [
    el("div", { class: "section-head" }, [el("h2", {}, "One move for each person")]),
    el("p", { class: "note" }, "The move for a person with more floor is an invitation. The move for a person with less floor is one prepared contribution from their role. The aim is a more even meeting, with the work still attached to the person who owns it."),
    el("div", { class: "cards" }, result.cards.map(personCard)),
  ]);
  const agenda = el("div", {}, [
    el("div", { class: "section-head" }, [el("h2", {}, "Next meeting")]),
    el("ol", { class: "agenda" }, result.agenda.map((item) =>
      el("li", {}, [el("div", { class: "min" }, item.min), el("div", {}, [el("h3", {}, item.title), el("p", {}, item.detail)])])
    )),
  ]);
  const checks = el("div", {}, [
    el("div", { class: "section-head" }, [el("h2", {}, "Charter against this meeting")]),
    el("div", { class: "checks" }, result.charterChecks.map(checkCard)),
  ]);
  const why = whyCard(result);

  const unmatched = result.unmatched.length
    ? el(
        "div",
        { class: "error" },
        `These speaker names are not on the roster, so their turns were skipped: ${result.unmatched.join(", ")}. Match the transcript names to the roster, or add them.`
      )
    : null;

  brief.replaceChildren(
    banner,
    unmatched,
    el("p", { class: "leader" }, result.leaderNote),
    scores,
    floor,
    people,
    agenda,
    checks,
    why
  );
}

function dimensionCard(dim) {
  const tone = bandClass(dim.score);
  return el("article", { class: "dim" }, [
    el("div", { class: "dim-head" }, [
      el("h3", {}, dim.label),
      el("div", {}, [el("div", { class: `score ${tone}` }, String(dim.score)), el("div", { class: `band ${tone}` }, FB.band(dim.score))]),
    ]),
    el("div", { class: "bar" }, [el("i", { class: fillClass(dim.score), style: `width:${dim.score}%` })]),
    el("p", {}, dim.evidence),
  ]);
}

function floorCard(result) {
  const even = Math.round(result.equal * 100);
  return el("section", { class: "floor-card" }, [
    el("h2", {}, "Who held the floor"),
    el("p", { class: "note" }, `The mark on each bar is an even share, about ${even}% of the turns. The number at the right is the share of words.`),
    ...result.members
      .slice()
      .sort((a, b) => b.turnShare - a.turnShare)
      .map((member) => {
        const turn = Math.round(member.turnShare * 100);
        const words = Math.round(member.wordShare * 100);
        return el("div", { class: "floor-row" }, [
          el("div", { class: "floor-name" }, member.first),
          el("div", { class: "track" }, [
            el("b", { style: `width:${turn}%` }),
            el("i", { class: "tick", style: `left:${even}%` }),
          ]),
          el("div", { class: "pct" }, `${turn}% turns · ${words}% words`),
        ]);
      }),
  ]);
}

function personCard(card) {
  return el("article", { class: "person" }, [
    el("header", {}, [el("h3", {}, card.full), el("p", { class: "role" }, card.roles)]),
    el("p", {}, card.floorLine),
    el("p", { class: "kicker" }, "What they contributed"),
    el("p", {}, card.pattern),
    el("p", { class: "kicker" }, "Next meeting"),
    el("p", {}, card.move),
  ]);
}

function checkCard(check) {
  return el("article", { class: "check" }, [
    el("div", { class: check.ok ? "mark ok" : "mark no" }),
    el("div", {}, [el("h3", {}, check.title), el("p", {}, check.detail)]),
  ]);
}

function whyCard(result) {
  const body = result.dimensions.map((dim) => el("p", {}, `${dim.label}. ${dim.why}`));
  return el("details", { class: "why" }, [
    el("summary", {}, "Why the brief is built this way"),
    el("div", {}, [
      el(
        "p",
        {},
        "The goal is a next-meeting plan that evens the floor and keeps each role's work with its owner. The charter says how the team agreed to decide, share time, and handle disagreement. The transcript is the evidence: who spoke, what they added, and whose work they took."
      ),
      ...body,
      el(
        "p",
        {},
        "Diehl and Stroebe (1987) showed that groups lose ideas while people wait out a monologue. The next meeting uses a timed round for that reason. The full writeup is in DESIGN.md, next to this page."
      ),
    ]),
  ]);
}

function copyBrief() {
  const result = FB.analyze(state);
  if (result.error) return;
  const lines = [];
  lines.push(`Open Space — ${result.teamName}`);
  lines.push("");
  lines.push(result.leaderNote);
  lines.push("");
  result.dimensions.forEach((dim) => {
    lines.push(`${dim.label}: ${dim.score} (${FB.band(dim.score)})`);
    lines.push(dim.evidence);
    lines.push("");
  });
  lines.push("One move for each person");
  result.cards.forEach((card) => {
    lines.push("");
    lines.push(`${card.full} — ${card.roles}`);
    lines.push(card.floorLine);
    lines.push(card.pattern);
    lines.push(card.move);
  });
  lines.push("");
  lines.push("Next meeting");
  result.agenda.forEach((item) => {
    lines.push(`${item.min} — ${item.title}`);
    lines.push(item.detail);
  });
  navigator.clipboard.writeText(lines.join("\n")).then(
    () => {
      const button = inputs.querySelector("button:last-child");
      if (button) {
        const original = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = original;
        }, 1200);
      }
    },
    () => window.prompt("Copy this brief:", lines.join("\n"))
  );
}

function loadStore(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function saveStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function renderModes() {
  const modes = document.getElementById("modes");
  if (!modes) return;
  const items = [
    ["input", "Input"],
    ["brief", "Brief"],
    ["import", "Import"],
    ["record", "Record"],
    ["calendar", "Calendar"],
    ["feedback", "Feedback"],
  ];
  modes.replaceChildren(
    ...items.map(([id, label]) => {
      const button = el("button", { type: "button", class: view === id ? "mode on" : "mode" }, label);
      button.addEventListener("click", () => setView(id));
      return button;
    })
  );
}

function setView(next) {
  if (view === "record" && next !== "record") stopRecording();
  view = next;
  render();
}

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function charterEvents() {
  const events = [];
  const start = new Date(2026, 9, 14);
  const end = new Date(2026, 11, 2);
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    if (day.getDay() === 3) {
      events.push({
        date: isoDate(day),
        time: "7:30 pm",
        title: "Team meeting",
        detail: "60 minutes. The charter sets Wednesdays at 7:30 pm.",
        kind: "meeting",
      });
    }
  }
  [
    ["2026-10-14", "10:00 pm", "Charter, workplan, and overview due"],
    ["2026-10-25", "", "Two customer interviews per person due"],
    ["2026-11-01", "", "Target customer, value proposition, and a low-fi prototype"],
    ["2026-11-07", "10:00 pm", "Checkpoint 2 materials, internal review"],
    ["2026-11-09", "10:00 pm", "Submit Checkpoint 2 and peer evaluations"],
    ["2026-11-15", "", "Revision plan"],
    ["2026-11-22", "", "Follow-up research, prototype, and economics"],
    ["2026-11-29", "", "Final pitch deck and rehearsal"],
    ["2026-11-30", "1:00 pm", "Finalize files"],
    ["2026-12-02", "", "Final presentation"],
  ].forEach(([date, time, title]) => {
    events.push({ date, time, title, detail: "From the Headcount charter workplan.", kind: "deadline" });
  });
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

function renderImport() {
  const feature = document.getElementById("feature");
  const file = el("input", { type: "file", accept: ".txt,.vtt,.md,text/plain", multiple: "true" });
  file.addEventListener("change", () => importFiles(file.files));
  const list = meetings.length
    ? el(
        "div",
        { class: "meeting-list" },
        meetings.map((meeting) =>
          el("article", { class: "person" }, [
            el("h3", {}, meeting.title),
            el("p", { class: "role" }, `${meeting.date} · ${meeting.source}`),
            el("p", {}, `${meeting.transcript.split(/\n/).filter(Boolean).length} lines`),
            el("div", { class: "actions" }, [
              el("button", { type: "button", onclick: () => useMeeting(meeting) }, "Use in the brief"),
              el("button", {
                class: "ghost",
                type: "button",
                onclick: () => {
                  meetings = meetings.filter((item) => item.id !== meeting.id);
                  saveStore(MEETING_KEY, meetings);
                  renderImport();
                },
              }, "Remove"),
            ]),
          ])
        )
      )
    : el("p", { class: "note" }, "No meetings imported yet.");
  feature.replaceChildren(
    el("div", { class: "panel-card" }, [
      el("h2", {}, "Import a meeting"),
      el("p", { class: "note" }, "Zoom .vtt files and plain transcripts both work. Start each turn with a name and a colon, matching the roster."),
      file,
      list,
    ])
  );
}

function importFiles(fileList) {
  [...fileList].forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      meetings.unshift({
        id: `${Date.now()}-${file.name}`,
        title: file.name.replace(/\.(txt|vtt|md)$/i, ""),
        date: isoDate(new Date()),
        source: "Imported",
        transcript: String(reader.result || ""),
      });
      saveStore(MEETING_KEY, meetings);
      renderImport();
    };
    reader.readAsText(file);
  });
}

function useMeeting(meeting) {
  state.transcript = meeting.transcript;
  view = "brief";
  render();
}

function renderRecord() {
  const feature = document.getElementById("feature");
  const people = membersNow();
  if (!recordSpeaker && people[0]) recordSpeaker = people[0].first;
  const speaker = el("select", {});
  people.forEach((person) => speaker.append(el("option", { value: person.first }, person.full)));
  speaker.value = recordSpeaker;
  speaker.addEventListener("change", () => {
    recordSpeaker = speaker.value;
  });
  const live = el("textarea", { id: "live-transcript", class: "live" }, liveTranscript);
  live.addEventListener("input", () => {
    liveTranscript = live.value;
  });
  const rec = el(
    "button",
    { type: "button", class: recording ? "rec on" : "rec", id: "rec-btn" },
    recording ? "Stop" : "Record"
  );
  rec.addEventListener("click", () => (recording ? stopRecording() : startRecording()));
  const save = el("button", { class: "ghost", type: "button" }, "Save as a meeting");
  save.addEventListener("click", () => {
    liveTranscript = live.value;
    if (!liveTranscript.trim()) {
      recordStatus = "There is nothing to save yet.";
      const status = document.getElementById("record-status");
      if (status) status.textContent = recordStatus;
      return;
    }
    meetings.unshift({
      id: `rec-${Date.now()}`,
      title: `Recording ${isoDate(new Date())}`,
      date: isoDate(new Date()),
      source: "Recorded",
      transcript: liveTranscript.trim(),
    });
    saveStore(MEETING_KEY, meetings);
    recordStatus = "Saved. Open Import to use it in the brief, or switch there now.";
    const status = document.getElementById("record-status");
    if (status) status.textContent = recordStatus;
  });
  const download = recordUrl
    ? el("a", { class: "text-link", href: recordUrl, download: "open-space-meeting.webm" }, "Download audio")
    : null;
  feature.replaceChildren(
    el("div", { class: "panel-card" }, [
      el("h2", {}, "Record a meeting"),
      el(
        "p",
        { class: "note" },
        "The recording stays on this computer. Pick who is speaking before each stretch of talk. You can edit the lines after you stop."
      ),
      field("Who is speaking", speaker),
      el("div", { class: "rec-row" }, [rec, save, download]),
      el("p", { id: "record-status", class: "note" }, recordStatus),
      live,
    ])
  );
}

function startRecording() {
  recordStatus = "Asking for the microphone…";
  const status = document.getElementById("record-status");
  if (status) status.textContent = recordStatus;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    recordStatus = "This browser cannot record audio. Type the transcript in the box instead.";
    if (status) status.textContent = recordStatus;
    return;
  }
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      recordStream = stream;
      recordChunks = [];
      if (recordUrl) URL.revokeObjectURL(recordUrl);
      recordUrl = "";
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size) recordChunks.push(event.data);
      };
      mediaRecorder.onstop = () => {
        if (recordChunks.length) {
          const blob = new Blob(recordChunks, { type: mediaRecorder.mimeType || "audio/webm" });
          recordUrl = URL.createObjectURL(blob);
        }
        recording = false;
        recordStatus = "Recording stopped. Edit the transcript, then save it as a meeting.";
        renderRecord();
      };
      mediaRecorder.start();
      recording = true;
      recordStatus = "Recording. Lines appear as the browser recognizes speech.";
      startSpeech();
      renderRecord();
    })
    .catch(() => {
      recording = false;
      recordStatus = "Microphone access was blocked. You can still type the meeting in the box.";
      renderRecord();
    });
}

function startSpeech() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    recordStatus = "Recording audio. This browser will not write speech into text, so type the lines as people talk.";
    return;
  }
  recognition = new Speech();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      if (!event.results[i].isFinal) continue;
      const said = event.results[i][0].transcript.trim();
      if (!said) continue;
      const who = recordSpeaker || "Speaker";
      liveTranscript = `${liveTranscript}${liveTranscript ? "\n" : ""}${who}: ${said}`;
      const box = document.getElementById("live-transcript");
      if (box) box.value = liveTranscript;
    }
  };
  recognition.onerror = () => {
    recordStatus = "Still recording. Speech recognition paused, so keep typing if a line is missing.";
    const node = document.getElementById("record-status");
    if (node) node.textContent = recordStatus;
  };
  try {
    recognition.start();
  } catch (_) {
    recordStatus = "Recording audio. Speech recognition did not start, so type the lines.";
  }
}

function stopRecording() {
  if (recognition) {
    try {
      recognition.onresult = null;
      recognition.stop();
    } catch (_) {
      /* already stopped */
    }
    recognition = null;
  }
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  } else if (recording) {
    recording = false;
  }
  if (recordStream) {
    recordStream.getTracks().forEach((track) => track.stop());
    recordStream = null;
  }
}

function renderCalendar() {
  const feature = document.getElementById("feature");
  const events = charterEvents();
  const year = calCursor.getFullYear();
  const month = calCursor.getMonth();
  const label = calCursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = isoDate(new Date());
  const cells = [];
  ["S", "M", "T", "W", "T", "F", "S"].forEach((name) => {
    cells.push(el("div", { class: "cal-dow" }, name));
  });
  for (let i = 0; i < startPad; i += 1) cells.push(el("div", { class: "cal-day out" }));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = isoDate(new Date(year, month, day));
    const dayEvents = events.filter((item) => item.date === date);
    cells.push(
      el("div", { class: date === today ? "cal-day today" : "cal-day" }, [
        el("span", { class: "cal-num" }, String(day)),
        ...dayEvents.map((item) =>
          el("span", { class: `cal-pill ${item.kind}` }, item.time ? `${item.time} ${item.title}` : item.title)
        ),
      ])
    );
  }
  const upcoming = events.filter((item) => item.date >= today).slice(0, 6);
  feature.replaceChildren(
    el("div", { class: "panel-card" }, [
      el("div", { class: "cal-head" }, [
        el("h2", {}, label),
        el("div", { class: "actions" }, [
          el("button", {
            class: "ghost",
            type: "button",
            onclick: () => {
              calCursor = new Date(year, month - 1, 1);
              renderCalendar();
            },
          }, "Previous"),
          el("button", {
            class: "ghost",
            type: "button",
            onclick: () => {
              calCursor = new Date(year, month + 1, 1);
              renderCalendar();
            },
          }, "Next"),
        ]),
      ]),
      el("p", { class: "note" }, "Blue is a team meeting. Black is a charter deadline."),
      el("div", { class: "cal-grid" }, cells),
    ]),
    el("div", { class: "panel-card" }, [
      el("h2", {}, "Coming up"),
      upcoming.length
        ? el(
            "div",
            { class: "meeting-list" },
            upcoming.map((item) =>
              el("article", { class: "person" }, [
                el("h3", {}, item.title),
                el("p", { class: "role" }, [item.date, item.time].filter(Boolean).join(" · ")),
                el("p", {}, item.detail),
              ])
            )
          )
        : el("p", { class: "note" }, "Nothing left on the charter after today."),
    ])
  );
}

function renderFeedback() {
  const feature = document.getElementById("feature");
  const result = FB.analyze(state);
  if (result.error) {
    feature.replaceChildren(el("div", { class: "error" }, result.error));
    return;
  }
  if (!feedbackWho) feedbackWho = result.cards[0] ? result.cards[0].full : "";
  const chosen = result.cards.find((card) => card.full === feedbackWho) || result.cards[0];
  const stored = savedFeedback.find((item) => item.name === chosen.full);
  const draft = stored ? stored.text : `${chosen.pattern}\n\nNext meeting: ${chosen.move}`;
  const picker = el("select", {});
  result.cards.forEach((card) => picker.append(el("option", { value: card.full }, card.full)));
  picker.value = chosen.full;
  picker.addEventListener("change", () => {
    feedbackWho = picker.value;
    renderFeedback();
  });
  const box = el("textarea", { class: "live" }, draft);
  const status = el("p", { id: "feedback-status", class: "note" }, "This starts from the meeting brief. Edit it before you send it.");
  feature.replaceChildren(
    el("div", { class: "panel-card" }, [
      el("h2", {}, "Give feedback"),
      el(
        "p",
        { class: "note" },
        "One note per person. Share it with the whole team so it becomes the next agenda, not a private critique."
      ),
      field("Teammate", picker),
      el("p", { class: "role" }, chosen.roles),
      box,
      el("div", { class: "actions" }, [
        el("button", {
          type: "button",
          onclick: () => {
            savedFeedback = savedFeedback.filter((item) => item.name !== chosen.full);
            savedFeedback.unshift({ name: chosen.full, text: box.value, date: isoDate(new Date()) });
            saveStore(FEEDBACK_KEY, savedFeedback);
            status.textContent = `Saved for ${chosen.name}.`;
          },
        }, "Save"),
        el("button", {
          class: "ghost",
          type: "button",
          onclick: () => {
            const note = `Open Space feedback for ${chosen.full}\n\n${box.value}`;
            navigator.clipboard.writeText(note).then(
              () => {
                status.textContent = "Copied. Paste it in WhatsApp.";
              },
              () => window.prompt("Copy this feedback:", note)
            );
          },
        }, "Copy"),
      ]),
      status,
    ])
  );
}

async function loadFromUpload() {
  const pack = window.UPLOADED_TEAM;
  if (!pack) {
    state = harborExample;
    return;
  }
  uploadMeta = {
    sourceFile: pack.sourceFile || "data/team-from-upload.json",
    missingFromFolder: pack.missingFromFolder || [],
    transcriptNote: "",
  };
  let transcript = "";
  const path = pack.transcriptFile ? `data/${pack.transcriptFile}` : "data/headcount-sample-meeting.txt";
  try {
    const res = await fetch(path);
    if (res.ok) {
      transcript = await res.text();
      uploadMeta.transcriptNote = "This hour is the example: a full round, every role speaks, then consensus.";
    }
  } catch (_) {
    uploadMeta.transcriptNote =
      "Open this page via a local server so the sample transcript can load from data/headcount-sample-meeting.txt.";
  }
  state = packToState(pack, transcript);
}

let openingGeneration = 0;

function showOpening() {
  openingGeneration += 1;
  const opening = document.getElementById("opening");
  opening.hidden = false;
  opening.classList.remove("leaving");
  document.body.classList.add("opening-on");
}

function closeOpening() {
  const opening = document.getElementById("opening");
  if (!opening || opening.hidden || opening.classList.contains("leaving")) return;
  const generation = openingGeneration;
  document.body.classList.remove("opening-on");
  opening.classList.add("leaving");
  const finish = () => {
    if (generation !== openingGeneration || opening.hidden) return;
    opening.hidden = true;
    opening.classList.remove("leaving");
  };
  opening.addEventListener("animationend", finish, { once: true });
  window.setTimeout(finish, 520);
}

document.getElementById("open-collaborate").addEventListener("click", () => {
  closeOpening();
  setView("input");
});

document.getElementById("wordmark").addEventListener("click", showOpening);

loadFromUpload().then(() => render());
