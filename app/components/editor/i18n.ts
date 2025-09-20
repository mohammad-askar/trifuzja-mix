export const T = {
  en: {
    title: 'Title', excerpt: 'Summary', slug: 'Slug', cat: 'Category', cover: 'Cover',
    save: 'Save', create: 'Create',
    imgDrag: 'Click or drag', imgDrop: 'Drop here',
    words: 'words', unsaved: 'Unsaved',
    uploadOk: 'Image uploaded', loading: 'Loading…', saving: 'Saving…',
    savedAt: (t: string) => `Saved ${t}`, slugOk: '✓ slug available', slugInUse: 'Slug in use',
    readTime: 'min read', pressToSave: 'Press Ctrl/Cmd + S to save',
    videoOnly: 'Video only (no text content)',
    videoOnlyHint: 'This article will appear under the Videos section and hide the text editor.',
    videoUrlLabel: 'Video URL',
  },
  pl: {
    title: 'Tytuł', excerpt: 'Opis', slug: 'Slug', cat: 'Kategoria', cover: 'Grafika',
    save: 'Zapisz', create: 'Utwórz',
    imgDrag: 'Kliknij lub przeciągnij', imgDrop: 'Upuść tutaj',
    words: 'słów', unsaved: 'Niezapisane',
    uploadOk: 'Załadowano obraz', loading: 'Ładowanie…', saving: 'Zapisywanie…',
    savedAt: (t: string) => `Zapisano o ${t}`, slugOk: '✓ slug dostępny', slugInUse: 'Slug zajęty',
    readTime: 'min czytania', pressToSave: 'Wciśnij Ctrl/Cmd + S aby zapisać',
    videoOnly: 'Tylko wideo (bez treści)',
    videoOnlyHint: 'Artykuł trafi do sekcji Wideo i ukryje edytor tekstu.',
    videoUrlLabel: 'Link do wideo',
  },
} as const;
export type TT = typeof T;
