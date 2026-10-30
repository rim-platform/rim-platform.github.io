document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");
const header = document.querySelector(".site-header");
const docsNavigation = document.querySelector(".docs-navigation");

function updateNavigationHeights() {
  if (header) document.documentElement.style.setProperty("--site-header-height", `${header.getBoundingClientRect().height}px`);
  if (docsNavigation) document.documentElement.style.setProperty("--docs-navigation-height", `${docsNavigation.getBoundingClientRect().height}px`);
}

updateNavigationHeights();
if (typeof ResizeObserver !== "undefined") {
  const resizeObserver = new ResizeObserver(updateNavigationHeights);
  if (header) resizeObserver.observe(header);
  if (docsNavigation) resizeObserver.observe(docsNavigation);
} else {
  window.addEventListener("resize", updateNavigationHeights);
}

function closeMenu() {
  menuButton?.setAttribute("aria-expanded", "false");
  if (navigation) navigation.dataset.open = "false";
  updateNavigationHeights();
}

menuButton?.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(expanded));
  if (navigation) navigation.dataset.open = String(expanded);
  updateNavigationHeights();
});

navigation?.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

navigation?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
    menuButton?.focus();
  }
});

document.querySelector(".toc")?.addEventListener("click", (event) => {
  if (event.target.closest("a") && matchMedia("(max-width: 900px)").matches) {
    event.currentTarget.querySelector("details").open = false;
  }
});
