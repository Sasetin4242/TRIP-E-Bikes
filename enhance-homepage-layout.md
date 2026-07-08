# Plan: Enhance Homepage Layout & Fix Overlaying Elements

This plan outlines the enhancements to the TRIP Mobility homepage, fixing the overlaying/missing emoji glyphs ("tofu" elements) on the Industry/Sector cards, updating card button styles to prevent layout bloat, and adding high-end hover animations.

## Proposed Changes

### Global Stylesheet

#### [MODIFY] [index.css](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/TRIP%20E-BIKES/TRIP%20E-Bikes%20App/src/index.css)
- Add a new `.btn-compact` button utility style in `@layer components`. This button will have compact padding (`py-2 px-4`) and small/xs text, and override the default min-height and padding of the full-sized `.btn-primary` and `.btn-outline` buttons.
- Add hover transitions and subtle custom animation utilities if needed for premium neon card glows.

### Component/Page Updates

#### [MODIFY] [HomePage.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/TRIP%20E-BIKES/TRIP%20E-Bikes%20App/src/pages/HomePage.tsx)
- Import Lucide-React icons: `Landmark` (Government), `Compass` (Tourism & Resorts), `GraduationCap` (Universities), and `Truck` (Logistics).
- Restructure the industries list from a string array to an array of objects:
  ```typescript
  const INDUSTRIES = [
    { label: "Government", icon: Landmark, href: "/industries" },
    { label: "Tourism & Resorts", icon: Compass, href: "/industries" },
    { label: "Universities", icon: GraduationCap, href: "/industries" },
    { label: "Logistics", icon: Truck, href: "/industries" },
  ];
  ```
- Render the new Lucide icons inside the industry card loop instead of raw emojis to fix the "tofu" glyph bugs.
- Replace the inner classes of the Use Case card buttons with the new `.btn-compact` style class, ensuring consistent sizing and preventing visual overflow.
- Update the industry card CSS transition/hover styles: scale up on hover (`group-hover:scale-[1.03]`), border glow matching colors, and slight vertical movement.

## Verification Plan

### Automated Tests
- Run the linter: `python .agents/skills/lint-and-validate/scripts/lint_runner.py .`

### Manual Verification
- Verify homepage appearance in browser, ensuring card styling is compact, emojis are replaced by Lucide icons, and no glyph render issues exist.
