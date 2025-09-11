// 📁 app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions'; // ← استورد من lib (نقلناه هناك)

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
