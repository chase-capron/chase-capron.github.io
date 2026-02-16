#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const issues = [];

const addIssue = (message) => issues.push(message);

const readUtf8 = (filePath) => readFileSync(filePath, 'utf8');

const walkHtml = (startDir, output = []) => {
  const entries = readdirSync(startDir);
  for (const entry of entries) {
    const full = path.join(startDir, entry);
    const rel = path.relative(repoRoot, full);

    if (rel.startsWith('.git') || rel.startsWith('assets')) continue;

    const info = statSync(full);
    if (info.isDirectory()) {
      walkHtml(full, output);
      continue;
    }

    if (entry.endsWith('.html')) output.push(full);
  }
  return output;
};

const checkMetaPolicies = () => {
  const indexPath = path.join(repoRoot, 'index.html');
  const html = readUtf8(indexPath);

  const required = [
    'http-equiv="Content-Security-Policy"',
    'http-equiv="Permissions-Policy"',
    'name="referrer" content="strict-origin-when-cross-origin"',
  ];

  required.forEach((snippet) => {
    if (!html.includes(snippet)) {
      addIssue(`index.html missing required security meta: ${snippet}`);
    }
  });
};

const checkExternalLinkRel = () => {
  const htmlFiles = walkHtml(repoRoot);
  const targetBlankRegex = /<a\s+[^>]*target="_blank"[^>]*>/gi;

  for (const filePath of htmlFiles) {
    const relPath = path.relative(repoRoot, filePath);
    const html = readUtf8(filePath);
    const matches = html.match(targetBlankRegex) || [];

    matches.forEach((tag) => {
      const hasNoopener = /rel="[^"]*noopener[^"]*"/i.test(tag);
      const hasNoreferrer = /rel="[^"]*noreferrer[^"]*"/i.test(tag);
      if (!hasNoopener || !hasNoreferrer) {
        addIssue(`${relPath} has target="_blank" link without rel="noopener noreferrer": ${tag}`);
      }
    });
  }
};

const checkThemesManifest = () => {
  const themesPath = path.join(repoRoot, 'themes', 'themes.json');
  const payload = JSON.parse(readUtf8(themesPath));
  const themes = Array.isArray(payload?.themes) ? payload.themes : [];

  if (!themes.length) {
    addIssue('themes/themes.json has no themes array entries');
    return;
  }

  const idRegex = /^[a-z0-9-]+$/;
  const cssRegex = /^themes\/[a-z0-9/_-]+\.css$/;
  const accentRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

  const ids = new Set();

  themes.forEach((theme, idx) => {
    const row = `themes/themes.json theme[${idx}]`;
    if (!idRegex.test(String(theme?.id || ''))) addIssue(`${row} invalid id`);
    if (!String(theme?.label || '').trim()) addIssue(`${row} missing label`);
    if (!cssRegex.test(String(theme?.css || ''))) addIssue(`${row} invalid css path`);
    if (String(theme?.css || '').includes('..')) addIssue(`${row} css path cannot contain '..'`);

    if (theme?.accent && !accentRegex.test(String(theme.accent))) {
      addIssue(`${row} accent must be hex color`);
    }

    if (Array.isArray(theme?.tags)) {
      if (theme.tags.length > 3) addIssue(`${row} tags supports up to 3 items`);
      theme.tags.forEach((tag, tagIndex) => {
        const trimmed = String(tag || '').trim();
        if (!trimmed) addIssue(`${row} tags[${tagIndex}] cannot be empty`);
        if (trimmed.length > 24) addIssue(`${row} tags[${tagIndex}] exceeds 24 characters`);
      });
    }

    const id = String(theme?.id || '');
    if (ids.has(id)) addIssue(`${row} duplicate id '${id}'`);
    ids.add(id);
  });

  if (payload?.defaultTheme && !ids.has(payload.defaultTheme)) {
    addIssue('themes/themes.json defaultTheme must reference a known id');
  }
};

const checkProjectsManifest = () => {
  const projectsPath = path.join(repoRoot, 'projects', 'projects.json');
  const payload = JSON.parse(readUtf8(projectsPath));
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(String(payload?.generatedAt || ''))) {
    addIssue('projects/projects.json generatedAt must be ISO UTC timestamp (YYYY-MM-DDTHH:mm:ssZ)');
  }

  const pathRegex = /^\/projects\/[a-z0-9-]+\/$/;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  projects.forEach((project, idx) => {
    const row = `projects/projects.json project[${idx}]`;
    if (!pathRegex.test(String(project?.path || ''))) addIssue(`${row} invalid path`);
    if (!dateRegex.test(String(project?.updated || ''))) addIssue(`${row} invalid updated date`);
    if (String(project?.note || '').length > 140) addIssue(`${row} note should stay <= 140 chars`);
  });
};

try {
  checkMetaPolicies();
  checkExternalLinkRel();
  checkThemesManifest();
  checkProjectsManifest();

  if (issues.length) {
    console.error('❌ Site hygiene check failed:');
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exitCode = 1;
  } else {
    console.log('✅ Site hygiene check passed.');
  }
} catch (error) {
  console.error('❌ Site hygiene check crashed:', error?.message || error);
  process.exitCode = 1;
}
