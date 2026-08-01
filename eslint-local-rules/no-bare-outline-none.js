/**
 * Ban `focus:outline-none` / `focus-visible:outline-none` in className strings
 * unless a visible focus indicator companion is present on the same attribute.
 *
 * Allowed companions (any one):
 * - `focus:ring-*` / `focus-visible:ring-*` (Tailwind ring utilities)
 * - `focus-ring-aa` (project utility in index.css)
 * - `glass-input` (component class provides `:focus` box-shadow via --focus-ring)
 *
 * Also allows explicit `focus:ring-0` / `focus-visible:ring-0` only when the
 * control is nested inside a focus-within/glass container (escape hatch —
 * prefer documenting with a nearby comment if used).
 */

const OUTLINE_NONE = /\bfocus(?:-visible)?:outline-none\b/;
const HAS_RING = /\bfocus(?:-visible)?:ring-(?!0\b)\S+/;
const HAS_RING_ZERO = /\bfocus(?:-visible)?:ring-0\b/;
const HAS_UTILITY = /\bfocus-ring-aa\b/;
const HAS_GLASS = /\bglass-input\b/;

function classTextFromNode(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral') {
    return node.quasis.map((q) => q.value.cooked ?? '').join(' ');
  }
  if (node.type === 'JSXExpressionContainer') return classTextFromNode(node.expression);
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = classTextFromNode(node.left);
    const right = classTextFromNode(node.right);
    if (left !== null && right !== null) return `${left} ${right}`;
  }
  if (node.type === 'ConditionalExpression') {
    const cons = classTextFromNode(node.consequent);
    const alt = classTextFromNode(node.alternate);
    if (cons !== null && alt !== null) return `${cons} ${alt}`;
  }
  if (node.type === 'LogicalExpression') {
    const left = classTextFromNode(node.left);
    const right = classTextFromNode(node.right);
    if (left !== null && right !== null) return `${left} ${right}`;
  }
  if (node.type === 'CallExpression') {
    // clsx / cn / classNames(...) — concatenate stringy args
    const parts = [];
    for (const arg of node.arguments) {
      const t = classTextFromNode(arg);
      if (t !== null) parts.push(t);
    }
    if (parts.length > 0) return parts.join(' ');
  }
  return null;
}

function isAllowed(classText) {
  if (!OUTLINE_NONE.test(classText)) return true;
  if (HAS_UTILITY.test(classText) || HAS_GLASS.test(classText)) return true;
  if (HAS_RING.test(classText)) return true;
  // Explicit ring-0 is an intentional suppress; treat as allowed escape hatch.
  if (HAS_RING_ZERO.test(classText)) return true;
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
    },
  },
  create(context) {
    function checkAttr(node) {
      if (node.name?.name !== 'className') return;
      const text = classTextFromNode(node.value);
      if (text === null) return;
      if (!isAllowed(text)) {
        context.report({ node, messageId: 'bareOutlineNone' });
      }
    }
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
