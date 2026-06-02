(function () {
    const ACCESS_KEY = "vf2026";

    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");
    const page = params.get("page");

    const currentFile = window.location.pathname.split("/").pop().replace(".html", "");
    let protectedPages = JSON.parse(localStorage.getItem("protectedPages") || "[]");

    if (access === ACCESS_KEY && page === currentFile) {
        if (!protectedPages.includes(currentFile)) {
            protectedPages.push(currentFile);
            localStorage.setItem("protectedPages", JSON.stringify(protectedPages));
        }
    }

    protectedPages = JSON.parse(localStorage.getItem("protectedPages") || "[]");

    if (!protectedPages.includes(currentFile)) {
        document.body.innerHTML = `
            <div style="font-family:Arial;padding:40px;text-align:center;">
                <h2>Zugriff verweigert</h2>
                <p>Bitte öffne die Seite über die Hub-Seite.</p>
            </div>
        `;
    }
})();
