const tabs = [...document.querySelectorAll("[data-workflow-tab]")];
const panels = [...document.querySelectorAll("[data-workflow-panel]")];
function selectTab(tab, focus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  }
  for (const panel of panels) panel.hidden = panel.id !== tab.getAttribute("aria-controls");
  if (focus) tab.focus();
}
if (tabs.length) {
  selectTab(tabs[0]);
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  }
  function selectFromHash(hash = location.hash) {
    const target = document.getElementById(hash.slice(1));
    const panel = target?.closest("[data-workflow-panel]");
    const tab = tabs.find((item) => item.getAttribute("aria-controls") === panel?.id);
    if (!tab) return;
    selectTab(tab);
    requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  }
  window.addEventListener("hashchange", () => selectFromHash());
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link?.hash) selectFromHash(link.hash);
  });
  selectFromHash();
}

const zoom = document.querySelector(".zoom-dialog");
const zoomImage = zoom?.querySelector("img");
let zoomTrigger;
for (const button of document.querySelectorAll("[data-zoom]")) {
  button.addEventListener("click", () => {
    const source = button.querySelector("img");
    zoomImage.src = source.src;
    zoomImage.alt = source.alt;
    zoom.querySelector(".zoom-original").href = source.src;
    zoom.querySelector(".zoom-viewport").scrollTo(0, 0);
    zoom.querySelector(".zoom-caption").textContent = source.alt;
    zoomTrigger = button;
    zoom.showModal();
  });
}
zoom?.querySelector(".zoom-close").addEventListener("click", () => zoom.close());
zoom?.addEventListener("click", (event) => {
  if (event.target !== zoom) return;
  const bounds = zoom.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) zoom.close();
});
zoom?.addEventListener("close", () => zoomTrigger?.focus());
