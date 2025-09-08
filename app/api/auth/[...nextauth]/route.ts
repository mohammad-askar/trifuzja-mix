//E:\trifuzja-mix\app\api\auth\[...nextauth]\route.ts
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/types/mongodb';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const credsSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

/* ---------- الإعدادات ---------- */
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCreds) {
        /* 1) تحقّق Zod من صحة الحقول */
        const creds = credsSchema.safeParse(rawCreds);
        if (!creds.success) {
          throw new Error('البيانات غير صالحة');
        }

        const client = await clientPromise;
        const users  = client.db('trifuzja').collection('admin');

        /* 2) بحث غير حساس للحروف */
        const user = await users.findOne({
          email: creds.data.email.toLowerCase(),
        });

        if (!user) throw new Error('المستخدم غير موجود');

        const valid = await bcrypt.compare(
          creds.data.password,
          user.password,
        );

        if (!valid) throw new Error('كلمة المرور غير صحيحة');

        /* 3) يعيد كائن user بدون كلمة المرور */
        return {
          id:    user._id.toString(),
          email: user.email,
          name:  user.name ?? null,
          role:  'admin',
        };
      },
    }),
  ],

  /* JWT بدلاً من تخزين الجلسة في القاعدة */
  session: { strategy: 'jwt' },

  /* إضافة بيانات إضافية لـ JWT ثم للجلسة */
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id   = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
