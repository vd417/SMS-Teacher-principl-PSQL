import type { ApprovalsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toApprovalRequest, approvalRequestSchema } from './mappers';

export function httpApprovals(http: HttpClient): ApprovalsRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/approvals')
        .then((d) => d.map((x) => toApprovalRequest(approvalRequestSchema.parse(x)))),

    decide: (id, decision, note) =>
      http
        .patch(`/approvals/${id}`, { status: decision, decided_note: note })
        .then((x) => toApprovalRequest(approvalRequestSchema.parse(x))),
  };
}
