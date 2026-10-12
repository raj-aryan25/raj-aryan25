import { mkdir, writeFile } from 'node:fs/promises';

const username = 'raj-aryan25';
async function get(path) {
  const response = await fetch('https://api.github.com' + path, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'profile-stats' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('GitHub API returned ' + response.status + ' for ' + path);
  return response.json();
}

export function renderStats(profile, repos, date = new Date().toISOString().slice(0, 10)) {
  const original = repos.filter(repo => !repo.fork);
  const stars = original.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const languages = new Map();
  for (const repo of original) {
    if (repo.language) languages.set(repo.language, (languages.get(repo.language) || 0) + 1);
  }
  const top = [...languages].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
  const metrics = [[profile.public_repos, 'Public repositories'], [stars, 'Stars earned'], [profile.followers, 'Followers'], [profile.public_gists, 'Public gists']];
  const numbers = metrics.map(([value, label], i) => {
    const x = 34 + i * 222;
    return '<text x="' + x + '" y="111" fill="#f1f5f9" font-size="34" font-weight="700">' + escape(value) + '</text><text x="' + x + '" y="140" fill="#94a3b8" font-size="14">' + label + '</text>';
  }).join('');
  const languageText = top.length ? top.map(([name, count]) => name + ' (' + count + ')').join(' · ') : 'No primary languages reported yet';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="246" viewBox="0 0 960 246" role="img" aria-labelledby="title desc">' +
    '<title id="title">Raj Aryan — public GitHub stats</title><desc id="desc">' + escape(metrics.map(([n, label]) => n + ' ' + label).join(', ') + '. Primary languages by repository: ' + languageText + '. Updated ' + date + '.') + '</desc>' +
    '<rect x="1" y="1" width="958" height="244" rx="16" fill="#0b1220" stroke="#26364d"/>' +
    '<g font-family="Segoe UI, Arial, sans-serif"><text x="34" y="43" fill="#5eead4" font-size="17" font-weight="600">GitHub at a glance</text><text x="926" y="43" text-anchor="end" fill="#94a3b8" font-size="12">Updated ' + escape(date) + ' UTC</text>' + numbers +
    '<path d="M34 165H926" stroke="#26364d"/><text x="34" y="193" fill="#94a3b8" font-size="12">PRIMARY LANGUAGES · ORIGINAL PUBLIC REPOSITORIES</text><text x="34" y="222" fill="#cbd5e1" font-size="15">' + escape(languageText) + '</text></g></svg>\n';
}

const profile = await get('/users/' + username);
const repos = [];
for (let page = 1; ; page++) {
  const batch = await get('/users/' + username + '/repos?per_page=100&type=owner&page=' + page);
  repos.push(...batch);
  if (batch.length < 100) break;
}
// Fetch all pages before replacing the last successful snapshot.
const directory = new URL('../assets/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('github-stats.svg', directory), renderStats(profile, repos));
console.log('Updated public GitHub stats for ' + username);
