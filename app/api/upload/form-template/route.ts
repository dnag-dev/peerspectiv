import { NextRequest, NextResponse } from 'next/server';
import { uploadFormTemplate } from '@/lib/storage';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// POST /api/upload/form-template
// multipart form: file, company_id
// Returns: { url, name }
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const companyId = formData.get('company_id') as string | null;

    if (!file || !companyId) {
      return NextResponse.json(
        { error: 'file and company_id are required' },
        { status: 400 }
      );
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are accepted' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 20MB limit' },
        { status: 400 }
      );
    }

    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFormTemplate(buffer, companyId, sanitized);

    return NextResponse.json({ url, name: file.name }, { status: 201 });
  } catch (err) {
    console.error('[api/upload/form-template]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
