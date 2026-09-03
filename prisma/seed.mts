import { PrismaClient, role_code, task_priority } from '@prisma/client';
import type {
  task_status,
  assignment_status,
  project_status,
  user_status,
  notification_type,
  history_action,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = '12341234';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
/** Ngày tương đối so với hôm nay, để dữ liệu luôn hợp lý dù seed lúc nào. */
const inDays = (days: number) => new Date(now + days * DAY);

// ─── Người dùng ──────────────────────────────────────────────────────────────

const seedUsers: Array<{
  email: string;
  full_name: string;
  phone: string;
  roles: role_code[];
  status?: user_status;
}> = [
  { email: 'admin@gmail.com', full_name: 'Nguyễn Quản Trị', phone: '0900000001', roles: [role_code.ADMIN] },
  { email: 'lead@gmail.com', full_name: 'Trần Trưởng Nhóm', phone: '0900000002', roles: [role_code.LEAD] },
  { email: 'lead2@gmail.com', full_name: 'Phạm Trưởng Nhóm Hai', phone: '0900000003', roles: [role_code.LEAD] },
  { email: 'ba1@gmail.com', full_name: 'Lê Phân Tích Một', phone: '0900000004', roles: [role_code.BA] },
  { email: 'ba2@gmail.com', full_name: 'Vũ Phân Tích Hai', phone: '0900000005', roles: [role_code.BA] },
  { email: 'dev1@gmail.com', full_name: 'Hoàng Lập Trình Một', phone: '0900000006', roles: [role_code.USER] },
  { email: 'dev2@gmail.com', full_name: 'Đặng Lập Trình Hai', phone: '0900000007', roles: [role_code.USER] },
  { email: 'dev3@gmail.com', full_name: 'Bùi Lập Trình Ba', phone: '0900000008', roles: [role_code.USER] },
  // Tài khoản bị khoá — để Admin thử chức năng mở khoá.
  { email: 'dev4@gmail.com', full_name: 'Ngô Lập Trình Bốn', phone: '0900000009', roles: [role_code.USER], status: 'LOCKED' },
];

// ─── Dự án ───────────────────────────────────────────────────────────────────

const seedProjects: Array<{
  code: string;
  name: string;
  description: string;
  status: project_status;
  ownerEmail: string;
  members: string[];
}> = [
  {
    code: 'PRJ-A',
    name: 'Cổng thông tin khách hàng',
    description: 'Xây dựng cổng tra cứu và chăm sóc khách hàng trực tuyến.',
    status: 'ACTIVE',
    ownerEmail: 'lead@gmail.com',
    members: ['ba1@gmail.com', 'dev1@gmail.com', 'dev2@gmail.com'],
  },
  {
    code: 'PRJ-B',
    name: 'Ứng dụng di động',
    description: 'Ứng dụng iOS/Android cho khách hàng cá nhân.',
    status: 'ACTIVE',
    ownerEmail: 'lead@gmail.com',
    members: ['ba2@gmail.com', 'dev2@gmail.com', 'dev3@gmail.com'],
  },
  {
    // Dự án của Leader khác — để kiểm tra ranh giới "chỉ chủ sở hữu được quản lý".
    code: 'PRJ-C',
    name: 'Nâng cấp hạ tầng',
    description: 'Chuyển hệ thống sang hạ tầng container và tự động hoá triển khai.',
    status: 'PLANNING',
    ownerEmail: 'lead2@gmail.com',
    members: ['ba1@gmail.com', 'dev3@gmail.com'],
  },
];

// ─── Công việc ───────────────────────────────────────────────────────────────
// Phủ đủ 7 trạng thái và đủ vai trò người tạo, để mỗi role đều có việc để thao tác:
//  - DRAFT do BA/DEV tạo      -> chính họ gửi duyệt / sửa / xoá
//  - WAITING_APPROVAL         -> Leader duyệt hoặc từ chối
//  - REJECTED                 -> người tạo sửa rồi gửi lại
//  - NEW / DOING có assignee  -> người được giao cập nhật tiến độ
//  - DONE                     -> Leader đóng task
//  - CLOSED                   -> chốt, không ai sửa được nữa

interface SeedTask {
  projectCode: string;
  title: string;
  description: string;
  status: task_status;
  assignment_status: assignment_status;
  priority: task_priority;
  creatorEmail: string;
  assigneeEmail?: string;
  /** Người giao việc — chỉ có khi task đã được Leader giao. */
  assignerEmail?: string;
  dueInDays?: number;
}

const seedTasks: SeedTask[] = [
  // ── PRJ-A ─────────────────────────────────────────────────────────────────
  {
    projectCode: 'PRJ-A',
    title: 'Khảo sát yêu cầu màn hình tra cứu hợp đồng',
    description: 'Thu thập yêu cầu từ phòng chăm sóc khách hàng và chốt phạm vi.',
    status: 'DRAFT',
    assignment_status: 'NOT_ASSIGNED',
    priority: 'MEDIUM',
    creatorEmail: 'ba1@gmail.com',
    dueInDays: 7,
  },
  {
    projectCode: 'PRJ-A',
    title: 'Đề xuất cải tiến truy vấn danh sách hợp đồng',
    description: 'Bản nháp do lập trình viên tự đề xuất, chờ gửi duyệt.',
    status: 'DRAFT',
    assignment_status: 'NOT_ASSIGNED',
    priority: 'LOW',
    creatorEmail: 'dev1@gmail.com',
    dueInDays: 10,
  },
  {
    projectCode: 'PRJ-A',
    title: 'Viết tài liệu nghiệp vụ module đăng nhập',
    description: 'Mô tả luồng đăng nhập, quên mật khẩu và khoá tài khoản.',
    status: 'WAITING_APPROVAL',
    assignment_status: 'WAITING_APPROVAL',
    priority: 'HIGH',
    creatorEmail: 'ba1@gmail.com',
    dueInDays: 3,
  },
  {
    projectCode: 'PRJ-A',
    title: 'Tối ưu truy vấn báo cáo doanh thu',
    description: 'Bị từ chối vì chưa nêu rõ phạm vi ảnh hưởng. Cần bổ sung rồi gửi lại.',
    status: 'REJECTED',
    assignment_status: 'REJECTED',
    priority: 'MEDIUM',
    creatorEmail: 'dev1@gmail.com',
    dueInDays: 5,
  },
  {
    projectCode: 'PRJ-A',
    title: 'Dựng khung API người dùng',
    description: 'Tạo các endpoint CRUD người dùng kèm phân quyền.',
    status: 'NEW',
    assignment_status: 'ASSIGNED',
    priority: 'HIGH',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'dev1@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: 6,
  },
  {
    projectCode: 'PRJ-A',
    title: 'Phân tích yêu cầu module đăng nhập',
    description: 'Đang triển khai màn hình đăng nhập và xử lý phiên.',
    status: 'DOING',
    assignment_status: 'ASSIGNED',
    priority: 'HIGH',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'dev2@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: 1,
  },
  {
    projectCode: 'PRJ-A',
    title: 'Tích hợp gửi email thông báo',
    description: 'Đã hoàn thành, chờ trưởng nhóm nghiệm thu và đóng task.',
    status: 'DONE',
    assignment_status: 'ASSIGNED',
    priority: 'MEDIUM',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'dev1@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: -2,
  },
  {
    projectCode: 'PRJ-A',
    title: 'Khởi tạo cấu trúc dự án',
    description: 'Đã nghiệm thu và đóng.',
    status: 'CLOSED',
    assignment_status: 'ASSIGNED',
    priority: 'LOW',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'dev2@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: -14,
  },

  {
    projectCode: 'PRJ-A',
    title: 'Cập nhật tài liệu hướng dẫn sử dụng',
    description: 'Trưởng nhóm giao cho BA soạn tài liệu hướng dẫn cho bản phát hành tới.',
    status: 'NEW',
    assignment_status: 'ASSIGNED',
    priority: 'MEDIUM',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'ba1@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: 4,
  },

  // ── PRJ-B ─────────────────────────────────────────────────────────────────
  {
    projectCode: 'PRJ-B',
    title: 'Thiết kế màn hình trang chủ ứng dụng',
    description: 'Bản nháp mô tả bố cục và luồng điều hướng chính.',
    status: 'DRAFT',
    assignment_status: 'NOT_ASSIGNED',
    priority: 'MEDIUM',
    creatorEmail: 'ba2@gmail.com',
    dueInDays: 9,
  },
  {
    projectCode: 'PRJ-B',
    title: 'Bổ sung đăng nhập bằng sinh trắc học',
    description: 'Lập trình viên đề xuất, đang chờ trưởng nhóm duyệt.',
    status: 'WAITING_APPROVAL',
    assignment_status: 'WAITING_APPROVAL',
    priority: 'LOW',
    creatorEmail: 'dev3@gmail.com',
    dueInDays: 12,
  },
  {
    projectCode: 'PRJ-B',
    title: 'Dựng màn hình danh sách thông báo',
    description: 'Hiển thị thông báo đẩy và đánh dấu đã đọc.',
    status: 'NEW',
    assignment_status: 'ASSIGNED',
    priority: 'MEDIUM',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'dev3@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: 8,
  },
  {
    projectCode: 'PRJ-B',
    title: 'Sửa lỗi treo ứng dụng khi mất mạng',
    description: 'Lỗi nghiêm trọng, cần xử lý gấp.',
    status: 'DOING',
    assignment_status: 'ASSIGNED',
    priority: 'URGENT',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'dev2@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: 0,
  },
  {
    projectCode: 'PRJ-B',
    title: 'Chuẩn hoá bộ biểu tượng ứng dụng',
    description: 'Đã xong, chờ nghiệm thu.',
    status: 'DONE',
    assignment_status: 'ASSIGNED',
    priority: 'LOW',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'dev3@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: -1,
  },

  {
    projectCode: 'PRJ-B',
    title: 'Rà soát luồng nghiệp vụ thanh toán',
    description: 'Đối chiếu luồng thanh toán với quy định mới trước khi triển khai.',
    status: 'DOING',
    assignment_status: 'ASSIGNED',
    priority: 'HIGH',
    creatorEmail: 'lead@gmail.com',
    assigneeEmail: 'ba2@gmail.com',
    assignerEmail: 'lead@gmail.com',
    dueInDays: 2,
  },

  // ── PRJ-C (Leader khác làm chủ sở hữu) ────────────────────────────────────
  {
    projectCode: 'PRJ-C',
    title: 'Khảo sát hiện trạng máy chủ',
    description: 'Thống kê cấu hình và tải hiện tại của các máy chủ.',
    status: 'DRAFT',
    assignment_status: 'NOT_ASSIGNED',
    priority: 'MEDIUM',
    creatorEmail: 'ba1@gmail.com',
    dueInDays: 15,
  },
  {
    projectCode: 'PRJ-C',
    title: 'Viết kịch bản triển khai tự động',
    description: 'Dựng pipeline triển khai cho môi trường thử nghiệm.',
    status: 'NEW',
    assignment_status: 'ASSIGNED',
    priority: 'HIGH',
    creatorEmail: 'lead2@gmail.com',
    assigneeEmail: 'dev3@gmail.com',
    assignerEmail: 'lead2@gmail.com',
    dueInDays: 11,
  },
];

/** Nhật ký tương ứng với trạng thái hiện tại của task. */
function historyFor(
  task: SeedTask,
  ids: { creator: string; assignee?: string; assigner?: string },
): Array<{ action: history_action; actor: string; old?: task_status; next?: task_status; comment?: string }> {
  const entries: Array<{ action: history_action; actor: string; old?: task_status; next?: task_status; comment?: string }> = [
    { action: 'CREATED', actor: ids.creator, next: 'DRAFT' },
  ];

  if (task.status === 'DRAFT') return entries;

  if (task.status === 'WAITING_APPROVAL') {
    entries.push({ action: 'SUBMITTED', actor: ids.creator, old: 'DRAFT', next: 'WAITING_APPROVAL' });
    return entries;
  }

  if (task.status === 'REJECTED') {
    entries.push({ action: 'SUBMITTED', actor: ids.creator, old: 'DRAFT', next: 'WAITING_APPROVAL' });
    entries.push({
      action: 'REJECTED',
      actor: ids.assigner ?? ids.creator,
      old: 'WAITING_APPROVAL',
      next: 'REJECTED',
      comment: 'Chưa nêu rõ phạm vi ảnh hưởng, đề nghị bổ sung.',
    });
    return entries;
  }

  // Các trạng thái còn lại đều đã được giao việc.
  if (ids.assignee && ids.assigner) {
    entries.push({ action: 'ASSIGNED', actor: ids.assigner, old: 'DRAFT', next: 'NEW' });
  }
  if (task.status === 'NEW') return entries;

  entries.push({ action: 'STATUS_CHANGED', actor: ids.assignee ?? ids.creator, old: 'NEW', next: 'DOING' });
  if (task.status === 'DOING') return entries;

  entries.push({ action: 'STATUS_CHANGED', actor: ids.assignee ?? ids.creator, old: 'DOING', next: 'DONE' });
  if (task.status === 'DONE') return entries;

  entries.push({ action: 'CLOSED', actor: ids.assigner ?? ids.creator, old: 'DONE', next: 'CLOSED' });
  return entries;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ── Xoá dữ liệu nghiệp vụ cũ (giữ lại tài khoản + phiên đăng nhập) ────────
  await prisma.notifications.deleteMany();
  await prisma.task_histories.deleteMany();
  await prisma.task_reminders.deleteMany();
  await prisma.attachments.deleteMany();
  await prisma.task_comments.deleteMany();
  await prisma.task_checklists.deleteMany();
  await prisma.task_assignment_requests.deleteMany();
  await prisma.tasks.deleteMany();
  await prisma.project_members.deleteMany();
  await prisma.projects.deleteMany();
  console.log('Đã xoá dữ liệu dự án / công việc cũ.');

  // ── Vai trò ───────────────────────────────────────────────────────────────
  const roleRecords = new Map<role_code, string>();
  for (const code of Object.values(role_code)) {
    const role = await prisma.roles.upsert({
      where: { code },
      update: {},
      create: { code, name: code },
    });
    roleRecords.set(code, role.id);
  }

  // ── Người dùng ────────────────────────────────────────────────────────────
  const userByEmail = new Map<string, string>();
  for (const seedUser of seedUsers) {
    const user = await prisma.users.upsert({
      where: { email: seedUser.email },
      update: {
        full_name: seedUser.full_name,
        phone: seedUser.phone,
        status: seedUser.status ?? 'ACTIVE',
        password_hash: passwordHash,
        deleted_at: null,
      },
      create: {
        username: seedUser.email,
        email: seedUser.email,
        password_hash: passwordHash,
        full_name: seedUser.full_name,
        phone: seedUser.phone,
        status: seedUser.status ?? 'ACTIVE',
      },
    });
    userByEmail.set(seedUser.email, user.id);

    // Đặt lại đúng bộ vai trò khai báo ở trên.
    await prisma.user_roles.deleteMany({ where: { user_id: user.id } });
    for (const code of seedUser.roles) {
      await prisma.user_roles.create({
        data: { user_id: user.id, role_id: roleRecords.get(code)! },
      });
    }

    console.log(
      `Tài khoản: ${user.email.padEnd(18)} [${seedUser.roles.join(', ').padEnd(5)}] ${seedUser.status ?? 'ACTIVE'}`,
    );
  }

  // ── Dự án + thành viên ────────────────────────────────────────────────────
  const projectByCode = new Map<string, string>();
  for (const seedProject of seedProjects) {
    const ownerId = userByEmail.get(seedProject.ownerEmail)!;
    const project = await prisma.projects.create({
      data: {
        code: seedProject.code,
        name: seedProject.name,
        description: seedProject.description,
        status: seedProject.status,
        owner_id: ownerId,
      },
    });
    projectByCode.set(seedProject.code, project.id);

    await prisma.project_members.create({
      data: { project_id: project.id, user_id: ownerId, project_role: 'OWNER' },
    });
    await prisma.project_members.createMany({
      data: seedProject.members.map((email) => ({
        project_id: project.id,
        user_id: userByEmail.get(email)!,
        project_role: 'MEMBER' as const,
      })),
    });

    console.log(
      `Dự án:     ${seedProject.code} - ${seedProject.name} (chủ sở hữu ${seedProject.ownerEmail}, ${seedProject.members.length} thành viên)`,
    );
  }

  // ── Công việc + nhật ký + thông báo ───────────────────────────────────────
  let position = 0;
  for (const seedTask of seedTasks) {
    const projectId = projectByCode.get(seedTask.projectCode)!;
    const creatorId = userByEmail.get(seedTask.creatorEmail)!;
    const assigneeId = seedTask.assigneeEmail ? userByEmail.get(seedTask.assigneeEmail)! : null;
    const assignerId = seedTask.assignerEmail ? userByEmail.get(seedTask.assignerEmail)! : null;

    const task = await prisma.tasks.create({
      data: {
        project_id: projectId,
        title: seedTask.title,
        description: seedTask.description,
        priority: seedTask.priority,
        status: seedTask.status,
        assignment_status: seedTask.assignment_status,
        due_date: seedTask.dueInDays === undefined ? null : inDays(seedTask.dueInDays),
        board_position: (position += 1),
        creator_id: creatorId,
        assigner_id: assignerId,
        assignee_id: assigneeId,
      },
    });

    const entries = historyFor(seedTask, {
      creator: creatorId,
      assignee: assigneeId ?? undefined,
      assigner: assignerId ?? undefined,
    });
    for (const [index, entry] of entries.entries()) {
      await prisma.task_histories.create({
        data: {
          task_id: task.id,
          actor_id: entry.actor,
          action: entry.action,
          old_status: entry.old,
          new_status: entry.next,
          comment: entry.comment,
          created_at: new Date(now - (entries.length - index) * DAY),
        },
      });
    }

    // Thông báo cho người được giao việc.
    if (assigneeId && seedTask.assignment_status === 'ASSIGNED') {
      await prisma.notifications.create({
        data: {
          user_id: assigneeId,
          task_id: task.id,
          type: 'TASK_ASSIGNED' as notification_type,
          title: 'Bạn được giao một công việc mới',
          message: seedTask.title,
          is_read: seedTask.status === 'CLOSED',
        },
      });
    }
    // Thông báo cho trưởng nhóm về task đang chờ duyệt.
    if (seedTask.status === 'WAITING_APPROVAL') {
      const project = seedProjects.find((p) => p.code === seedTask.projectCode)!;
      await prisma.notifications.create({
        data: {
          user_id: userByEmail.get(project.ownerEmail)!,
          task_id: task.id,
          type: 'APPROVAL_REQUEST' as notification_type,
          title: 'Có công việc đang chờ bạn duyệt',
          message: seedTask.title,
        },
      });
    }
    // Thông báo cho người tạo khi task bị từ chối.
    if (seedTask.status === 'REJECTED') {
      await prisma.notifications.create({
        data: {
          user_id: creatorId,
          task_id: task.id,
          type: 'APPROVAL_REJECTED' as notification_type,
          title: 'Công việc của bạn bị từ chối',
          message: seedTask.title,
        },
      });
    }

    console.log(
      `Công việc: [${seedTask.projectCode}] ${seedTask.status.padEnd(17)} ${seedTask.title}`,
    );
  }

  console.log(`\nHoàn tất. Mật khẩu chung cho mọi tài khoản: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
