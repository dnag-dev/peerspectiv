import { clerkSetup } from '@clerk/testing/playwright';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function globalSetup() {
  await clerkSetup();
}

export default globalSetup;
