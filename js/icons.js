// BioEcho Organic Icons — Custom SVG icon set
// Lens = dew drop, Care = sprout, Earth = seed, Research = tree rings, Timeline = vine, Community = flock

const BioEchoIcons = {
  lens: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/><ellipse cx="11" cy="11" rx="2" ry="3" fill="currentColor" opacity="0.15"/><circle cx="9" cy="9" r="1" fill="currentColor" opacity="0.3"/></svg>`,
  sprout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22V10"/><path d="M12 10c0-4 3-7 7-7-1 4-3 7-7 7z" fill="currentColor" opacity="0.15"/><path d="M12 14c0-3-2.5-5.5-6-5.5 0.5 3.5 2.5 5.5 6 5.5z" fill="currentColor" opacity="0.1"/></svg>`,
  seed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><ellipse cx="12" cy="12" rx="5" ry="7" fill="currentColor" opacity="0.1"/><path d="M12 5v14"/><path d="M8 9c2 1 4 1 8 0"/><path d="M8 15c2-1 4-1 8 0"/></svg>`,
  rings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.15"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="10.5"/><circle cx="12" cy="10" r="0.8" fill="currentColor" opacity="0.3"/></svg>`,
  vine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 20C4 16 8 14 12 12S20 8 20 4"/><path d="M8 18c1-2 2-3 4-4" fill="currentColor" opacity="0.1"/><path d="M14 12c1-1.5 3-2.5 6-3" fill="currentColor" opacity="0.1"/><circle cx="8" cy="18" r="1.5" fill="currentColor" opacity="0.15"/><circle cx="14" cy="11" r="1.5" fill="currentColor" opacity="0.15"/></svg>`,
  flock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 12c3-3 6-3 9 0s6 3 9 0"/><path d="M5 8c2-2 4-2 6 0s4 2 6 0"/><path d="M7 16c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0"/><circle cx="4" cy="8" r="0.8" fill="currentColor" opacity="0.3"/><circle cx="3" cy="12" r="0.8" fill="currentColor" opacity="0.3"/><circle cx="7" cy="16" r="0.8" fill="currentColor" opacity="0.3"/></svg>`,
  leaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22c-4-4-6-8-6-12C6 5 9 2 12 2s6 3 6 8c0 4-2 8-6 12z" fill="currentColor" opacity="0.1"/><path d="M12 2v20"/><path d="M8 8c2 1 4 3 4 4"/><path d="M16 10c-2 0-4 2-4 2"/></svg>`,
  tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22V10"/><path d="M12 10c-4 0-7-3-7-7 3 0 5 2 7 4 2-2 4-4 7-4 0 4-3 7-7 7z" fill="currentColor" opacity="0.15"/></svg>`,
  water: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 12c3-3 6-3 10 0s7 3 10 0"/><path d="M2 8c3-3 6-3 10 0s7 3 10 0"/><path d="M2 16c3-3 6-3 10 0s7 3 10 0"/></svg>`,
  connection: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 8l6 4" stroke-dasharray="2 2"/><circle cx="18" cy="6" r="2" fill="currentColor" opacity="0.2"/><circle cx="6" cy="18" r="2" fill="currentColor" opacity="0.2"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 3c-3 0-6 2-6 5v5c0 3 3 5 6 5s6-2 6-5V8c0-3-3-5-6-5z" fill="currentColor" opacity="0.08"/><path d="M5 12c0 4 3 7 7 7s7-3 7-7"/><path d="M10 12v2"/><path d="M14 12v2"/><path d="M12 12v3"/></svg>`,
  emergency: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2L2 22h20L12 2z" fill="currentColor" opacity="0.08"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/></svg>`,
  device: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="7" y="2" width="10" height="20" rx="2" fill="currentColor" opacity="0.08"/><path d="M12 18h.01"/><path d="M9 6h6"/><path d="M9 10h6"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.06"/><path d="M2 12h20"/><path d="M12 2c3 3 4 6 4 10s-1 7-4 10"/><path d="M12 2c-3 3-4 6-4 10s1 7 4 10"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>`
};

function bioechoIcon(name, size = 20) {
  const svg = BioEchoIcons[name];
  if (!svg) return '';
  return `<span class="bioecho-icon" style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center">${svg}</span>`;
}
