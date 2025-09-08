//E:\trifuzja-mix\types\tiptap-image.d.ts
import '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /** Insert or replace an image */
      setImage: (options: { src: string; alt?: string }) => ReturnType;
    };
  }
}
