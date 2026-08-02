/**
 * Ban `focus:outline-none` / `focus-visible:outline-none` in className strings
 * unless a visible focus indicator companion is present on the same attribute.
 *
 * Allowed companions (any one):
 * - `focus:ring-*` / `focus-visible:ring-*` that actually paint a ring
 *   (not `ring-0`, `ring-offset-*`, or `ring-inset` alone)
 * - `focus-ring-aa` (project utility in index.css)
 * - `glass-input` (component class provides `:focus` box-shadow via --focus-ring)
 *
 * Unknown / dynamic class expressions fail closed (report) when outline-none is
 * statically present without a statically known companion.
 */

const OUTLINE_NONE = /\bfocus(?:-visible)?:outline-none\b/;
/** Ring utilities that produce a visible ring width (not color-only / offset / inset / 0). */
const HAS_RING =
  /\bfocus(?:-visible)?:ring-(?:[1-9]\d*(?:\/\d+)?|\[[1-9][^\]]*\])/;
const HAS_UTILITY = /\bfocus-ring-aa\b/;
const HAS_GLASS = /\bglass-input\b/;

/** Sentinel: expression could not be fully resolved statically. */
const UNKNOWN = Symbol('unknown-class-text');

/**
 * @returns {string[] | typeof UNKNOWN}
 *   - string[]: one entry per mutually exclusive class variant (AND-joined static parts
 *     within a variant; separate variants for ternary branches)
 *   - UNKNOWN: dynamic / unresolvable expression
 */
function classVariantsFromNode(node) {
  if (!node) return UNKNOWN;
  if (node.type === 'Literal' && typeof node.value === 'string') return [node.value];
  if (node.type === 'TemplateLiteral') {
    const staticText = node.quasis.map((q) => q.value.cooked ?? '').join(' ');
    if (node.expressions.length === 0) return [staticText];
    // If the static quasis alone already pair outline-none with a valid companion,
    // accept — dynamic interpolations are typically color/layout variants.
    if (OUTLINE_NONE.test(staticText) && isAllowedVariant(staticText)) {
      return [staticText];
    }
    if (!OUTLINE_NONE.test(staticText)) {
      // outline-none only possible via interpolation — cannot verify statically
      return UNKNOWN;
    }
    return UNKNOWN;
  }
  if (node.type === 'JSXExpressionContainer') return classVariantsFromNode(node.expression);
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = classVariantsFromNode(node.left);
    const right = classVariantsFromNode(node.right);
    if (left === UNKNOWN || right === UNKNOWN) return UNKNOWN;
    const out = [];
    for (const l of left) for (const r of right) out.push(`${l} ${r}`);
    return out;
  }
  if (node.type === 'ConditionalExpression') {
    const cons = classVariantsFromNode(node.consequent);
    const alt = classVariantsFromNode(node.alternate);
    // Test branches independently — never OR-join them into one string.
    if (cons === UNKNOWN || alt === UNKNOWN) return UNKNOWN;
    return [...cons, ...alt];
  }
  if (node.type === 'LogicalExpression') {
    // `a && b` / `a || b` — resolve sides independently when possible.
    const left = classVariantsFromNode(node.left);
    const right = classVariantsFromNode(node.right);
    if (node.operator === '&&') {
      // falsy left may omit right; treat as variants: left-only OR left+right when both known
      if (left === UNKNOWN && right === UNKNOWN) return UNKNOWN;
      if (left === UNKNOWN) return right;
      if (right === UNKNOWN) return left;
      const both = [];
      for (const l of left) for (const r of right) both.push(`${l} ${r}`);
      return [...left, ...both];
    }
    // || and ?? : either side alone is a variant. Keep known sides even if the
    // other is dynamic — unknown alone is not treated as a safe companion.
    if (left === UNKNOWN && right === UNKNOWN) return UNKNOWN;
    if (left === UNKNOWN) return right;
    if (right === UNKNOWN) return left;
    return [...left, ...right];
  }
  if (node.type === 'CallExpression') {
    // clsx / cn / classNames(...) — concatenate only when every arg is static.
    const argVariants = [];
    for (const arg of node.arguments) {
      if (arg.type === 'ObjectExpression') return UNKNOWN;
      const v = classVariantsFromNode(arg);
      if (v === UNKNOWN) return UNKNOWN;
      argVariants.push(v);
    }
    if (argVariants.length === 0) return [''];
    // Cartesian product of arg variant lists
    let acc = [''];
    for (const variants of argVariants) {
      const next = [];
      for (const a of acc) for (const v of variants) next.push(`${a} ${v}`.trim());
      acc = next;
    }
    return acc;
  }
  return UNKNOWN;
}

function isAllowedVariant(classText) {
  if (!OUTLINE_NONE.test(classText)) return true;
  if (HAS_UTILITY.test(classText) || HAS_GLASS.test(classText)) return true;
  if (HAS_RING.test(classText)) return true;
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow focus:outline-none without a visible focus-ring companion (WS-E / WCAG 2.4.7)',
    },
    schema: [],
    messages: {
      bareOutlineNone:
        'focus:outline-none removes the visible focus indicator. Add focus-visible:ring-*, the focus-ring-aa utility, or glass-input.',
      unresolvedOutlineNone:
        'focus:outline-none appears with dynamic className expressions that cannot be verified. Use a static focus-ring-aa / focus-visible:ring-* companion.',
    },
  },
  create(context) {
    function checkAttr(node) {
      if (node.name?.name !== 'className') return;
    const checkAttr = (node) => {
      // Fast path: attribute text must mention outline-none somewhere
      const raw = context.sourceCode.getText(node.value);
      if (!raw.includes('outline-none')) return;

      const variants = classVariantsFromNode(node.value);
      if (variants === UNKNOWN) {
        // Only report if outline-none is literally in the source of this attribute.
        if (OUTLINE_NONE.test(raw.replace(/['"`]/g, ' '))) {
          context.report({ node, messageId: 'unresolvedOutlineNone' });
        }
        return;
      }
      for (const variant of variants) {
        if (!isAllowedVariant(variant)) {
          context.report({ node, messageId: 'bareOutlineNone' });
          return;
        }
      }
    };
    return {
      JSXAttribute: checkAttr,
    };
  },
};

export default {
  rules: {
    'no-bare-outline-none': rule,
  },
};
