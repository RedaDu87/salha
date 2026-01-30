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
          <button class="list-group-item list-group-item-action hadith-item" data-id="${h.id}">
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1 text-success fw-bold">${title}</h6>
              <span class="badge text-bg-success">#${h.id}</span>
            </div>
            <p class="mb-1 text-secondary">${preview}</p>
            <small class="text-muted">Clique pour ouvrir</small>
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
          <p class="mb-2">${escapeHtml(d?.hadeeth)}</p>
          <hr/>
          <p class="mb-1"><b>Attribution :</b> ${escapeHtml(d?.attribution)}</p>
          <p class="mb-1"><b>Grade :</b> ${escapeHtml(d?.grade)}</p>
          <hr/>
          <p class="text-end" dir="rtl" lang="ar" style="font-size: 1.15rem;">
            ${escapeHtml(d?.hadeeth_ar)}
          </p>
          <p dir="rtl" lang="ar"><b>Explication :</b> ${escapeHtml(d?.explanation_ar)}</p>
          <p dir="rtl" lang="ar"><b>Grade :</b> ${escapeHtml(d?.grade_ar)}</p>
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
