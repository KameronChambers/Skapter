<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All app data reads/writes go through src/lib/data.ts (in-memory now, DB later); components never hold data logic.

- Keep dashboard demo metrics, recipe quantities, booking simulation and seeded timestamps in the central data layer so visual components do not own data operations.
- Use a keyed shared page error boundary plus route error components for actual error messages and stacks; reset the shared boundary on navigation.
- Keep initial time-dependent UI deterministic and update current-time highlights only after mount to prevent hydration mismatches.
- Initialize npm Leaflet and its OpenFreeMap MapLibre layer through dynamic imports inside the map effect; keep location/service-area calculations in data.ts and preserve an SVG fallback for tile or initialization failures, because SSR cannot evaluate browser-only map modules.
