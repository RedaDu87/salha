(() => {
    const $category = document.getElementById("hadithCategory");
    const $list = document.getElementById("hadithList");
    const $loading = document.getElementById("hadithLoading");

    const modalEl = document.getElementById("hadithModal");
    const modal = new bootstrap.Modal(modalEl);
    const $modalTitle = document.getElementById("hadithModalTitle");
    const $modalBody = document.getElementById("hadithModalBody");

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

    async function loadCategories() {
        showLoading(true);
        try {
            const data = await fetchJson("/api/hadith/categories");
            const cats = (data ?? []).map(x => ({
                id: x.id,
                title: x.title,
                count: x.hadeeths_count
            }));

            $category.innerHTML = cats.map(c =>
                `<option value="${c.id}">${escapeHtml(c.title)} (${c.count})</option>`
            ).join("");
            if (window._hadithTomSelect) {
                window._hadithTomSelect.destroy();
            }
            window._hadithTomSelect = new TomSelect("#hadithCategory", {
                create: false,
                sortField: [{ field: "$order", direction: "asc" }],
                placeholder: "Choisir une catégorie...",
                maxOptions: 5000
            });

            // par défaut catégorie 1 si existe
            const firstId = cats[0]?.id ?? 1;
            $category.value = String(firstId);
            await loadHadithList(firstId);
        } finally {
            showLoading(false);
        }
    }

    async function loadHadithList(categoryId) {
        showLoading(true);
        $list.innerHTML = "";
        try {
            const data = await fetchJson(`/api/hadith/list?category_id=${encodeURIComponent(categoryId)}`);
            const items = data?.data ?? [];

            if (!items.length) {
                $list.innerHTML = `<div class="list-group-item text-secondary">Aucun hadith trouvé.</div>`;
                return;
            }

            $list.innerHTML = items.map(h => {
                const title = escapeHtml(h.title);
                const preview = escapeHtml((h.hadeeth ?? "").slice(0, 180)) + ((h.hadeeth ?? "").length > 180 ? "..." : "");
                return `
          <button class="list-group-item list-group-item-action hadith-item fade-in" 
                  data-id="${h.id}" 
                  role="listitem"
                  aria-label="Hadith ${h.id}: ${title}">
            <div class="d-flex w-100 justify-content-between align-items-start">
              <h6 class="mb-2 fw-bold hadith-title">${title}</h6>
              <span class="hadith-badge">#${h.id}</span>
            </div>
            <p class="mb-2 hadith-preview">${preview}</p>
            <small class="hadith-cta"><i class="bi bi-arrow-right-circle"></i> Cliquer pour voir le détail complet</small>
          </button>
        `;
            }).join("");

            $list.querySelectorAll("[data-id]").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-id");
                    await openDetail(id);
                });
            });

        } finally {
            showLoading(false);
        }
    }

    async function openDetail(id) {
        showLoading(true);
        try {
            const d = await fetchJson(`/api/hadith/detail?id=${encodeURIComponent(id)}`);

            $modalTitle.textContent = d?.title ?? "Détail Hadith";
            $modalBody.innerHTML = `
        <div class="mb-3">
          <div class="hadith-modal-text">
            <p style="margin: 0;">${escapeHtml(d?.hadeeth)}</p>
          </div>
          
          <div class="hadith-modal-meta">
            <div class="hadith-modal-meta-item attribution">
              <strong class="hadith-modal-meta-label">Attribution</strong>
              <p class="hadith-modal-meta-value">${escapeHtml(d?.attribution)}</p>
            </div>
            <div class="hadith-modal-meta-item grade">
              <strong class="hadith-modal-meta-label">Grade</strong>
              <p class="hadith-modal-meta-value">${escapeHtml(d?.grade)}</p>
            </div>
          </div>
          
          <hr style="border-color: var(--stroke); margin: 24px 0;"/>
          
          <div class="hadith-modal-arabic">
            <p class="hadith-modal-arabic-text">
              ${escapeHtml(d?.hadeeth_ar)}
            </p>
            <div class="hadith-modal-arabic-section">
              <p><strong class="hadith-modal-arabic-label">التفسير:</strong> ${escapeHtml(d?.explanation_ar)}</p>
            </div>
            <div class="hadith-modal-arabic-section">
              <p><strong class="hadith-modal-arabic-label">الدرجة:</strong> ${escapeHtml(d?.grade_ar)}</p>
            </div>
          </div>
        </div>
      `;

            modal.show();
        } finally {
            showLoading(false);
        }
    }

    $category.addEventListener("change", async (e) => {
        const id = e.target.value;
        await loadHadithList(id);
    });

    loadCategories().catch(err => {
        console.error(err);
        showLoading(false);
        $list.innerHTML = `<div class="list-group-item text-danger">Erreur de chargement.</div>`;
    });
})();
