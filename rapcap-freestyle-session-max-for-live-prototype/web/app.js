import {
  formatTime,
  metadataOnlyExport,
  normalizeSession,
  regionAt,
  timelineRatio
} from "../src/session-core.js";

const state = {
  session: null,
  positionMs: 0,
  playing: false,
  animationFrame: null,
  startedAt: 0,
  startedPositionMs: 0,
  vocalUrl: null,
  verseFilter: "all"
};

const elements = Object.fromEntries(
  [
    "session-title",
    "session-source",
    "beat-title",
    "youtube-link",
    "card-title",
    "card-meta",
    "card-duration",
    "card-verses",
    "current-time",
    "total-time",
    "play-button",
    "play-icon",
    "playhead",
    "timeline",
    "ruler",
    "blocks-track",
    "verses-track",
    "block-list",
    "block-count",
    "verse-list",
    "verse-count",
    "verse-filter",
    "aligned-summary",
    "manifest-input",
    "vocal-input",
    "vocal-audio",
    "vocal-status",
    "export-button"
  ].map((id) => [id, document.getElementById(id)])
);

async function loadDemo() {
  const response = await fetch("../fixtures/demo-session.json");
  setSession(await response.json());
}

function setSession(rawSession) {
  stop();
  state.session = normalizeSession(rawSession);
  state.positionMs = 0;
  render();
}

function render() {
  const { session } = state;
  if (!session) return;
  const duration = session.timeline.durationMs;
  const ableton = session.source?.ableton || {};
  const kept = session.verses.filter((verse) => verse.status === "keep").length;

  elements["session-title"].textContent = session.title;
  elements["session-source"].textContent =
    `${ableton.setName || "Ableton set"} · ${ableton.vocalTrackName || "vocal track"}`;
  elements["beat-title"].textContent =
    session.beatReference.title || session.beatReference.videoId;
  elements["youtube-link"].href = session.beatReference.url;
  elements["card-title"].textContent = session.title;
  elements["card-meta"].textContent =
    `${ableton.setName || "Ableton manifest"} · ${kept} kept`;
  elements["card-duration"].textContent = formatTime(duration);
  elements["card-verses"].textContent = `${session.verses.length} verses`;
  elements["total-time"].textContent = formatTime(duration);
  elements["block-count"].textContent = String(session.beatBlocks.length).padStart(
    2,
    "0"
  );
  elements["verse-count"].textContent = String(session.verses.length).padStart(
    2,
    "0"
  );

  renderRuler();
  renderBlocks();
  renderVerses();
  renderPosition();
}

function renderRuler() {
  const { durationMs } = state.session.timeline;
  const marks = 8;
  elements.ruler.innerHTML = Array.from({ length: marks + 1 }, (_, index) => {
    const ratio = index / marks;
    return `<span style="left:${ratio * 100}%">${formatTime(
      durationMs * ratio
    )}</span>`;
  }).join("");
}

function renderBlocks() {
  const { session } = state;
  const duration = session.timeline.durationMs;
  elements["blocks-track"].innerHTML = session.beatBlocks
    .map((block) => {
      const left = timelineRatio(block.startMs, duration) * 100;
      const width =
        timelineRatio(block.endMs - block.startMs, duration) * 100;
      const detail = [block.bpm ? `${block.bpm} BPM` : "", block.key || ""]
        .filter(Boolean)
        .join(" · ");
      return `<button class="timeline-block type-${escapeText(
        block.type
      )}" style="left:${left}%;width:${width}%" data-seek="${block.startMs}">
        <strong>${escapeText(block.label)}</strong>
        <span>${escapeText(detail)}</span>
      </button>`;
    })
    .join("");

  elements["block-list"].innerHTML = session.beatBlocks
    .map((block) => {
      const detail = [
        block.type.toUpperCase(),
        block.bpm ? `${block.bpm} BPM` : "",
        block.key || "",
        block.source || ""
      ]
        .filter(Boolean)
        .join(" · ");
      return `<div class="block-row" data-seek="${block.startMs}">
        <i class="block-swatch type-${escapeText(block.type)}"></i>
        <div class="block-copy">
          <strong>${escapeText(block.label)}</strong>
          <span>${escapeText(detail)}</span>
        </div>
        <div class="block-time">
          <strong>${formatTime(block.startMs)}</strong>
          <span>${formatTime(block.endMs - block.startMs)}</span>
        </div>
      </div>`;
    })
    .join("");

  document.querySelectorAll("[data-seek]").forEach((element) => {
    element.addEventListener("click", () => seek(Number(element.dataset.seek)));
  });
}

function renderVerses() {
  const { session } = state;
  const duration = session.timeline.durationMs;
  elements["verses-track"].innerHTML = session.verses
    .map((verse) => {
      const left = timelineRatio(verse.startMs, duration) * 100;
      const width =
        timelineRatio(verse.endMs - verse.startMs, duration) * 100;
      return `<button class="timeline-verse" title="${escapeText(
        verse.transcript
      )}" style="left:${left}%;width:${width}%" data-verse-seek="${
        verse.startMs
      }"></button>`;
    })
    .join("");

  const filtered = session.verses.filter((verse) => {
    if (state.verseFilter === "keep") return verse.status === "keep";
    if (state.verseFilter === "rated4") return verse.rating >= 4;
    return true;
  });
  const alignedCount = session.verses.filter(
    (verse) => verse.beatBlockIds.length
  ).length;
  elements["aligned-summary"].textContent =
    `${alignedCount}/${session.verses.length} aligned`;
  elements["verse-list"].innerHTML = filtered
    .map((verse) => {
      const blocks = verse.beatBlockIds
        .map((id) => session.beatBlocks.find((block) => block.id === id)?.label)
        .filter(Boolean);
      return `<article class="verse-row" data-verse-id="${escapeText(verse.id)}">
        <button class="verse-time" data-verse-seek="${verse.startMs}">
          ${formatTime(verse.startMs)}
        </button>
        <div class="verse-main">
          <textarea aria-label="Transcript">${escapeText(verse.transcript)}</textarea>
          <div class="verse-tags">
            ${blocks.map((label) => `<span class="tag">${escapeText(label)}</span>`).join("")}
            ${
              blocks.length
                ? ""
                : '<span class="tag">UNALIGNED</span>'
            }
          </div>
        </div>
        <div class="verse-rating">
          <div class="stars" aria-label="Rating">
            ${[1, 2, 3, 4, 5]
              .map(
                (rating) =>
                  `<button class="star ${
                    rating <= verse.rating ? "on" : ""
                  }" data-rating="${rating}" aria-label="${rating} stars">★</button>`
              )
              .join("")}
          </div>
          <select class="status-select" aria-label="Verse status">
            ${["raw", "review", "keep", "discard"]
              .map(
                (status) =>
                  `<option value="${status}" ${
                    status === verse.status ? "selected" : ""
                  }>${status}</option>`
              )
              .join("")}
          </select>
        </div>
      </article>`;
    })
    .join("");

  document.querySelectorAll("[data-verse-seek]").forEach((element) => {
    element.addEventListener("click", () =>
      seek(Number(element.dataset.verseSeek))
    );
  });

  document.querySelectorAll(".verse-row").forEach((row) => {
    const verse = session.verses.find(
      (candidate) => candidate.id === row.dataset.verseId
    );
    row.querySelector("textarea").addEventListener("input", (event) => {
      verse.transcript = event.target.value;
    });
    row.querySelector(".status-select").addEventListener("change", (event) => {
      verse.status = event.target.value;
      renderVerses();
    });
    row.querySelectorAll("[data-rating]").forEach((star) => {
      star.addEventListener("click", () => {
        verse.rating = Number(star.dataset.rating);
        renderVerses();
      });
    });
  });
}

function renderPosition() {
  if (!state.session) return;
  const ratio = timelineRatio(
    state.positionMs,
    state.session.timeline.durationMs
  );
  elements.playhead.style.left = `${ratio * 100}%`;
  elements["current-time"].textContent = formatTime(state.positionMs);

  const block = regionAt(state.session.beatBlocks, state.positionMs);
  elements.timeline.setAttribute(
    "aria-valuetext",
    `${formatTime(state.positionMs)}${block ? `, ${block.label}` : ""}`
  );
  elements.timeline.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
}

function togglePlay() {
  state.playing ? pause() : play();
}

function play() {
  if (!state.session) return;
  if (state.positionMs >= state.session.timeline.durationMs) state.positionMs = 0;
  state.playing = true;
  state.startedAt = performance.now();
  state.startedPositionMs = state.positionMs;
  elements["play-icon"].textContent = "Ⅱ";

  if (state.vocalUrl) {
    const vocalPosition = Math.max(
      0,
      (state.positionMs - state.session.timeline.vocalOffsetMs) / 1000
    );
    elements["vocal-audio"].currentTime = vocalPosition;
    elements["vocal-audio"].play().catch(() => {});
  }
  tick();
}

function pause() {
  state.playing = false;
  cancelAnimationFrame(state.animationFrame);
  elements["vocal-audio"].pause();
  elements["play-icon"].textContent = "▶";
}

function stop() {
  pause();
  state.positionMs = 0;
}

function tick(now = performance.now()) {
  if (!state.playing) return;
  state.positionMs =
    state.startedPositionMs + (now - state.startedAt);
  if (state.positionMs >= state.session.timeline.durationMs) {
    state.positionMs = state.session.timeline.durationMs;
    pause();
  }
  renderPosition();
  if (state.playing) state.animationFrame = requestAnimationFrame(tick);
}

function seek(positionMs) {
  const wasPlaying = state.playing;
  pause();
  state.positionMs = Math.max(
    0,
    Math.min(positionMs, state.session.timeline.durationMs)
  );
  if (state.vocalUrl) {
    elements["vocal-audio"].currentTime = Math.max(
      0,
      (state.positionMs - state.session.timeline.vocalOffsetMs) / 1000
    );
  }
  renderPosition();
  if (wasPlaying) play();
}

function seekFromPointer(event) {
  if (event.target.closest("[data-seek], [data-verse-seek]")) return;
  const rect = elements.timeline.getBoundingClientRect();
  seek(((event.clientX - rect.left) / rect.width) * state.session.timeline.durationMs);
}

function loadVocal(file) {
  if (state.vocalUrl) URL.revokeObjectURL(state.vocalUrl);
  state.vocalUrl = URL.createObjectURL(file);
  elements["vocal-audio"].src = state.vocalUrl;
  elements["vocal-status"].textContent = `local vocal · ${file.name}`;
  state.session.assets = {
    ...state.session.assets,
    vocal: {
      fileName: file.name,
      mimeType: file.type,
      storage: "browser-memory-only",
      localObjectUrl: state.vocalUrl
    }
  };
}

function exportMetadata() {
  const payload = metadataOnlyExport(state.session);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${state.session.id}.metadata-only.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

elements["play-button"].addEventListener("click", togglePlay);
elements.timeline.addEventListener("click", seekFromPointer);
elements.timeline.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") seek(state.positionMs - 5_000);
  if (event.key === "ArrowRight") seek(state.positionMs + 5_000);
  if (event.key === " ") {
    event.preventDefault();
    togglePlay();
  }
});
elements["verse-filter"].addEventListener("change", (event) => {
  state.verseFilter = event.target.value;
  renderVerses();
});
document.querySelectorAll(".filter").forEach((filter) => {
  filter.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
    filter.classList.add("active");
    state.verseFilter = filter.dataset.filter;
    elements["verse-filter"].value = state.verseFilter;
    renderVerses();
  });
});
elements["manifest-input"].addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    setSession(JSON.parse(await file.text()));
  } catch (error) {
    window.alert(`Manifest error: ${error.message}`);
  }
});
elements["vocal-input"].addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadVocal(file);
});
elements["export-button"].addEventListener("click", exportMetadata);

loadDemo().catch((error) => {
  elements["session-title"].textContent = `Could not load demo: ${error.message}`;
});

