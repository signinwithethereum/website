<script setup lang="ts">
/* The brand page's live section.
 *
 * The mark is a grid of cells rather than a drawing, which means its states are
 * geometry and not video — so the honest way to show it is to run it. */

import { ref } from 'vue'
import { WORDMARK_STATES, ICON_STATES, SWATCHES } from '../data/brand'
import Mark from './Mark.vue'

const wordmark = ref<(typeof WORDMARK_STATES)[number]['id']>('pending')
const icon = ref<(typeof ICON_STATES)[number]['id']>('morph')
</script>

<template>
  <div class="bk">
    <section>
      <h2 class="t-h3">The wordmark</h2>
      <div class="screen bk-stage">
        <div class="bk-stage-in">
          <Mark canvas="mark" :state="wordmark === 'rest' ? null : (wordmark as any)" :background="false" />
        </div>
      </div>
      <div class="bk-states" role="group" aria-label="Wordmark states">
        <button
          v-for="s in WORDMARK_STATES"
          :key="s.id"
          type="button"
          :class="{ 'is-on': wordmark === s.id }"
          :aria-pressed="wordmark === s.id"
          @click="wordmark = s.id"
        >
          {{ s.label }}
        </button>
      </div>
      <p class="bk-note">{{ WORDMARK_STATES.find((s) => s.id === wordmark)!.note }}</p>
    </section>

    <section>
      <h2 class="t-h3">The icon</h2>
      <p class="bk-lead">
        One glyph on the same five lines, seven cells wide, and it has three
        readings: the wordmark's S, Ξ, and a diamond. Each reading is exactly one
        segment per line, which is what makes the travel between them legible
        rather than a cut. The icon runs ink only, no accent, because at seven
        pixels wide only geometry and level survive.
      </p>
      <div class="bk-icons">
        <div class="screen bk-icon-stage">
          <div class="bk-stage-in">
            <Mark canvas="icon" :state="icon === 'rest' ? null : (icon as any)" :background="false" />
          </div>
        </div>
        <div class="bk-readings">
          <figure>
            <div class="screen"><div class="bk-stage-in"><Mark canvas="icon" :background="false" /></div></div>
            <figcaption>S, 21 cells</figcaption>
          </figure>
          <figure>
            <div class="screen"><div class="bk-stage-in"><Mark canvas="iconE" :background="false" /></div></div>
            <figcaption>Ξ, 22 cells</figcaption>
          </figure>
          <figure>
            <div class="screen"><div class="bk-stage-in"><Mark canvas="iconDiamond" :background="false" /></div></div>
            <figcaption>Diamond, 18 cells</figcaption>
          </figure>
        </div>
      </div>
      <div class="bk-states" role="group" aria-label="Icon states">
        <button
          v-for="s in ICON_STATES"
          :key="s.id"
          type="button"
          :class="{ 'is-on': icon === s.id }"
          :aria-pressed="icon === s.id"
          @click="icon = s.id"
        >
          {{ s.label }}
        </button>
      </div>
      <p class="bk-note">{{ ICON_STATES.find((s) => s.id === icon)!.note }}</p>
    </section>

    <section>
      <h2 class="t-h3">Colour</h2>
      <ul class="bk-swatches">
        <li v-for="s in SWATCHES" :key="s.name">
          <span class="bk-chip" :style="{ background: s.hex }" />
          <strong>{{ s.name }}</strong>
          <code>{{ s.hex }}</code>
          <span>{{ s.note }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.bk {
  display: flex;
  flex-direction: column;
  gap: var(--s8);
  margin-top: var(--s6);
}

.bk h2 {
  margin-bottom: var(--s4);
}

.bk-lead {
  max-width: 66ch;
  margin: 0 0 var(--s5);
  font-size: var(--t-small);
  line-height: 1.65;
  color: var(--ink-2);
  text-wrap: pretty;
}

/* The mark is 29 cells wide here rather than the field canvas's 33, so the
 * cell goes up to hold the same presence on the panel. Accent is greyed: the
 * states that light a cell — the scan band, confirm's pass, the cells coming
 * back from dissolve — read as level against the ink, not as a second hue. */
.bk-stage {
  --u: clamp(5px, 1.3vw, 13px);
  --accent: var(--screen-dim);
}

.bk-stage-in {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  padding: var(--s7) var(--s5);
}

/* ---------------------------------------------------------------- states */

.bk-states {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
  margin-top: var(--s4);
}

.bk-states button {
  height: 30px;
  padding-inline: var(--s3);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: transparent;
  color: var(--ink-2);
  font-family: var(--font-mono);
  font-size: var(--t-tiny);
  cursor: pointer;
  transition: border-color 0.15s var(--ease), color 0.15s var(--ease);
}

.bk-states button:hover {
  border-color: var(--rule-strong);
  color: var(--ink);
}

.bk-states button.is-on {
  border-color: var(--ink);
  color: var(--ink);
}

.bk-note {
  margin: var(--s3) 0 0;
  max-width: 62ch;
  font-size: var(--t-small);
  line-height: 1.6;
  color: var(--ink-2);
}

/* ----------------------------------------------------------------- icon */

.bk-icons {
  display: grid;
  gap: var(--s3);
}

@media (min-width: 760px) {
  .bk-icons {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  }
}

.bk-icon-stage {
  --u: clamp(10px, 3.4vw, 26px);
}

.bk-readings {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s3);
}

.bk-readings figure {
  margin: 0;
}

.bk-readings .screen {
  --u: clamp(5px, 1.5vw, 12px);
}

.bk-readings figcaption {
  margin-top: var(--s2);
  font-family: var(--font-mono);
  font-size: var(--t-label);
  letter-spacing: 0.04em;
  color: var(--ink-3);
}

/* -------------------------------------------------------------- swatches */

.bk-swatches {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--rule);
}

.bk-swatches li {
  display: grid;
  grid-template-columns: 28px auto auto;
  gap: var(--s2) var(--s4);
  align-items: center;
  padding: var(--s4) 0;
  border-bottom: 1px solid var(--rule);
}

.bk-chip {
  grid-row: span 2;
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
  box-shadow: inset 0 0 0 1px var(--rule-strong);
}

.bk-swatches strong {
  font-size: var(--t-small);
  font-weight: 500;
}

.bk-swatches code {
  padding: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: var(--t-tiny);
  color: var(--ink-3);
}

.bk-swatches li > span:last-child {
  grid-column: 2 / -1;
  font-size: var(--t-tiny);
  line-height: 1.55;
  color: var(--ink-2);
}
</style>
