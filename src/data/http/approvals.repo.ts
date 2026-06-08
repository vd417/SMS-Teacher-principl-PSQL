import type { ApprovalsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toApprovalRequest, type ApprovalRequestDTO } from './mappers';

export function httpApprovals(http: HttpClient): ApprovalsRepository {
  return {
    list: () => http.get<ApprovalRequestDTO[]>('/approvals').then((d) => d.map(toApprovalRequest)),

    decide: (id, decision, note) =>
      http
        .patch<ApprovalRequestDTO>(`/approvals/${id}`, { status: decision, decided_note: note })
        .then(toApprovalRequest),
  };
}
