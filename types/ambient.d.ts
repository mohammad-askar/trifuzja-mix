// types/ambient.d.ts
import type { MongoClient } from 'mongodb';
import type { DefaultSession, DefaultUser } from 'next-auth';
import 'next-auth';       // لضمان تحميل الوحدات قبل الـ augmentation
import 'next-auth/jwt';

/* -------------------------------------------------------
 * 1) توسيع الـ globalThis
 * ----------------------------------------------------- */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/* -------------------------------------------------------
 * 2) Augmentation: next-auth
 * نضيف الحقول id و role على Session.user و User و JWT
 * ----------------------------------------------------- */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}
