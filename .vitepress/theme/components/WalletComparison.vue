<script setup lang="ts">
/* Two sign-in flows, run side by side off one state machine.
 *
 * The argument the section makes is that the cryptography is identical — both
 * lanes call personal_sign over bytes — and the only thing that differs is the
 * payload. Sign a raw challenge and the wallet has nothing to parse, so it
 * falls back to showing hex and a warning. Follow ERC-4361 and the wallet can
 * recognise the request and draw an actual sign-in screen. So both phones are
 * the same object with the same palette and the same buttons: any difference a
 * reader sees is content, which is the point.
 *
 * That invariant is why the lanes are one template rendered twice off LANES
 * rather than two blocks kept in sync by hand — the markup cannot drift from
 * the claim it is making. Only the sheet body branches, because that is the
 * difference the section exists to show. */

import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Mark from "./Mark.vue";
import { EXAMPLE } from "../lib/example";
import { SHORT_ADDRESS, CHALLENGE, ROWS, LANES, MARKERS, NOTES, type Step, type Lane } from "../data/wallet-comparison";

/* The status bar reads the reader's own clock, which is a small thing that
 * makes the mock feel like a device rather than a picture of one. It starts on
 * the canonical 9:41 so the server-rendered markup and the first client render
 * agree, then takes the real time once mounted, and re-ticks on the minute.
 * Building the formatter is the costly half of Intl, so it is built once. */
const CLOCK_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

const now = ref("9:41");

let clockTimer: ReturnType<typeof setTimeout>;

function tickClock() {
  now.value = CLOCK_FORMAT.formatToParts(new Date())
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();

  clockTimer = setTimeout(tickClock, 60_000 - (Date.now() % 60_000));
}

onMounted(tickClock);
onBeforeUnmount(() => clearTimeout(clockTimer));

/* Begin at START so the complete sign-in flow is visible. */
const step = ref<Step>("idle");

/* Narrow screens show one lane at a time, and the one worth landing on is the
 * one the page is arguing for. */
const lane = ref<Lane>("siwe");

/* START advances after five seconds if the reader does not choose the next
 * action themselves. Only the sheet's sign action completes after its brief
 * pending state; selecting a step in the toolbar always remains there. */
let stepTimer: ReturnType<typeof setTimeout>;

function scheduleNextStep(completeSigning = false) {
  if (step.value === "idle") stepTimer = setTimeout(() => go("review"), 5_000);
  if (step.value === "signing" && completeSigning) {
    stepTimer = setTimeout(() => go("done"), 900);
  }
}

function go(next: Step, completeSigning = false) {
  clearTimeout(stepTimer);
  step.value = next;
  scheduleNextStep(completeSigning);
}

onMounted(scheduleNextStep);
onBeforeUnmount(() => clearTimeout(stepTimer));

const sheetUp = computed(
  () => step.value === "review" || step.value === "signing",
);

const appSub = computed(() =>
  step.value === "done"
    ? "Session started, no password involved."
    : "Continue with your Ethereum account.",
);

/* ------------------------------------------------------- the SIWE button */

/* Only the SIWE lane carries a mark, so one flag covers the button: the other
 * lane's CTA is a word, and a disabled button sends no pointer events, so the
 * hover state cannot survive the press that opens the sheet. */
const ctaHot = ref(false);

/* The icon says what the button is doing, which is the whole reason it is a
 * mark and not a picture of one. It rests until the wallet has been asked,
 * traces its own outline under a pointer that is about to press it, and runs
 * `pending` for as long as the sheet is up and the answer is outstanding.
 *
 * Both states work in level rather than in colour, which is what they have to
 * do here: the mark sits on the button's own ink, so it is drawn in the
 * button's foreground and has no second colour to swap to. */
const ctaState = computed(() =>
  sheetUp.value ? "pending" : ctaHot.value ? "trace" : null,
);
</script>

<template>
  <section id="message" class="band">
    <div class="shell">
      <header class="section-head">
        <h2>Signing shouldn't mean guessing.</h2>
        <p>
          A signature request is only as safe as what the person can read, and
          asking someone to sign a raw challenge leaves the wallet nothing to
          work with, so it shows the bytes and a warning. ERC&#8209;4361 gives
          every field a fixed place, so the wallet can recognise the request and
          draw a real sign-in screen: which site, which account, which network,
          when it expires.
          <a href="/docs/message">Read the message format &rarr;</a>
        </p>
      </header>

      <div class="lane-switch seg" role="group" aria-label="Choose a flow">
        <button
          v-for="l in LANES"
          :key="l.id"
          type="button"
          :class="l.tone"
          :aria-pressed="lane === l.id"
          @click="lane = l.id"
        >
          <span aria-hidden="true">{{ l.mark }}</span> {{ l.verdict }}
        </button>
      </div>

      <div class="stage">
        <article
          v-for="l in LANES"
          :key="l.id"
          class="lane"
          :class="[`lane-${l.id}`, l.tone, { 'is-hidden': lane !== l.id }]"
        >
          <p class="verdict">
            <span aria-hidden="true">{{ l.mark }}</span> {{ l.verdict }}
          </p>

          <div class="phone">
            <div class="phone-screen">
              <div class="app" :class="{ 'is-behind': sheetUp }">
                <div class="status" aria-hidden="true">
                  <span>{{ now }}</span>
                  <span class="bars"><i /><i /><i /></span>
                </div>
                <div class="app-body">
                  <p class="t-label app-brand">
                    <span class="glyph" aria-hidden="true" />Example App
                  </p>
                  <div class="app-center">
                    <p class="app-h">Welcome back</p>
                    <p class="app-sub">{{ appSub }}</p>

                    <template v-if="step !== 'done'">
                      <button
                        type="button"
                        class="app-cta"
                        :class="{
                          'is-hinting': step === 'idle',
                          'has-mark': l.id === 'siwe',
                        }"
                        :disabled="sheetUp"
                        @click="go('review')"
                        @pointerenter="ctaHot = true"
                        @pointerleave="ctaHot = false"
                      >
                        <span v-if="l.id === 'siwe'" class="cta-lockup">
                          <Mark
                            class="cta-mark"
                            canvas="icon"
                            :background="false"
                            :state="ctaState"
                          />
                          <span class="cta-rule" aria-hidden="true" />
                        </span>
                        <span class="cta-label">{{ l.cta }}</span>
                      </button>
                      <p class="app-terms">
                        By continuing you agree to the terms.
                      </p>
                    </template>

                    <p v-else class="app-session">
                      <span class="glyph" aria-hidden="true" />
                      <span>{{ SHORT_ADDRESS }}</span>
                      <span class="t-label app-session-state">Signed in</span>
                    </p>
                    <button
                      v-if="step === 'done'"
                      type="button"
                      class="app-signout"
                      @click="go('idle')"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>

              <span
                class="scrim"
                :class="{ 'is-on': sheetUp }"
                aria-hidden="true"
              />

              <div
                class="sheet"
                :class="{ 'is-up': sheetUp }"
                :inert="!sheetUp"
              >
                <span class="grabber" />
                <p class="sheet-title">{{ l.sheetTitle }}</p>
                <p class="sheet-origin">{{ EXAMPLE.domain }}</p>

                <!-- The one place the two phones are allowed to differ. -->
                <template v-if="l.id === 'adhoc'">
                  <p class="t-label sheet-label">Message</p>
                  <p class="hex">{{ CHALLENGE }}</p>
                  <p class="hex-meta">
                    32 bytes &middot; nothing a person can read
                  </p>

                  <p class="alert">
                    <strong class="t-label">Sign at your own risk</strong>
                    Only sign this message if you understand what it does and
                    trust the site asking for it.
                  </p>
                </template>

                <template v-else>
                  <p class="statement">{{ EXAMPLE.statement }}</p>

                  <dl class="rows">
                    <div v-for="row in ROWS" :key="row.label">
                      <dt>{{ row.label }}</dt>
                      <dd>
                        {{ row.value }}
                        <span v-if="row.check" class="check">
                          &check; {{ row.check }}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <p class="sheet-foot">
                    No transaction, no gas, nothing moves onchain.
                  </p>
                </template>

                <div class="sheet-actions">
                  <button
                    type="button"
                    :disabled="step !== 'review'"
                    @click="go('idle')"
                  >
                    {{ l.reject }}
                  </button>
                  <button
                    type="button"
                    class="primary"
                    :disabled="step !== 'review'"
                    @click="go('signing', true)"
                  >
                    {{ step === "signing" ? "Signing…" : l.sign }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p class="lane-caption">{{ l.captions[step] }}</p>
        </article>
      </div>

      <div class="control">
        <ol class="steps seg">
          <li v-for="marker in MARKERS" :key="marker.step">
            <button
              type="button"
              :aria-current="step === marker.step ? 'step' : undefined"
              @click="go(marker.step)"
            >
              {{ marker.label }}
            </button>
          </li>
        </ol>
        <p class="note" aria-live="polite">{{ NOTES[step] }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ------------------------------------------------------------- section */

.section-head {
  display: grid;
  gap: var(--s3);
  max-width: 42rem;
}

.section-head a {
  color: var(--accent-ui);
  text-decoration: none;
  white-space: nowrap;
}

.section-head a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.section-head h2 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.015em;
}

.section-head p {
  margin: 0;
  font-size: var(--t-small);
  line-height: 1.65;
  color: var(--ink-2);
  text-wrap: pretty;
}

/* ------------------------------------------------------------ segments */

/* Both button groups in this section are the same control: a bordered pill of
 * mono labels with one selected. They differ only in what "selected" looks
 * like, so only that is written twice. */
.seg {
  display: flex;
  gap: var(--s1);
  margin: 0;
  padding: 3px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  list-style: none;
}

.seg button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding-inline: 10px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--t-label);
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color 0.15s var(--ease),
    background 0.15s var(--ease);
}

.seg button:hover {
  color: var(--ink);
}

/* The verdict colour, set once per lane and read by the chip above the phone
 * and by the switch that stands in for it on narrow screens. */
.tone-no {
  --tone: var(--danger);
}

.tone-yes {
  --tone: var(--ok);
}

/* ------------------------------------------------------------- control */

.control {
  display: grid;
  justify-items: center;
  gap: var(--s3);
  margin-top: var(--s7);
}

.steps button[aria-current="step"] {
  background: var(--ink);
  color: var(--canvas);
}

.note {
  max-width: 44ch;
  margin: 0;
  font-size: var(--t-tiny);
  line-height: 1.5;
  text-align: center;
  text-wrap: pretty;
  color: var(--ink-3);
}

/* The one-at-a-time switch, for widths where two phones will not sit side by
 * side. Above that it is off and both lanes are always on screen. */
.lane-switch {
  display: none;
  margin-top: var(--s5);
}

.lane-switch button {
  flex: 1;
  min-height: 34px;
}

/* On narrow the switch stands in for the chips, so the selected side carries
 * the verdict rather than a neutral fill. */
.lane-switch button[aria-pressed="true"] {
  background: color-mix(in srgb, var(--tone) 12%, transparent);
  color: var(--tone);
}

/* --------------------------------------------------------------- stage */

.stage {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s6);
  justify-items: center;
  margin-top: var(--s6);
}

.lane {
  /* How this lane's phone sits: its lean, its pitch, and how far it lifts on
   * hover. Declared here so the narrow and reduced-motion blocks can flatten
   * the device by resetting values instead of restating the transform. */
  --lean: 0deg;
  --pitch: 2deg;
  --lift: -3px;

  display: grid;
  /* Both lanes stretch to the taller of the two, and without this the surplus
   * is shared out among the rows — which the phone answers by growing its
   * bezel, since the screen inside it is pinned to an aspect ratio. Whichever
   * caption wraps to fewer lines would get the taller phone. */
  align-content: start;
  gap: var(--s4);
  justify-items: center;
  width: 100%;
  max-width: 320px;
}

.lane-adhoc {
  --lean: 7deg;
}

.lane-siwe {
  --lean: -7deg;
}

/* Names the lane and delivers the verdict in one mark, above the phone it
 * judges. */
.verdict {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin: 0;
  padding: 7px 12px;
  border: 1px solid color-mix(in srgb, var(--tone) 40%, transparent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--tone) 8%, transparent);
  color: var(--tone);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: var(--track-label);
  text-transform: uppercase;
}

.verdict span {
  font-size: 1.1em;
}

.lane-caption {
  margin: 0;
  /* Three lines held open, so stepping through the flow does not shunt the
   * step bar and the closing copy up and down under the reader. */
  min-height: 4.65em;
  max-width: 34ch;
  font-size: var(--t-tiny);
  line-height: 1.55;
  text-align: center;
  text-wrap: pretty;
  color: var(--ink-2);
}

/* --------------------------------------------------------------- phone */

/* Just enough of a device to read as one: a bezel, a radius, a status bar.
 * The tilt is small on purpose — the two phones lean towards each other like
 * an open book, and lift when you reach for one. */
.phone {
  width: 100%;
  padding: 7px;
  border: 1px solid var(--rule-strong);
  border-radius: 30px;
  background: var(--canvas-3);
  box-shadow: 0 24px 48px -28px rgba(0, 0, 0, 0.45);
  transform: perspective(1600px) rotateY(var(--lean)) rotateX(var(--pitch));
  transition:
    transform 0.45s var(--ease-out),
    box-shadow 0.45s var(--ease-out);
}

.phone:hover,
.phone:focus-within {
  transform: perspective(1600px) rotateY(var(--lean)) rotateX(var(--pitch))
    translateY(var(--lift));
  box-shadow: 0 30px 56px -28px rgba(0, 0, 0, 0.52);
}

/* The device inherits the page's four colour roles rather than forcing the
 * screen palette, so it is a light phone under a light page and a dark one
 * under a dark page — which is also what a real wallet does. The only thing
 * it adds is one step of elevation for the sheet, because "raised" is white
 * over a dimmed white on light and a lighter grey over black on dark. */
.phone-screen {
  --sheet: var(--canvas);
  --sheet-shadow: 0 -18px 40px -20px rgba(0, 0, 0, 0.3);

  position: relative;
  aspect-ratio: 300 / 580;
  border-radius: 24px;
  background: var(--canvas);
  color: var(--ink);
  /* A hairline so the screen has an edge against the bezel, which matters most
   * on light, where both are within a few percent of white. */
  box-shadow: inset 0 0 0 1px var(--rule);
  overflow: hidden;
}

.dark .phone-screen {
  --sheet: var(--canvas-3);
  --sheet-shadow: 0 -18px 40px -20px rgba(0, 0, 0, 0.6);
}

/* ----------------------------------------------------------- app layer */

.app {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s var(--ease);
}

.app.is-behind {
  transform: scale(0.985);
}

/* The scrim veils rather than darkens in light mode: white over a light screen
 * washes the app out without turning the phone into a black rectangle. Dark
 * mode keeps black, where the ground is already dark and the effect reads as
 * the text losing its contrast. Either way the sheet is what you look at. */
.scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.42s var(--ease-out);
}

.scrim.is-on {
  opacity: 0.62;
}

.dark .scrim {
  background: #000;
}

.dark .scrim.is-on {
  opacity: 0.62;
}

.status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--s4) 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-3);
}

.bars {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}

.bars i {
  width: 3px;
  height: 5px;
  background: var(--ink-3);
  border-radius: 1px;
}

.bars i:nth-child(2) {
  height: 7px;
}

.bars i:nth-child(3) {
  height: 9px;
}

.app-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--s5) var(--s4);
}

/* The brand sits at the top like a real app header; the sign-in block takes
 * the optical centre of what is left. */
.app-center {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  margin-block: auto;
  padding-bottom: 8%;
}

.app-brand {
  display: flex;
  gap: var(--s2);
  align-items: center;
}

.glyph {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: var(--field);
}

.app-h {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.app-sub {
  margin: var(--s2) 0 0;
  font-size: var(--t-tiny);
  line-height: 1.5;
  color: var(--ink-2);
}

.app-cta {
  position: relative;
  width: 100%;
  min-height: 40px;
  margin-top: var(--s6);
  padding-inline: var(--s4);
  border: 1px solid var(--ink);
  border-radius: var(--radius);
  background: var(--ink);
  color: var(--canvas);
  font-family: var(--font-sans);
  font-size: var(--t-tiny);
  font-weight: 550;
  cursor: pointer;
  transition: opacity 0.2s var(--ease);
}

.app-cta:disabled {
  cursor: default;
  opacity: 0.5;
}

/* The provider button, the shape every social sign-in has settled on: the
 * mark at the leading edge, a hairline holding it apart from the sentence, and
 * the label centred in what is left. It is the same button as the other lane —
 * same fill, same height, same radius — because the section's whole claim is
 * that only the content differs. */
.app-cta.has-mark {
  /* One cell of the icon, which stands nine cells tall. Mark.vue rounds this to
   * whole device pixels before drawing, so the height it ends up at is not a
   * figure this file can restate — which is why the rule beside it is stretched
   * to the mark rather than given a length of its own. */
  --u: 1.5px;

  /* Three columns with the outer two equal, which centres the middle one on the
   * button rather than on the space the mark leaves — a label centred in the
   * remainder sits visibly right of centre. The outer columns cannot shrink
   * past their content, so a label too wide to centre pushes the lockup instead
   * of running underneath it. */
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  column-gap: 10px;
  padding-inline: 12px;
}

/* The rule is stretched rather than given a height, so it is the mark's height
 * by construction — including after the device-pixel rounding, which no rule in
 * this file could predict. */
.cta-lockup {
  display: flex;
  align-items: stretch;
  justify-self: start;
  gap: 10px;
}

.cta-label {
  text-align: center;
}

/* The engine writes the four colour roles straight onto the cells, so the mark
 * is told what "ink" means inside a button that is filled with it. Accent goes
 * the same way: on a ground this small and this dark the states have to carry
 * themselves on level and geometry, which is what they were built to do — and
 * a violet flash on the button's own ink is not a colour anyone chose. */
.cta-mark {
  --ink: var(--canvas);
  --accent: var(--canvas);

  flex: none;
}

.cta-rule {
  flex: none;
  width: 1px;
  background: currentColor;
  /* Enough to hold its full length against the solid glyph beside it. Fainter
   * and the ends fade out, and a rule that is the mark's height stops reading
   * as one. */
  opacity: 0.45;
}

/* A quiet breathing edge, so it is obvious the phone is the control. It runs
 * until the reader presses the button, so it rides on a pseudo-element and
 * moves only opacity and transform — a box-shadow keyframe would repaint the
 * phone's layer sixty times a second for as long as the page is open. */
.app-cta::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 2px var(--accent-line);
  opacity: 0;
  pointer-events: none;
}

.app-cta.is-hinting::after {
  animation: hint 2.4s var(--ease) infinite;
}

@keyframes hint {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  70%,
  100% {
    opacity: 0;
    transform: scale(1.05);
  }
}

.app-terms {
  width: 100%;
  margin: var(--s3) 0 0;
  font-size: 10px;
  line-height: 1.5;
  text-align: center;
  color: var(--ink-3);
}

.app-session {
  display: flex;
  gap: var(--s2);
  align-items: center;
  width: 100%;
  min-height: 40px;
  margin: var(--s6) 0 0;
  padding-inline: var(--s3);
  border: 1px solid var(--rule-strong);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: var(--t-tiny);
  color: var(--ink);
}

.app-session-state {
  margin-left: auto;
  color: var(--ok);
}

.app-signout {
  margin-top: var(--s5);
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-2);
  font: inherit;
  font-size: var(--t-tiny);
  text-decoration: underline;
  text-underline-offset: 0.2em;
  cursor: pointer;
}

.app-signout:hover,
.app-signout:focus-visible {
  color: var(--ink);
}

/* --------------------------------------------------------- wallet sheet */

.sheet {
  position: absolute;
  z-index: 2;
  inset: auto 0 0;
  display: flex;
  flex-direction: column;
  padding: 10px var(--s4) var(--s4);
  border-top: 1px solid var(--rule);
  border-radius: 18px 18px 24px 24px;
  background: var(--sheet);
  box-shadow: var(--sheet-shadow);
  transform: translateY(101%);
  transition: transform 0.42s var(--ease-out);
}

.sheet.is-up {
  transform: translateY(0);
}

.grabber {
  width: 32px;
  height: 3px;
  margin: 0 auto var(--s4);
  border-radius: 2px;
  background: var(--rule-strong);
}

.sheet-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}

.sheet-origin {
  margin: 3px 0 0;
  font-family: var(--font-mono);
  font-size: var(--t-label);
  color: var(--ink-3);
}

.sheet-label {
  margin: var(--s4) 0 var(--s2);
}

.hex {
  margin: 0;
  padding: 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.7;
  color: var(--ink-2);
  overflow-wrap: anywhere;
}

.hex-meta {
  margin: var(--s2) 0 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-3);
}

.alert {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: var(--s4) 0 0;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--danger) 42%, transparent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--danger) 9%, transparent);
  font-size: 11px;
  line-height: 1.5;
  color: var(--ink-2);
}

.alert strong {
  font-weight: 600;
  color: var(--danger);
}

.statement {
  margin: var(--s4) 0 0;
  font-size: var(--t-tiny);
  line-height: 1.5;
  color: var(--ink-2);
}

.rows {
  margin: var(--s4) 0 0;
}

.rows > div {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: var(--s3);
  padding-block: 8px;
  border-top: 1px solid var(--rule);
  font-size: 11px;
}

.rows dt {
  color: var(--ink-3);
}

.rows dd {
  min-width: 0;
  margin: 0;
  font-family: var(--font-mono);
  color: var(--ink);
  overflow-wrap: anywhere;
}

.check {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: var(--ok);
}

.sheet-foot {
  margin: var(--s3) 0 0;
  font-size: 10px;
  line-height: 1.5;
  color: var(--ink-3);
}

.sheet-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s2);
  margin-top: var(--s4);
}

.sheet-actions > * {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding-inline: var(--s3);
  border: 1px solid var(--rule-strong);
  border-radius: var(--radius);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--ink-2);
  cursor: pointer;
}

.sheet-actions > *:disabled {
  cursor: default;
  opacity: 0.55;
}

.sheet-actions > *:not(.primary):hover:not(:disabled) {
  border-color: var(--ink);
  color: var(--ink);
}

.sheet-actions .primary {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--canvas);
  font-weight: 550;
}

/* -------------------------------------------------------------- narrow */

@media (max-width: 819px) {
  .lane-switch {
    display: flex;
  }

  .stage {
    grid-template-columns: minmax(0, 1fr);
  }

  .lane.is-hidden {
    display: none;
  }

  /* The switch sits directly above and now says the same thing. */
  .verdict {
    display: none;
  }

  /* Flat once there is only one phone — there is nothing left to lean into. */
  .lane-adhoc,
  .lane-siwe {
    --lean: 0deg;
    --pitch: 0deg;
    --lift: -4px;
  }
}

/* base.css already clamps every animation and transition under this query, so
 * the only thing left to say is that the resting tilt is a static transform
 * rather than motion — and a 3D object is not something to hand a vestibular
 * reader either. */
@media (prefers-reduced-motion: reduce) {
  .lane-adhoc,
  .lane-siwe {
    --lean: 0deg;
    --pitch: 0deg;
    --lift: 0px;
  }
}
</style>
