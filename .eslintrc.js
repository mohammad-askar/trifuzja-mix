/** @type {import('eslint').Linter.Config} */
module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['import'],                    // ← أضف plugin-import إن لم يكن
  extends: [
    'next',
    'next/core-web-vitals',
    'eslint:recommended',
  ],
  settings: {
    'import/resolver': {
      // يستخدم إعدادات tsconfig تلقائياً
      typescript: {
        project: './tsconfig.json',       // يضمن قراءة alias من هذا الملف
      },
    },
  },
  rules: {
    /* ضع قواعدك المخصّصة هنا */
  },
};
