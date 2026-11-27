// Inspection state machine: browsing → entering → inspecting → returning → browsing.
// Pure: (state, event) → state. The controller performs the side effects.
export const BROWSING = 'browsing';
export const ENTERING = 'entering';
export const INSPECTING = 'inspecting';
export const RETURNING = 'returning';

export const initial = { state: BROWSING, slug: null, last: null, seq: 0 };

export function transition(s, ev) {
  const seq = s.seq + 1;
  switch (ev.type) {
    case 'INSPECT':
      if (!ev.slug) return s;
      if (s.state === ENTERING && s.slug === ev.slug) return s; // already on the way
      if (s.state === INSPECTING && s.slug === ev.slug) return s;
      return { state: ENTERING, slug: ev.slug, last: s.slug || s.last, seq };
    case 'BACK':
      if (s.state === BROWSING) return s;
      if (s.state === RETURNING) return s;
      return { state: RETURNING, slug: s.slug, last: s.slug, seq };
    case 'DONE':
      if (ev.seq !== undefined && ev.seq !== s.seq) return s; // stale completion
      if (s.state === ENTERING) return { ...s, state: INSPECTING };
      if (s.state === RETURNING) return { state: BROWSING, slug: null, last: s.slug, seq: s.seq };
      return s;
    case 'ROUTE':
      return ev.slug ? transition(s, { type: 'INSPECT', slug: ev.slug }) : transition(s, { type: 'BACK' });
    default:
      return s;
  }
}
