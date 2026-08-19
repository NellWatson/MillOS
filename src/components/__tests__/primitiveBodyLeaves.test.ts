/**
 * A `*PrimitiveBody` must contain geometry and nothing else.
 *
 * Every generated asset renders as `<GeneratedBody fallback={<XPrimitiveBody/>}>`
 * or `<CreatureBody fallback={...}>`, so the primitive body only mounts when the
 * GLB is missing. Anything ELSE written inside it therefore disappears from the
 * shipping scene the moment the asset lands - silently, because no gate in this
 * repo watches for it. `validate:assets` checks that the file is well formed,
 * the bundle validator checks that it ships, and neither can tell that nothing
 * draws it.
 *
 * That is not hypothetical. Four props were lost this way in the 30-asset swap:
 *
 *   - `<Crow>` inside `ScarecrowPrimitiveBody`. `public/models/farm/crow.glb`
 *     was normalized, declared, validated, bundled and never drawn a frame.
 *   - `<Horse>` inside `ForgePrimitiveBody` - a whole animal gone from the
 *     village.
 *   - `<ChimneySmoke>` inside `PubPrimitiveBody` and `ForgePrimitiveBody`.
 *   - `<TownHallClock>` inside `TownHallPrimitiveBody`, which also rang the
 *     hourly chime, so the swap turned off an AUDIO feature.
 *
 * The fix in each case was to hoist the prop to the wrapper component so it
 * renders on both paths, which is what `Cottage` already did with its
 * `ChimneySmoke`. This test is the guard: a primitive body may use lowercase
 * intrinsics (`mesh`, `group`, `primitive`, ...) and the small set of
 * geometry-only helpers below, and nothing else.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const COMPONENT_ROOT = path.resolve(__dirname, '..');

/**
 * Capitalised tags that are geometry or text and carry no behaviour of their
 * own, so nesting them inside a fallback body loses nothing when the generated
 * body renders instead.
 */
const LEAF_TAGS = new Set([
  'Text', // drei text, drawn as geometry
  'Instances',
  'Instance',
  'InstancedAnimalParts', // an InstancedMesh of fluff/spots; geometry, nothing else
  'React', // <React.Fragment>
  'Fragment',
  'Suspense',
  'Billboard',
  'Line',
  'Edges',
  'Outlines',
  'Center',
  'Float',
]);

/**
 * Deliberate exceptions, each with the reason it is one.
 *
 * Keyed `PrimitiveBody::Tag`. An exception has to be written down here rather
 * than waved through, because "this one is fine" is exactly the reasoning that
 * lost a crow, a horse, two chimney plumes and an hourly bell.
 */
/**
 * Refs threaded INTO a primitive body, keyed `Component::propName`.
 *
 * The same defect in a different syntax. A `ref` passed to a `*PrimitiveBody`
 * is null for the whole of the shipping scene - the fallback never mounts once
 * the GLB lands - so whatever the scene drives through it drives nothing, and
 * the code reads exactly like a working animation. That is how the windmill's
 * sails and the pig's tail came to be listed as live losses while every gate in
 * the repo stayed green.
 *
 * Each entry has to say why the animation still reaches the generated body, or
 * why it cannot.
 */
const ALLOWED_FALLBACK_REFS: Record<string, string> = {
  'ChickenPrimitiveBody::animRef':
    'primitive-only peck pose; the generated bird is driven through chickenRigRefs',
  'CowPrimitiveBody::headRef':
    'primitive-only head group; the generated cow is driven through cowRigRefs',
  'PigPrimitiveBody::tailRef':
    'the generated pig rig stops at Head and has no tail joint, so the wag has no ' +
    'counterpart to drive. Rooting and stride reach the generated body through pigRigRefs.',
  'WindmillPrimitiveBody::bladesRef':
    'the generated mill has no blade group to spin - it is one welded shell - so its ' +
    'sails turn in the vertex shader instead; see GeneratedWindmill.tsx',
};

const ALLOWED: Record<string, string> = {
  // The generated town hall carries its own clock face baked into its albedo,
  // so re-rendering a primitive face over it would double up. Only the moving
  // hands are lost by the swap, and that is a recorded cost. The part that is
  // NOT body-specific - the hourly chime - was split into `TownHallChime` and
  // hoisted to `TownHall`, which is why this entry is safe to keep.
  'TownHallPrimitiveBody::TownHallClock':
    'clock face and hands are body-specific; the chime is hoisted as TownHallChime',
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(full);
    }
    return entry.endsWith('.tsx') ? [full] : [];
  });
}

/**
 * Spans of every `const X...PrimitiveBody = ...` declaration, ending at its
 * `displayName` assignment - the convention every one of them follows.
 */
function primitiveBodySpans(source: string): { name: string; body: string }[] {
  const lines = source.split('\n');
  const spans: { name: string; body: string }[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const opened = /^const ([A-Za-z0-9_]*PrimitiveBody)\s*[=:]/.exec(lines[i]);
    if (!opened) continue;
    const name = opened[1];
    const end = lines.findIndex(
      (line, index) => index > i && line.startsWith(`${name}.displayName`)
    );
    if (end < 0) continue;
    spans.push({ name, body: lines.slice(i, end).join('\n') });
  }
  return spans;
}

describe('primitive fallback bodies contain geometry only', () => {
  const files = sourceFiles(COMPONENT_ROOT);

  it('finds the primitive bodies it is meant to be guarding', () => {
    const total = files.reduce(
      (sum, file) => sum + primitiveBodySpans(readFileSync(file, 'utf8')).length,
      0
    );
    // A rename or a refactor that made this test match nothing would otherwise
    // pass silently and guard nothing at all.
    expect(total).toBeGreaterThanOrEqual(15);
  });

  it('never nests a behavioural component inside one', () => {
    const offenders: string[] = [];

    for (const file of files) {
      for (const { name, body } of primitiveBodySpans(readFileSync(file, 'utf8'))) {
        for (const match of body.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)) {
          const tag = match[1];
          if (LEAF_TAGS.has(tag)) continue;
          // A body may nest another primitive body: both vanish together on the
          // generated path, which is the intended behaviour.
          if (tag.endsWith('PrimitiveBody')) continue;
          if (`${name}::${tag}` in ALLOWED) continue;
          offenders.push(
            `${path.relative(COMPONENT_ROOT, file)}: <${tag}> inside ${name}. ` +
              'Hoist it to the wrapper component so it renders on the generated path too.'
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('never threads a ref into one without recording why', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      // Every `<XPrimitiveBody ... />` USE SITE, wherever it appears - the
      // props are written where the body is rendered, not where it is
      // declared, so this cannot reuse `primitiveBodySpans`.
      for (const match of source.matchAll(/<([A-Za-z0-9_]*PrimitiveBody)\b([^>]*)\/?>/g)) {
        const [, name, attributes] = match;
        for (const prop of attributes.matchAll(/\b([A-Za-z0-9_]*[Rr]ef)\s*=\s*\{/g)) {
          const key = `${name}::${prop[1]}`;
          if (key in ALLOWED_FALLBACK_REFS) continue;
          offenders.push(
            `${path.relative(COMPONENT_ROOT, file)}: ${prop[1]} passed to <${name}>. ` +
              'It is null whenever the generated body renders, so whatever drives it drives ' +
              'nothing. Drive the generated body instead, or record the reason in ' +
              'ALLOWED_FALLBACK_REFS.'
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('finds the fallback refs it is meant to be guarding', () => {
    // Same reason as the count above: a refactor that renamed the convention
    // would leave this guarding nothing while still passing.
    const found = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<([A-Za-z0-9_]*PrimitiveBody)\b([^>]*)\/?>/g)) {
        for (const prop of match[2].matchAll(/\b([A-Za-z0-9_]*[Rr]ef)\s*=\s*\{/g)) {
          found.add(`${match[1]}::${prop[1]}`);
        }
      }
    }
    expect([...found].sort()).toEqual(Object.keys(ALLOWED_FALLBACK_REFS).sort());
  });
});
