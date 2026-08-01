/**
 * Unit fixtures for `local/no-bare-outline-none` (WS-E).
 * Run via: node --test eslint-local-rules/no-bare-outline-none.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuleTester } from 'eslint';
import plugin from './no-bare-outline-none.js';

const rule = plugin.rules['no-bare-outline-none'];

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('local/no-bare-outline-none', () => {
  it('accepts ring / utility / glass companions and rejects bare / offset-only / ring-0', () => {
    assert.doesNotThrow(() => {
      tester.run('no-bare-outline-none', rule, {
        valid: [
          { code: '<button className="focus-visible:ring-2" />' },
          {
            code: '<button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent" />',
          },
          { code: '<button className="focus:outline-none focus-ring-aa" />' },
          { code: '<input className="glass-input focus:outline-none" />' },
          {
            code: '<button className={isOn ? "focus:outline-none focus-visible:ring-2" : "focus:outline-none focus-visible:ring-2"} />',
          },
          {
            code: '<button className={`focus:outline-none focus-visible:ring-2`} />',
          },
          {
            code: '<button className={clsx("focus:outline-none", "focus-visible:ring-2")} />',
          },
          {
            code: '<button className="focus:outline-none focus:ring-[3px]" />',
          },
          {
            code: '<button className={"focus:outline-none focus-visible:ring-2" || other} />',
          },
        ],
        invalid: [
          {
            code: '<button className="focus:outline-none" />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
          {
            code: '<button className="focus:outline-none focus:ring-offset-2" />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
          {
            code: '<button className="focus:outline-none focus:ring-inset" />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
          {
            code: '<button className="focus:outline-none focus:ring-0" />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
          {
            code: '<button className={on ? "focus:outline-none focus-visible:ring-2" : "focus:outline-none"} />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
          {
            code: '<button className={`focus:outline-none ${x}`} />',
            errors: [{ messageId: 'unresolvedOutlineNone' }],
          },
          {
            code: '<button className="focus:outline-none focus:ring-brand-accent" />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
          {
            code: '<button className="focus:outline-none focus:ring-[0px]" />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
          {
            code: '<button className={cond && "focus:outline-none"} />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
          {
            code: '<button className={clsx("focus:outline-none")} />',
            errors: [{ messageId: 'bareOutlineNone' }],
          },
        ],
      });
    });
  });
});
