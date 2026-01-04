## Rich Text Paragraph Support for Fabric.js

**Design Context & Development Plan**

### Project Goal

Extend Fabric.js Text/Textbox/IText to support **paragraph-level rich text styling** (alignment, justification, line height) in a **single native Fabric object**, without HTML overlays or object fragmentation.

The goal is **shippable, maintainable, upstream-resilient code**, not a prototype.

---

## Core Design Decisions

### 1. In-core fork (non-negotiable)

Paragraph styling is implemented **inside Fabric’s text engine**, not via:

* HTML overlays
* multiple text objects
* external layout engines

Reason: only in-core changes preserve zoom/pan, transforms, selection, serialization, export, and performance guarantees.

---

### 2. Paragraph styles are metadata, not merged styles

* **Character styles** remain in Fabric’s existing `styles` map
* **Paragraph styles** are stored separately and *referenced during layout*

We never merge paragraph styles into per-character styles.

---

### 3. Stable paragraph identity (IDs, not indices)

Paragraphs are persisted as an **ordered array with stable IDs**:

```ts
paragraphs: Array<{
  id: string;
  style?: {
    align?: TextAlign;
    lineHeight?: number;
  };
}>;
```

Why:

* Paragraph indices shift on newline edits
* Undo/redo, paste, IME input make index-shifting fragile
* Stable IDs survive edits, serialization, and undo cleanly

---

### 4. Derived layout metadata (never serialized)

The following are **derived caches**, rebuilt as needed:

```ts
__paragraphRanges: Array<{ startChar: number; endChar: number; id: string }>;
__lineMeta: Array<{
  paragraphIndex: number;
  startChar: number;
  endChar: number;
  isHardBreakEnd: boolean;
  isLastLineOfParagraph: boolean;
}>;
__lineHeights: number[];
```

These are **authoritative for rendering**, but never persisted.

---

### 5. Exactly two rebuild passes (separation of concerns)

#### A) Paragraph sync (text → paragraphs)

```ts
__syncParagraphsWithText()
```

Responsibilities:

* Count paragraphs from `this.text`
* Ensure `paragraphs.length` matches
* Generate IDs for new paragraphs
* Split / merge paragraph entries on `\n` edits
* Preserve styles on splits; merge styles conservatively

No visual layout logic here.

---

#### B) Line metadata rebuild (wrap → visual lines)

```ts
__rebuildLineMetaAfterWrap()
```

Responsibilities:

* Map wrapped visual lines to paragraph indices
* Mark last visual line of each paragraph
* Provide flags for justification logic

No text mutation here.

---

### 6. Justification rules (explicit)

For `justify` / `justify-*` alignments:

* **Never stretch spaces on the last visual line of a paragraph**
* Last line is defined as:

  * hard newline end, OR
  * final wrapped line belonging to that paragraph

This logic is driven exclusively by `__lineMeta`.

---

### 7. Editing UX rules (locked)

* Cursor only → applies to current paragraph
* Selection spanning paragraphs → applies to all touched paragraphs
* Selection within paragraph → paragraph styles still apply to that paragraph
* Character styles remain selection-scoped

English / LTR only (RTL and bidi explicitly deferred).

---

## Development Plan (PR-based)

### PR-1 — Paragraph model + scaffolding (NO behavior change)

* Add `paragraphs` property
* Serialization / deserialization
* Internal rebuild scaffolding
* Zero rendering changes

### PR-2 — Paragraph alignment (MVP)

* Per-paragraph left/center/right alignment
* Rendering only
* First visible win

### PR-3 — Justification (skip last line)

* Justify logic using line metadata

### PR-4 — Per-paragraph lineHeight

* Cached per-line heights
* Cursor/selection correctness

### PR-5 — Editing ergonomics + paste rules

* Multi-paragraph selection behavior
* Style inheritance on paste

---

## Testing Strategy (Minimum)

* Paragraph alignment per line
* Newline insertion preserves paragraph styles
* Multi-paragraph selection applies styles correctly
* Justify does not stretch last paragraph line
* Serialize → deserialize roundtrip
* Performance sanity on large text

---

## Non-Goals (Explicitly Deferred)

* RTL / bidi
* Vertical text
* Per-paragraph direction
* Mixed writing modes
* HTML export

---

## Guiding Principle

**Paragraph styles influence layout, not text content.**
All paragraph logic flows through cached metadata, never ad-hoc string parsing.

---

---

## PR-1 Diff Outline & Codex Instructions

This is the **exact instruction set you can paste into Codex** to implement PR-1 safely.

---

## PR-1 Objective (Restated)

> Introduce a paragraph model and internal metadata scaffolding **without changing rendering or behavior**.

If PR-1 changes visuals, it’s wrong.

---

## Files in Scope

* `src/shapes/Text/Text.ts`
* `src/shapes/Textbox.ts`
* `src/shapes/IText/IText.ts`
* `src/shapes/IText/ITextBehavior.ts`

---

## Codex Instructions — PR-1

### 1️⃣ Add persisted paragraph model (Text.ts)

**Add a new public property on Text:**

```ts
paragraphs: Array<{
  id: string;
  style?: {
    align?: TextAlign;
    lineHeight?: number;
  };
}> = [];
```

* Default: empty array
* Do NOT use indices as identity
* Do NOT add rendering logic yet

---

### 2️⃣ Serialization support (Text.ts)

Modify:

* `toObject()`
* static `fromObject()`

Rules:

* Include `paragraphs` in serialization
* If deserializing an object with no `paragraphs`, initialize them based on text (`\n` count)
* Preserve backward compatibility

---

### 3️⃣ Internal (non-serialized) caches (Text.ts)

Add protected properties:

```ts
protected __paragraphRanges: Array<{ startChar: number; endChar: number; id: string }> = [];
protected __lineMeta: Array<any> = [];
protected __lineHeights: number[] = [];
```

⚠️ These must NOT be serialized.

---

### 4️⃣ Paragraph sync method (Text.ts)

Add:

```ts
protected __syncParagraphsWithText(): void
```

Responsibilities:

* Count paragraphs from `this.text`
* Ensure `this.paragraphs.length` matches
* Generate IDs for new paragraphs
* Preserve existing paragraph objects where possible
* No layout logic
* No wrapping logic

Call this method:

* After text is set
* After deserialization
* After text mutations (hook only; behavior added later)

---

### 5️⃣ Line metadata rebuild stub (Text.ts)

Add (empty implementation for now):

```ts
protected __rebuildLineMetaAfterWrap(): void
```

This method:

* Exists
* Is callable
* Does nothing in PR-1

(Used later by PR-2+)

---

### 6️⃣ Hook paragraph sync into lifecycle (minimal)

Call `__syncParagraphsWithText()` from:

* Text initialization
* Deserialization
* Text-setting paths

⚠️ Do NOT hook into rendering yet
⚠️ Do NOT modify `_getLineLeftOffset`, justification, or height logic

---

### 7️⃣ NO behavior changes (hard rule)

PR-1 must **not**:

* Change text alignment
* Change wrapping
* Change justification
* Change cursor behavior
* Change selection behavior

If tests or visual output change, revert.

---

## Acceptance Checklist for PR-1

* [ ] Existing tests pass
* [ ] Serialized JSON includes `paragraphs`
* [ ] Loading old JSON works
* [ ] Editing text does not throw
* [ ] No visual changes

---

## What Comes Next

Once PR-1 lands cleanly:

* PR-2 will modify `_getLineLeftOffset` using `__lineMeta`
* PR-3 will patch justification
* PR-4 will patch line height
* PR-5 will patch editing UX

Each PR builds strictly on previous scaffolding.

---

If you want, **next step** I can:

* Write the **exact PR-2 Codex instructions** (paragraph alignment MVP), or
* Review Codex’s PR-1 output before you commit, to ensure no accidental behavior drift.

You’re doing this the *right* way — this will scale.