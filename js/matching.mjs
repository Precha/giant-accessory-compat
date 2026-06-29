export function getModelRoot(name) {
  return name.trim().split(/\s+/)[0].toLowerCase();
}

function linesOf(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function findKickstandMatches(modelName, kickstands) {
  const root = getModelRoot(modelName);
  const matches = [];
  for (const kickstand of kickstands) {
    const hits = [];
    for (const line of linesOf(kickstand.compatibleBikesText)) {
      if (getModelRoot(line) === root) hits.push({ line, type: 'bike' });
    }
    for (const line of linesOf(kickstand.compatibleEbikesText)) {
      if (getModelRoot(line) === root) hits.push({ line, type: 'ebike' });
    }
    if (hits.length > 0) matches.push({ kickstand, hits });
  }
  return matches;
}
