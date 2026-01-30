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
          <button class="list-group-item list-group-item-action hadith-item fade-in" data-id="${h.id}">
            <div class="d-flex w-100 justify-content-between align-items-start">
              <h6 class="mb-2 fw-bold" style="color: var(--brand);">${title}</h6>
              <span class="badge" style="background: linear-gradient(135deg, var(--brand), var(--brand2)); color: #071018; font-weight: 700; padding: 6px 12px; border-radius: 12px;">#${h.id}</span>
            </div>
            <p class="mb-2" style="color: var(--text); line-height: 1.65;">${preview}</p>
            <small style="color: var(--muted2); font-weight: 500;"><i class="bi bi-arrow-right-circle"></i> Cliquer pour voir le détail complet</small>
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
          <div style="background: rgba(255,255,255,.04); border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid var(--stroke);">
            <p style="font-size: 1.08rem; line-height: 1.75; color: var(--text); margin: 0;">${escapeHtml(d?.hadeeth)}</p>
          </div>
          
          <div style="display: grid; gap: 12px; margin-bottom: 20px;">
            <div style="background: rgba(72,229,154,.08); border-left: 3px solid var(--brand); padding: 14px 18px; border-radius: 12px;">
              <strong style="color: var(--brand); font-size: .9rem; text-transform: uppercase; letter-spacing: 0.5px;">Attribution</strong>
              <p style="margin: 6px 0 0; color: var(--text);">${escapeHtml(d?.attribution)}</p>
            </div>
            <div style="background: rgba(35,183,255,.08); border-left: 3px solid var(--brand2); padding: 14px 18px; border-radius: 12px;">
              <strong style="color: var(--brand2); font-size: .9rem; text-transform: uppercase; letter-spacing: 0.5px;">Grade</strong>
              <p style="margin: 6px 0 0; color: var(--text);">${escapeHtml(d?.grade)}</p>
            </div>
          </div>
          
          <hr style="border-color: var(--stroke); margin: 24px 0;"/>
          
          <div style="background: rgba(255,255,255,.02); border-radius: 16px; padding: 20px; border: 1px solid var(--stroke);">
            <p class="text-end" dir="rtl" lang="ar" style="font-family: 'Noto Naskh Arabic', 'Amiri', serif; font-size: 1.4rem; line-height: 2.2; color: var(--text); margin-bottom: 16px; font-weight: 600;">
              ${escapeHtml(d?.hadeeth_ar)}
            </p>
            <div style="border-top: 1px solid var(--stroke); padding-top: 16px; margin-top: 16px;">
              <p dir="rtl" lang="ar" style="font-size: 1.05rem; line-height: 1.8; color: var(--muted);"><strong style="color: var(--text);">التفسير:</strong> ${escapeHtml(d?.explanation_ar)}</p>
            </div>
            <div style="border-top: 1px solid var(--stroke); padding-top: 16px; margin-top: 16px;">
              <p dir="rtl" lang="ar" style="font-size: 1.05rem; line-height: 1.8; color: var(--muted);"><strong style="color: var(--text);">الدرجة:</strong> ${escapeHtml(d?.grade_ar)}</p>
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
