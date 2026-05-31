import type { LibraryRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toLibraryBook, type LibraryBookDTO } from './mappers';

export function httpLibrary(http: HttpClient): LibraryRepository {
  return {
    list: () => http.get<LibraryBookDTO[]>('/library').then((d) => d.map(toLibraryBook)),
  };
}
