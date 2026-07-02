// Svelte action: move the node to document.body so overlays (popovers, modals)
// escape any ancestor's overflow/stacking context and paint above the page
// (spec ui-standards/controls.md › menus & popovers — layering).
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      if (node.parentNode) node.parentNode.removeChild(node);
    },
  };
}
