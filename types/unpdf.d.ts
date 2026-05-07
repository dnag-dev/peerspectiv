declare module 'unpdf' {
  export function extractText(data: Uint8Array): Promise<{ text: string[] | string; totalPages?: number }>;
}
