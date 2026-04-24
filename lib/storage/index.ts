import { put, del } from '@vercel/blob';

export async function uploadChart(file: File | Buffer, caseId: string, filename: string): Promise<string> {
  const pathname = `charts/${caseId}/${Date.now()}-${filename}`;
  const blob = await put(pathname, file, {
    access: 'public', // Vercel Blob URLs are unguessable and time-limited
    contentType: 'application/pdf',
  });
  return blob.url;
}

export async function uploadFormTemplate(file: File | Buffer, companyId: string, filename: string): Promise<string> {
  const pathname = `form-templates/${companyId}/${Date.now()}-${filename}`;
  const blob = await put(pathname, file, {
    access: 'public',
    contentType: 'application/pdf',
  });
  return blob.url;
}

export async function getSignedChartUrl(path: string): Promise<string> {
  // Vercel Blob URLs are already signed/accessible
  return path;
}

export async function deleteChart(url: string): Promise<void> {
  await del(url);
}
