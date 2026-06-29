import test from 'node:test';
import assert from 'node:assert/strict';
import { getModelRoot, findKickstandMatches } from './matching.mjs';

test('getModelRoot takes the first word and lowercases it', () => {
  assert.equal(getModelRoot('Talon 27.5'), 'talon');
  assert.equal(getModelRoot('Talon 29er'), 'talon');
  assert.equal(getModelRoot('FastRoad AR Advanced'), 'fastroad');
  assert.equal(getModelRoot('Revolt X Advanced Pro'), 'revolt');
});

test('findKickstandMatches finds bike and e-bike hits sharing a root word', () => {
  const kickstands = [
    {
      sku: 'A',
      compatibleBikesText: 'Roam MY21+\nTalon MY24+\n',
      compatibleEbikesText: 'Talon E+ MY21/ MY23\nVida E+\n',
    },
  ];
  const matches = findKickstandMatches('Talon 27.5', kickstands);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].hits.length, 2);
  assert.deepEqual(
    matches[0].hits.map((h) => h.type).sort(),
    ['bike', 'ebike']
  );
});

test('findKickstandMatches skips kickstands with no matching root word', () => {
  const kickstands = [{ sku: 'A', compatibleBikesText: 'Roam MY21+', compatibleEbikesText: '' }];
  assert.deepEqual(findKickstandMatches('Defy Advanced', kickstands), []);
});

test('findKickstandMatches ignores blank lines in the text blocks', () => {
  const kickstands = [{ sku: 'A', compatibleBikesText: 'Roam MY21+\n\n\n', compatibleEbikesText: '' }];
  const matches = findKickstandMatches('Roam', kickstands);
  assert.equal(matches[0].hits.length, 1);
});
