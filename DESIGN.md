# Interface direction

The app is a shared financial ledger for a basketball association. Visitors need to find dues, expenses, fines, and Sunday duties quickly. The treasurer needs clear forms that work with one hand on a phone.

## Tokens

- Navy `#102C46`: navigation and the cash balance panel.
- Court blue `#215FC2`: primary controls, selection, and focus.
- Basketball orange `#D66A16`: a small brand accent and supporting data color.
- Canvas `#F3F6FA`: the light page background.
- Ink `#182B3A`: main text.
- Slate `#526575`: supporting text.
- Dark mode uses blue-gray surfaces, pale text, and lighter blue/orange accents with equivalent contrast.

## Type and spacing

Archivo is the single interface family. Its sturdy shapes suit sports club records while remaining readable at small sizes. Figures use tabular numbers; headings use heavier weight with a compact scale. Body lines stay below 80 characters. Controls are at least 44 pixels tall.

## Layout

Desktop keeps the six public modules in a persistent left navigation. Mobile shows all six in a compact two-row navigation so no module is hidden beyond a horizontal scroll. Pages are left aligned. A strong cash balance panel anchors the dashboard, with quieter ledger rows for the supporting records.

```text
Desktop                       Mobile
Navigation | Page controls     Brand + preferences
           | Page title        6 module links (3 × 2)
           | Balance / totals  Page title
           | Ledger + duty     Balance / totals
                               Ledger / duty
```

## Review against the brief

The original test page gave language and theme controls most of the screen and did not expose the modules. The new layout gives those controls a consistent header position and uses navigation, financial records, and the next kit duty as the main content. Basketball appears in the brand mark and a subtle court motif on the balance panel. Additional decoration and unrelated animation are excluded to keep pages fast on slow connections.

The public interface uses plain French and English. Unavailable data is identified without showing invented totals. Print layouts remain light. Keyboard focus, contrast, reduced motion, and narrow screens are checked as part of the design review.

Design guidance: Anthropic's `frontend-design` skill, read from its official repository.
