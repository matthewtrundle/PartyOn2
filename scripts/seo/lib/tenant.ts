/**
 * Tenant config loader.
 *
 * Reads tenants/party-on-delivery.json (mirrors the scrape-semrush-pod
 * slash command convention). If the file doesn't exist yet, returns
 * sensible defaults so the workflow can run on its first invocation.
 *
 * The `semrushProjectId` is filled in dynamically by the orchestrator
 * the first time it discovers the project, then persisted back to the
 * JSON file so subsequent runs skip the projects-list navigation step.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { TenantConfig } from './types';

const TENANT_FILE = path.join(process.cwd(), 'tenants', 'party-on-delivery.json');

export function loadTenant(): TenantConfig {
  if (!existsSync(TENANT_FILE)) {
    return {
      domain: 'partyondelivery.com',
      competitors: ['drizly.com', 'gopuff.com', 'saucey.com'],
    };
  }
  const raw = readFileSync(TENANT_FILE, 'utf8');
  try {
    return JSON.parse(raw) as TenantConfig;
  } catch (err) {
    throw new Error(`tenants/party-on-delivery.json is invalid JSON: ${(err as Error).message}`);
  }
}

export function persistTenant(t: TenantConfig): void {
  mkdirSync(path.dirname(TENANT_FILE), { recursive: true });
  writeFileSync(
    TENANT_FILE,
    JSON.stringify(
      { ...t, lastScrape: new Date().toISOString().slice(0, 10) },
      null,
      2,
    ),
  );
}
