import { supabase, snakeToCamel } from '../lib/supabase';

/**
 * Compliance Vault listing. RLS gates per-user — see document_select policy
 * in 0001_init.sql. Public-cert types (Release Certificate, Organisation
 * Cert, Release to Service, Import Clearance) are visible to all
 * authenticated users; personnel-linked docs only to the owner / admin.
 */
export async function listDocuments({ type, status } = {}) {
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
export async function getDocumentDownloadUrl(documentId, { expiresIn = 60 } = {}) {
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
