import { redirect } from 'next/navigation';

export default function AdminAdminPage() {
  redirect('/en/admin/dashboard');  // قم بتعديل 'en' حسب اللغة اللي تستخدمها
}