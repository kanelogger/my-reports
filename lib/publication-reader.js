(() => {
  "use strict";
  document.body.dataset.readerReady = "true";
  const search = document.querySelector("[data-search]");
  if (search) {
    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      let matches = 0;
      document.querySelectorAll(".archive-row").forEach((row) => {
        const searchable = `${row.querySelector("time").dateTime} ${row.textContent}`.toLocaleLowerCase();
        row.hidden = !searchable.includes(query);
        if (!row.hidden) matches++;
      });
      document.querySelectorAll(".archive-group").forEach((group) => {
        group.hidden = !group.querySelector(".archive-row:not([hidden])");
      });
      document.querySelector(".latest").hidden = Boolean(query);
      document.querySelector(".search-empty").hidden = matches > 0;
      document.querySelector(".search-status").textContent = query ? `找到 ${matches} 期` : "";
    });
  }
  const sections = [...document.querySelectorAll(".reading-section")];
  if (!sections.length) return;
  const quickToc = document.getElementById("quick-toc");
  const dock = document.querySelector(".reader-dock");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let active = "", scheduled = false;

  function setToc(open) {
    quickToc.hidden = !open;
    dock.querySelector("[data-toggle-toc]").setAttribute("aria-expanded", String(open));
  }
  function update() {
    scheduled = false;
    const threshold = Math.min(160, innerHeight * .22);
    const current = [...sections].reverse().find((section) => section.getBoundingClientRect().top <= threshold) || sections[0];
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (threshold - rect.top) / rect.height));
      document.querySelectorAll(`.toc-list a[href="#${section.id}"]`).forEach((link) => link.style.setProperty("--section-progress", progress));
    });
    document.documentElement.style.setProperty("--reading-progress", Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))));
    if (current.id === active) return;
    active = current.id;
    document.querySelectorAll(".toc-list a").forEach((link) => {
      if (link.hash === `#${active}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    dock.querySelector(".current-section-label").textContent = current.querySelector("h2").textContent;
    const next = sections[sections.indexOf(current) + 1];
    dock.querySelector("[data-next-section]").disabled = !next;
    dock.querySelector("[data-next-section]").setAttribute("aria-label", next ? `下一栏目：${next.querySelector("h2").textContent}` : "已是最后一个栏目");
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
  function focusReading(focused) {
    const pin = [...document.querySelectorAll(".prose p, .prose h2")].find((node) => {
      const rect = node.getBoundingClientRect(); return rect.bottom > 0 && rect.top < innerHeight;
    }) || document.querySelector(".prose");
    const oldTop = pin.getBoundingClientRect().top;
    document.body.dataset.focus = String(focused);
    document.querySelectorAll("[data-focus]").forEach((button) => {
      button.setAttribute("aria-pressed", String(focused));
      button.querySelector("span").textContent = focused ? "退出专注" : "专注阅读";
    });
    window.scrollBy({ top: pin.getBoundingClientRect().top - oldTop, behavior: "instant" });
    const focusControl = focused ? dock.querySelector("[data-focus]") : document.querySelector(".desktop-toc [data-focus]");
    if (focusControl.getClientRects().length) focusControl.focus({ preventScroll: true });
    else dock.querySelector("[data-focus]").focus({ preventScroll: true });
    setToc(false); schedule();
  }
  function jump(id) {
    const section = sections.find((item) => item.id === id);
    if (!section) return;
    setToc(false);
    section.scrollIntoView({ block: "start", behavior: reduce.matches ? "instant" : "smooth" });
    history.replaceState(null, "", `#${id}`);
  }
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target.closest("[data-toggle-toc]")) { setToc(quickToc.hidden); return; }
    if (target.closest("[data-close-toc]")) { setToc(false); dock.querySelector("[data-toggle-toc]").focus(); return; }
    if (target.closest("[data-focus]")) { focusReading(document.body.dataset.focus !== "true"); return; }
    const font = target.closest("[data-font]");
    if (font) {
      document.documentElement.style.setProperty("--body-size", font.dataset.font === "large" ? "19px" : "17px");
      document.querySelectorAll("[data-font]").forEach((button) => button.setAttribute("aria-pressed", String(button === font)));
      schedule(); return;
    }
    if (target.closest("[data-next-section]")) {
      const next = sections[sections.findIndex((section) => section.id === active) + 1];
      if (next) jump(next.id);
      return;
    }
    const link = target.closest('a[href^="#section-"]');
    if (link && sections.some((section) => `#${section.id}` === link.hash)) {
      event.preventDefault();
      const details = link.closest("details"); if (details) details.open = false;
      jump(link.hash.slice(1)); return;
    }
    if (!target.closest(".quick-toc")) setToc(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!quickToc.hidden) { setToc(false); dock.querySelector("[data-toggle-toc]").focus(); }
      else if (document.body.dataset.focus === "true") focusReading(false);
    }
    if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.target.isContentEditable && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) {
      event.preventDefault(); focusReading(document.body.dataset.focus !== "true");
    }
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  update();
})();
