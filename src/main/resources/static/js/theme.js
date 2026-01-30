(() => {
    const key = "theme";
    const root = document.documentElement;

    function setTheme(t){
        root.setAttribute("data-theme", t);
        localStorage.setItem(key, t);
        const icon = document.getElementById("themeIcon");
        if(icon) icon.className = t === "light" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
    }

    const saved = localStorage.getItem(key);
    if(saved === "light" || saved === "dark"){
        setTheme(saved);
    } else {
        setTheme("dark");
    }

    const btn = document.getElementById("btnTheme");
    if(btn){
        btn.addEventListener("click", () => {
            const current = root.getAttribute("data-theme") || "dark";
            setTheme(current === "dark" ? "light" : "dark");
        });
    }
})();
