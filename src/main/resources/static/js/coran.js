(() => {
    const $select = document.getElementById("surahSelect");
    const $loading = document.getElementById("coranLoading");
    const $meta = document.getElementById("surahMeta");
    const $ayah = document.getElementById("ayahContainer");

    const $optAr = document.getElementById("optArabic");
    const $optFr = document.getElementById("optFrench");
    const $optTr = document.getElementById("optTranslit");

    const $btnAr = document.getElementById("btnPlayAr");
    const $btnFr = document.getElementById("btnPlayFr");
    const $btnArFr = document.getElementById("btnPlayArFr");
    const $btnStop = document.getElementById("btnStop");
    const $btnTop = document.getElementById("btnTop");

    let currentSurahId = 1;

    // audio mode
    let mode = null; // 'ar' | 'fr' | 'arfr'
    let audio = null; // HTMLAudioElement
    let idx = 0;
    // [{n, arText, frText, trText, audioAr, audioFr}]
    let ayas = [];
    let stopped = true;

    function showLoading(on) {
        $loading.classList.toggle("d-none", !on);
    }

    async function fetchJson(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.json();
    }

    function escapeHtml(s) {
        return String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function scrollToAya(n) {
        const el = document.getElementById(`aya-${n}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function renderAyas() {
        const showAr = $optAr.checked;
        const showFr = $optFr.checked;
        const showTr = $optTr.checked;

        $ayah.innerHTML = ayas.map(a => `
  <article class="ayah-card fade-in" id="aya-${a.n}">
    <div class="ayah-head">
      <span class="badge-pill"><span class="dot"></span> Verset ${a.n}</span>
      <button class="play-mini" data-play="${a.n}">
        <i class="bi bi-play-fill"></i> Écouter
      </button>
    </div>
    <div class="ayah-body">
      ${showAr ? `<div class="arabic text-end" dir="rtl" lang="ar">${escapeHtml(a.arText)}</div>` : ""}
      ${showTr ? `<div class="translit"><b>Translittération :</b> ${escapeHtml(a.trText)}</div>` : ""}
      ${showFr ? `<div class="fr"><b>Traduction :</b> ${escapeHtml(a.frText)}</div>` : ""}
    </div>
  </article>
`).join("");


        // play single ayah (arabic audio)
        $ayah.querySelectorAll("[data-play]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const n = Number(btn.getAttribute("data-play"));
                const i = Math.max(0, ayas.findIndex((x) => x.n === n));
                stopAll();
                mode = "ar";
                stopped = false;
                idx = i;
                playArabicAt(idx, true);
            });
        });
    }

    function pickEdition(editions, predicate) {
        return editions.find(predicate) || null;
    }

    async function loadSurahList() {
        showLoading(true);
        try {
            const data = await fetchJson("/api/quran/surah");
            const list = data?.data ?? [];

            $select.innerHTML = list.map(s =>
                `<option value="${s.number}">${escapeHtml(s.name)} — ${s.number} — ${escapeHtml(s.englishName)}</option>`
            ).join("");

            if (window._surahTomSelect) {
                window._surahTomSelect.destroy();
            }
            window._surahTomSelect = new TomSelect("#surahSelect", {
                create: false,
                sortField: [{ field: "$order", direction: "asc" }],
                searchField: ["text"],
                maxOptions: 300,
                placeholder: "Choisir une sourate...",
                render: {
                    option: function(data, escape) {
                        return `<div style="display:flex;justify-content:space-between;gap:10px;">
        <div style="font-weight:700;">${escape(data.text)}</div>
      </div>`;
                    }
                }
            });

            window._surahTomSelect.setValue("1", true);
            await loadSurah(1);

        } finally {
            showLoading(false);
        }
    }

    async function loadSurah(id) {
        currentSurahId = Number(id);
        stopAll();
        showLoading(true);

        try {
            const datas = await fetchJson(`/api/quran/surah/${encodeURIComponent(id)}`);
            const editions = datas?.data ?? [];

            // ✅ Sélection explicite des 4 éditions attendues
            const arEdition = pickEdition(
                editions,
                (e) => (e?.edition?.identifier || "") === "ar.hudhaify"
            );
            const trEdition = pickEdition(
                editions,
                (e) => (e?.edition?.identifier || "") === "en.transliteration"
            );

            // FR TEXTE : hamidullah (translation text)
            const frTextEdition =
                pickEdition(editions, (e) => (e?.edition?.identifier || "") === "fr.hamidullah") ||
                pickEdition(
                    editions,
                    (e) =>
                        (e?.edition?.language || "") === "fr" &&
                        (e?.edition?.format || "") === "text" &&
                        (e?.edition?.type || "") === "translation"
                );

            // FR AUDIO : leclerc (versebyverse audio)
            const frAudioEdition =
                pickEdition(editions, (e) => (e?.edition?.identifier || "") === "fr.leclerc") ||
                pickEdition(
                    editions,
                    (e) =>
                        (e?.edition?.language || "") === "fr" &&
                        (e?.edition?.format || "") === "audio"
                );

            const metaName = arEdition?.englishName || editions?.[0]?.englishName || "";
            const metaNumber = arEdition?.number || editions?.[0]?.number || id;

            const frTextId = frTextEdition?.edition?.identifier || "N/A";
            const frAudioId = frAudioEdition?.edition?.identifier || "N/A";

            $meta.textContent = metaName
                ? `Sourate ${metaNumber} — ${metaName} — FR texte: ${frTextId} — FR audio: ${frAudioId}`
                : `Sourate ${metaNumber} — FR texte: ${frTextId} — FR audio: ${frAudioId}`;

            const arAyahs = arEdition?.ayahs ?? [];
            const trAyahs = trEdition?.ayahs ?? [];
            const frTextAyahs = frTextEdition?.ayahs ?? [];
            const frAudioAyahs = frAudioEdition?.ayahs ?? [];

            ayas = arAyahs.map((a, i) => ({
                n: a.numberInSurah,
                arText: a.text,
                trText: trAyahs[i]?.text ?? "",
                // ✅ le français vient de Hamidullah (texte)
                frText: frTextAyahs[i]?.text ?? "",
                audioAr: a.audio ?? null,
                // ✅ audio FR vient de Leclerc
                audioFr: frAudioAyahs[i]?.audio ?? null
            }));

            renderAyas();
        } finally {
            showLoading(false);
        }
    }

    // -------- Playback ----------
    function stopAll() {
        stopped = true;
        mode = null;
        idx = 0;

        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        document
            .querySelectorAll(".ayah-card.ayah-active")
            .forEach(el => el.classList.remove("ayah-active"));

    }

    function playArabicAt(i, single = false) {
        const a = ayas[i];
        if (!a?.audioAr) {
            alert("Audio arabe indisponible pour cette édition.");
            stopAll();
            return;
        }
        audio = new Audio(a.audioAr);
        audio.onended = () => {
            if (stopped) return;
            if (single) return;
            idx++;
            if (idx < ayas.length) {
                scrollToAya(ayas[idx].n);
                playArabicAt(idx, false);
            } else {
                stopAll();
            }
        };
        scrollToAya(a.n);
        setActiveAya(a.n);
        audio.play().catch(() => {});
    }

    // ✅ Lecture FR : audio Leclerc si dispo, sinon TTS sur Hamidullah
    function playFrenchAt(i, single = false) {
        const a = ayas[i];

        // 1) audio FR (Leclerc)
        if (a?.audioFr) {
            audio = new Audio(a.audioFr);
            audio.onended = () => {
                if (stopped) return;
                if (single) return;
                idx++;
                if (idx < ayas.length) {
                    scrollToAya(ayas[idx].n);
                    playFrenchAt(idx, false);
                } else {
                    stopAll();
                }
            };
            scrollToAya(a.n);
            setActiveAya(a.n);
            audio.play().catch(() => {});
            return;
        }

        // 2) fallback TTS
        const text = (a?.frText || "").trim();
        if (!text) {
            alert("Texte français indisponible.");
            stopAll();
            return;
        }
        if (!window.speechSynthesis) {
            alert("SpeechSynthesis non supporté par ce navigateur.");
            stopAll();
            return;
        }

        const u = new SpeechSynthesisUtterance(text);
        u.lang = "fr-FR";
        u.onend = () => {
            if (stopped) return;
            if (single) return;
            idx++;
            if (idx < ayas.length) {
                scrollToAya(ayas[idx].n);
                playFrenchAt(idx, false);
            } else {
                stopAll();
            }
        };
        scrollToAya(a.n);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    }

    async function playArFrAt(i) {
        if (stopped) return;

        const a = ayas[i];
        if (!a?.audioAr) {
            alert("Audio arabe indisponible.");
            stopAll();
            return;
        }

        scrollToAya(a.n);
        setActiveAya(a.n);

        try {
            // 1️⃣ Arabe (obligatoire)
            await playAudioPromise(a.audioAr);

            if (stopped) return;

            // 2️⃣ Français (audio Leclerc OU TTS)
            if (a.audioFr) {
                await playAudioPromise(a.audioFr);
            } else if (a.frText) {
                await playTtsPromise(a.frText);
            }

            if (stopped) return;

            // 3️⃣ Verset suivant
            if (i + 1 < ayas.length) {
                idx = i + 1;
                playArFrAt(idx);
            } else {
                stopAll();
            }

        } catch (e) {
            console.error(e);
            stopAll();
        }
    }

    function playAudioPromise(src) {
        return new Promise((resolve, reject) => {
            const a = new Audio(src);
            a.onended = resolve;
            a.onerror = reject;
            a.play().catch(reject);
        });
    }

    function playTtsPromise(text) {
        return new Promise((resolve, reject) => {
            if (!window.speechSynthesis) return reject();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = "fr-FR";
            u.onend = resolve;
            u.onerror = reject;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
        });
    }

    function setActiveAya(n) {
        document
            .querySelectorAll(".ayah-card.ayah-active")
            .forEach(el => el.classList.remove("ayah-active"));

        const el = document.getElementById(`aya-${n}`);
        if (el) {
            el.classList.add("ayah-active");
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }


    // UI handlers
    $select.addEventListener("change", async (e) => {
        const id = e.target.value;
        await loadSurah(id);
    });

    [$optAr, $optFr, $optTr].forEach((x) => x.addEventListener("change", renderAyas));

    $btnAr.addEventListener("click", () => {
        stopAll();
        mode = "ar";
        stopped = false;
        idx = 0;
        playArabicAt(idx, false);
    });

    $btnFr.addEventListener("click", () => {
        stopAll();
        mode = "fr";
        stopped = false;
        idx = 0;
        playFrenchAt(idx, false);
    });

    $btnArFr.addEventListener("click", () => {
        stopAll();
        mode = "arfr";
        stopped = false;
        idx = 0;
        playArFrAt(idx);
    });

    $btnStop.addEventListener("click", stopAll);

    $btnTop.addEventListener("click", () => {
        stopAll();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    loadSurahList().catch((err) => {
        console.error(err);
        showLoading(false);
        $ayah.innerHTML = `<div class="alert alert-danger">Erreur de chargement.</div>`;
    });
})();
