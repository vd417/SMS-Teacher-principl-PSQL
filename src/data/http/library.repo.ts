import type { LibraryRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toLibraryBook, libraryBookSchema } from './mappers';

export function httpLibrary(http: HttpClient): LibraryRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/library')
        .then((d) => d.map((x) => toLibraryBook(libraryBookSchema.parse(x)))),
  };
}
