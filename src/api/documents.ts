import { supabase, snakeToCamel } from '../lib/supabase';
import type { Database } from '../types/database';

type DocType = Database['public']['Enums']['document_type'];
type DocStatus = Database['public']['Enums']['document_status'];

// Bucket name for self-uploaded personnel compliance docs (KYC).
// Distinct from the read-only 'vault' bucket which is admin-write-only
// and serves the operator-side compliance vault. See migration 0009.
const PERSONNEL_DOCS_BUCKET = 'personnel-docs';

/**
 * Compliance Vault listing. RLS gates per-user — see document_select policy
 * in 0001_init.sql. Public-cert types (Release Certificate, Organisation
 * Cert, Release to Service, Import Clearance) are visible to all
 * authenticated users; personnel-linked docs only to the owner / admin.
 */
export async function listDocuments(opts: { type?: DocType; status?: DocStatus } = {}) {
  const { type, status } = opts;
  let q = supabase
    .from('document')
    .select('*')
    .order('issued', { ascending: false });

  if (type)   q = q.eq('type', type);
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return snakeToCamel(data);
}

/**
 * Get a time-limited download URL for a document stored in the `vault`
 * bucket. RLS on storage.objects also gates this — see vault_select policy.
 *
 * Returns { url, expiresIn } or null if the doc has no storage_path
 * (legacy seed rows have metadata but no actual file).
 */
export async function getDocumentDownloadUrl(documentId: string, opts: { expiresIn?: number } = {}) {
  const { expiresIn = 60 } = opts;
  const { data: doc, error: docErr } = await supabase
    .from('document')
    .select('storage_path, name')
    .eq('id', documentId)
    .single();
  if (docErr) throw docErr;
  if (!doc?.storage_path) return null;

  const { data, error } = await supabase
    .storage
    .from('vault')
    .createSignedUrl(doc.storage_path, expiresIn);
  if (error) throw error;
  return { url: data.signedUrl, expiresIn };
}

// ── P1 #5 — discipline-specific document upload ────────────────────
// Self-registered aviation pros upload Part 66 cert / medical / type
// rating / etc. into the private `personnel-docs` bucket (migration
// 0009). The document table row links the file to the personnel row
// via personnel_id; admins approve the personnel row in /admin/kyc.

/** Upload a single document file. Creates the storage object then
 *  inserts the matching document row. Atomicity is best-effort — if
 *  the insert fails after upload, the orphaned object is deleted.
 *
 *  @param file       — File from a <input type="file"> change event
 *  @param meta       — discipline / doc-type / display label / personnel id
 *  @returns          — the inserted document row (camelCased)
 */
export async function uploadPersonnelDoc({
  file,
  type,
  label,
  personnelId,
}: {
  file: File;
  type: DocType;
  label: string;
  personnelId: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not signed in.');

  // Path convention: {auth_user_id}/{timestamp}-{filename}. The first
  // segment must be the user's id — RLS on storage.objects gates by it.
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from(PERSONNEL_DOCS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) throw upload.error;

  const { data: row, error: insertErr } = await supabase
    .from('document')
    .insert({
      personnel_id: personnelId,
      name: label,
      ref_number: `KYC-${Date.now()}`,                   // placeholder until admin assigns
      type,
      issued: new Date().toISOString().slice(0, 10),
      expires: null,
      status: 'verified',                                // TODO P1 #5+: admin approves at the doc level
      cert: label,
      storage_path: path,
    })
    .select()
    .single();

  if (insertErr) {
    // Clean up the orphan object so we don't leak storage on retry.
    await supabase.storage.from(PERSONNEL_DOCS_BUCKET).remove([path]).catch(() => {});
    throw insertErr;
  }
  return snakeToCamel(row);
}

/** List all docs uploaded for the current user's personnel record.
 *  Returns [] if the user isn't linked to a personnel row yet. */
export async function listMyPersonnelDocs() {
  const { data: ppl } = await supabase
    .from('personnel')
    .select('id')
    .maybeSingle();
  if (!ppl?.id) return [];

  const { data, error } = await supabase
    .from('document')
    .select('*')
    .eq('personnel_id', ppl.id)
    .order('issued', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data);
}

/** Admin: list a specific personnel row's uploaded docs. RLS lets
 *  admins read all document rows; this is a thin wrapper. */
export async function listPersonnelDocs(personnelId: string) {
  const { data, error } = await supabase
    .from('document')
    .select('*')
    .eq('personnel_id', personnelId)
    .order('issued', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data);
}

/** Generate a short-lived signed URL for a doc in the personnel-docs
 *  bucket. Returns null if the row has no storage_path (e.g. legacy
 *  metadata-only entries). */
export async function getPersonnelDocUrl(documentId: string, opts: { expiresIn?: number } = {}) {
  const { expiresIn = 60 } = opts;
  const { data: doc, error: docErr } = await supabase
    .from('document')
    .select('storage_path, name')
    .eq('id', documentId)
    .single();
  if (docErr) throw docErr;
  if (!doc?.storage_path) return null;

  const { data, error } = await supabase
    .storage
    .from(PERSONNEL_DOCS_BUCKET)
    .createSignedUrl(doc.storage_path, expiresIn);
  if (error) throw error;
  return { url: data.signedUrl, expiresIn, name: doc.name };
}
