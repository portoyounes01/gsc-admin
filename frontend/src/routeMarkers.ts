export function safeRouteColor(value: unknown): string {
  return typeof value === "string" && value.length === 7 && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2E6F95";
}

export function routeStopElement(color: unknown, sequence: unknown): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "gsc-route-stop";
  element.style.backgroundColor = safeRouteColor(color);
  element.textContent = String(sequence);
  return element;
}
