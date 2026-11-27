// Sensory family icons: thin monoline SVG, currentColor, 24-unit grid. Decorative duplicates of text.
const wrap = (inner) =>
  `<svg class="sicon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const FAMILY_ICONS = {
  floral: wrap(
    [0, 72, 144, 216, 288]
      .map((r) => `<path d="M12 3.6c1.7 2.2 1.7 4.6 0 6.8-1.7-2.2-1.7-4.6 0-6.8z" transform="rotate(${r} 12 12)"/>`)
      .join('') + '<circle cx="12" cy="12" r="1.5"/>'
  ),
  citrus: wrap('<circle cx="12" cy="12" r="8"/><path d="M12 12V4M12 12l6.9 4M12 12l-6.9 4"/><circle cx="12" cy="12" r="5.2" stroke-dasharray="1.5 2.4"/>'),
  tropical: wrap('<path d="M12 21c0-6.5 2.2-10.8 6.5-13.5-1 5.8-3.2 10.3-6.5 13.5z"/><path d="M12 21c0-6.5-2.2-10.8-6.5-13.5 1 5.8 3.2 10.3 6.5 13.5z"/><path d="M12 21V3"/>'),
  orchard: wrap('<path d="M12 7.6c-3.2-2.2-7.4-.2-7.4 4.4C4.6 16.6 8 21 12 21s7.4-4.4 7.4-9c0-4.6-4.2-6.6-7.4-4.4z"/><path d="M12 7.6c0-2.2 1.1-3.8 3.2-4.6"/>'),
  dried: wrap('<ellipse cx="12" cy="12" rx="8.2" ry="5" transform="rotate(-24 12 12)"/><path d="M9.4 9.6c.9 1.2.9 3.4 0 4.8M13.6 8.6c1.1 1.8 1.1 5 0 6.8"/>'),
  cacao: wrap('<path d="M12 3c4.2 2 6.2 6 6.2 9s-2 7-6.2 9c-4.2-2-6.2-6-6.2-9s2-7 6.2-9z"/><path d="M12 3v18M8.6 7.2c-1 3-1 6.6 0 9.6M15.4 7.2c1 3 1 6.6 0 9.6"/>'),
  nut: wrap('<path d="M12 3c3.3 3.2 5.2 7.2 5.2 11.2a5.2 5.2 0 0 1-10.4 0C6.8 10.2 8.7 6.2 12 3z"/><path d="M12 6.4v9.2"/>'),
  sweet: wrap('<path d="M4.5 8.2 12 4.4l7.5 3.8L12 12 4.5 8.2z"/><path d="M4.5 8.2v7.6L12 19.6l7.5-3.8V8.2"/><path d="M12 12v7.6"/>'),
  tea: wrap('<path d="M19.4 4.6c-8.4 0-13.6 4.2-14.8 12.8 8.4 0 13.6-4.2 14.8-12.8z"/><path d="M4.6 17.4c3-5.2 7-8.6 11.6-10.6"/>'),
};

export const UI_ICONS = {
  theme: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="7.5"/><path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  bean: '<svg viewBox="0 0 17 20" width="14" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M0.903 9.48152L4.25826 3.50498C6.14072 0.151869 10.3413 -0.990947 13.5849 0.934944C13.9566 1.15562 14.2749 1.39098 14.5836 1.64371C17.0615 3.80996 17.7616 7.53819 16.084 10.5265L12.7385 16.4856C11.0608 19.4739 7.57121 20.7145 4.50801 19.5907C4.13111 19.4596 3.78348 19.2763 3.41182 19.0557C0.168198 17.1298 -0.969705 12.8173 0.903 9.48152ZM7.01255 17.8578C7.71444 17.8113 8.27353 17.2167 8.28155 16.4801L8.29131 16.4628L8.28307 3.27707L8.28134 2.55793C7.38438 2.95196 6.6095 3.65012 6.0828 4.5883L2.72754 10.5648C1.77168 12.2675 1.94649 14.3634 3.01183 15.8762C3.39185 16.403 3.88107 16.8556 4.45546 17.1967C4.84402 17.4274 5.24495 17.5959 5.65824 17.7023C6.10532 17.8288 6.55763 17.8657 7.01255 17.8578ZM10.0011 2.14279C9.29917 2.18934 8.74009 2.78398 8.73206 3.52049L8.72231 3.53787L8.73055 16.7236L8.73227 17.4427C9.62924 17.0487 10.4041 16.3505 10.9211 15.4297L14.2763 9.45318C15.359 7.5247 15.0088 5.13928 13.5685 3.61231C13.2722 3.29743 12.9298 3.02463 12.5413 2.79392C11.9669 2.45288 11.3411 2.24348 10.7075 2.16842C10.4729 2.14495 10.2454 2.14889 10.0011 2.14279Z"/></svg>',
};
