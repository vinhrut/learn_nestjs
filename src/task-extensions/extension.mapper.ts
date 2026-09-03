import { Prisma } from '@prisma/client';

const personSelect = {
  id: true,
  username: true,
  email: true,
  full_name: true,
  avatar_url: true,
};

export const extensionRequestArgs =
  Prisma.validator<Prisma.task_extension_requestsDefaultArgs>()({
    include: {
      users_task_extension_requests_requester_idTousers: {
        select: personSelect,
      },
      users_task_extension_requests_reviewed_byTousers: {
        select: personSelect,
      },
    },
  });

type ExtensionRequestRow = Prisma.task_extension_requestsGetPayload<
  typeof extensionRequestArgs
>;

export function toExtensionCard(row: ExtensionRequestRow) {
  return {
    id: row.id,
    task_id: row.task_id,
    current_due_date: row.current_due_date,
    requested_due_date: row.requested_due_date,
    reason: row.reason,
    status: row.status,
    requested_at: row.requested_at,
    reviewed_at: row.reviewed_at,
    reject_reason: row.reject_reason,
    requester: row.users_task_extension_requests_requester_idTousers,
    reviewer: row.users_task_extension_requests_reviewed_byTousers,
  };
}

export const pendingExtensionInclude = Prisma.validator<Prisma.tasksInclude>()({
  task_extension_requests: {
    ...extensionRequestArgs,
    where: { status: 'PENDING' },
    orderBy: { created_at: 'desc' },
    take: 1,
  },
});

export function pendingExtensionOf(rows: ExtensionRequestRow[] | undefined) {
  const pending = rows?.[0];
  return pending ? toExtensionCard(pending) : null;
}
