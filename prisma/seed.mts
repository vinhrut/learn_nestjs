import { randomUUID } from 'node:crypto';
import {
  Prisma,
  PrismaClient,
  role_code,
  type approval_status,
  type assignment_status,
  type history_action,
  type notification_type,
  type project_member_role,
  type project_status,
  type reminder_status,
  type task_priority,
  type task_status,
  type user_status,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '12341234';
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const daysFromNow = (days: number) => new Date(now + days * DAY);
const hoursFromNow = (hours: number) => new Date(now + hours * HOUR);
const daysAgo = (days: number) => new Date(now - days * DAY);

interface SeedUser {
  email: string;
  fullName: string;
  phone: string;
  roles: role_code[];
  status?: user_status;
  deleted?: boolean;
}

interface SeedProject {
  code: string;
  name: string;
  description: string;
  status: project_status;
  ownerEmail: string;
  members: Array<{ email: string; role: project_member_role }>;
}

interface TaskTemplate {
  title: string;
  description: string;
  status: task_status;
  assignmentStatus: assignment_status;
  priority: task_priority;
  dueInDays?: number;
  dueInHours?: number;
  assigned: boolean;
}

interface SeededTask {
  id: string;
  key: string;
  project: SeedProject;
  template: TaskTemplate;
  creatorId: string;
  assigneeId: string | null;
  assignerId: string | null;
  dueDate: Date | null;
  createdAt: Date;
}

const coreUsers: SeedUser[] = [
  {
    email: 'admin@gmail.com',
    fullName: 'Nguyễn Quản Trị',
    phone: '0900000001',
    roles: [role_code.ADMIN],
  },
  {
    email: 'admin2@gmail.com',
    fullName: 'Đỗ Quản Trị Viên',
    phone: '0900000002',
    roles: [role_code.ADMIN],
  },
  {
    email: 'lead@gmail.com',
    fullName: 'Trần Trưởng Nhóm',
    phone: '0900000003',
    roles: [role_code.LEAD],
  },
  {
    email: 'lead2@gmail.com',
    fullName: 'Phạm Trưởng Nhóm Hai',
    phone: '0900000004',
    roles: [role_code.LEAD],
  },
  {
    email: 'lead3@gmail.com',
    fullName: 'Lương Trưởng Nhóm Ba',
    phone: '0900000005',
    roles: [role_code.LEAD],
  },
  {
    email: 'lead.ba@gmail.com',
    fullName: 'Mai Điều Phối Nghiệp Vụ',
    phone: '0900000006',
    roles: [role_code.LEAD, role_code.BA],
  },
  ...Array.from({ length: 6 }, (_, index): SeedUser => ({
    email: `ba${index + 1}@gmail.com`,
    fullName: `Chuyên viên BA ${String(index + 1).padStart(2, '0')}`,
    phone: `091${String(index + 1).padStart(7, '0')}`,
    roles: [role_code.BA],
  })),
  ...Array.from({ length: 24 }, (_, index): SeedUser => ({
    email: `dev${index + 1}@gmail.com`,
    fullName: `Lập trình viên ${String(index + 1).padStart(2, '0')}`,
    phone: `092${String(index + 1).padStart(7, '0')}`,
    roles: [role_code.USER],
    status: index === 21 ? 'INACTIVE' : index === 22 ? 'LOCKED' : 'ACTIVE',
  })),
  {
    email: 'archived@gmail.com',
    fullName: 'Tài Khoản Đã Xoá',
    phone: '0930000001',
    roles: [role_code.USER],
    status: 'INACTIVE',
    deleted: true,
  },
];

const seedProjects: SeedProject[] = [
  {
    code: 'CRM-PORTAL',
    name: 'Cổng thông tin khách hàng',
    description:
      'Tra cứu hợp đồng, yêu cầu hỗ trợ và chăm sóc khách hàng trực tuyến.',
    status: 'ACTIVE',
    ownerEmail: 'lead@gmail.com',
    members: [
      { email: 'lead.ba@gmail.com', role: 'MANAGER' },
      { email: 'ba1@gmail.com', role: 'MEMBER' },
      { email: 'dev1@gmail.com', role: 'MEMBER' },
      { email: 'dev2@gmail.com', role: 'MEMBER' },
      { email: 'dev3@gmail.com', role: 'VIEWER' },
    ],
  },
  {
    code: 'MOBILE-BANK',
    name: 'Ứng dụng ngân hàng di động',
    description: 'Ứng dụng iOS và Android phục vụ khách hàng cá nhân.',
    status: 'ACTIVE',
    ownerEmail: 'lead@gmail.com',
    members: [
      { email: 'ba2@gmail.com', role: 'MANAGER' },
      { email: 'dev1@gmail.com', role: 'MEMBER' },
      { email: 'dev4@gmail.com', role: 'MEMBER' },
      { email: 'dev5@gmail.com', role: 'MEMBER' },
    ],
  },
  {
    code: 'ECOMMERCE',
    name: 'Nền tảng thương mại điện tử',
    description: 'Quản lý sản phẩm, giỏ hàng, đơn hàng và khuyến mại.',
    status: 'PLANNING',
    ownerEmail: 'lead@gmail.com',
    members: [
      { email: 'ba3@gmail.com', role: 'MANAGER' },
      { email: 'dev6@gmail.com', role: 'MEMBER' },
      { email: 'dev7@gmail.com', role: 'MEMBER' },
      { email: 'dev8@gmail.com', role: 'VIEWER' },
    ],
  },
  {
    code: 'DATA-HUB',
    name: 'Kho dữ liệu tập trung',
    description: 'Đồng bộ, làm sạch và phân tích dữ liệu từ nhiều hệ thống.',
    status: 'COMPLETED',
    ownerEmail: 'lead@gmail.com',
    members: [
      { email: 'ba1@gmail.com', role: 'MANAGER' },
      { email: 'dev2@gmail.com', role: 'MEMBER' },
      { email: 'dev9@gmail.com', role: 'MEMBER' },
    ],
  },
  {
    code: 'CLOUD-MOVE',
    name: 'Di chuyển hạ tầng lên cloud',
    description: 'Container hoá và tự động hoá quy trình triển khai.',
    status: 'ACTIVE',
    ownerEmail: 'lead2@gmail.com',
    members: [
      { email: 'lead3@gmail.com', role: 'MANAGER' },
      { email: 'ba4@gmail.com', role: 'MEMBER' },
      { email: 'dev10@gmail.com', role: 'MEMBER' },
      { email: 'dev11@gmail.com', role: 'MEMBER' },
    ],
  },
  {
    code: 'HRM-CORE',
    name: 'Quản lý nhân sự',
    description: 'Hồ sơ nhân viên, chấm công, nghỉ phép và đánh giá hiệu suất.',
    status: 'ACTIVE',
    ownerEmail: 'lead2@gmail.com',
    members: [
      { email: 'ba5@gmail.com', role: 'MANAGER' },
      { email: 'dev12@gmail.com', role: 'MEMBER' },
      { email: 'dev13@gmail.com', role: 'MEMBER' },
      { email: 'dev14@gmail.com', role: 'VIEWER' },
    ],
  },
  {
    code: 'FIN-REPORT',
    name: 'Báo cáo tài chính',
    description: 'Tổng hợp số liệu và xuất báo cáo quản trị định kỳ.',
    status: 'COMPLETED',
    ownerEmail: 'lead2@gmail.com',
    members: [
      { email: 'ba6@gmail.com', role: 'MANAGER' },
      { email: 'dev15@gmail.com', role: 'MEMBER' },
      { email: 'dev16@gmail.com', role: 'MEMBER' },
    ],
  },
  {
    code: 'LEGACY-ERP',
    name: 'ERP phiên bản cũ',
    description: 'Dự án lưu trữ để kiểm thử trạng thái archived.',
    status: 'ARCHIVED',
    ownerEmail: 'lead2@gmail.com',
    members: [
      { email: 'ba4@gmail.com', role: 'MEMBER' },
      { email: 'dev10@gmail.com', role: 'VIEWER' },
    ],
  },
  {
    code: 'QA-AUTO',
    name: 'Tự động hoá kiểm thử',
    description: 'Xây dựng bộ kiểm thử API, giao diện và báo cáo chất lượng.',
    status: 'PLANNING',
    ownerEmail: 'lead3@gmail.com',
    members: [
      { email: 'ba2@gmail.com', role: 'MANAGER' },
      { email: 'dev17@gmail.com', role: 'MEMBER' },
      { email: 'dev18@gmail.com', role: 'MEMBER' },
    ],
  },
  {
    code: 'IOT-MONITOR',
    name: 'Giám sát thiết bị IoT',
    description:
      'Thu thập cảnh báo và trạng thái vận hành theo thời gian thực.',
    status: 'ACTIVE',
    ownerEmail: 'lead3@gmail.com',
    members: [
      { email: 'ba3@gmail.com', role: 'MANAGER' },
      { email: 'dev19@gmail.com', role: 'MEMBER' },
      { email: 'dev20@gmail.com', role: 'MEMBER' },
      { email: 'dev21@gmail.com', role: 'VIEWER' },
    ],
  },
  {
    code: 'HELPDESK',
    name: 'Trung tâm hỗ trợ nội bộ',
    description: 'Tiếp nhận, phân loại và theo dõi yêu cầu hỗ trợ.',
    status: 'ACTIVE',
    ownerEmail: 'lead3@gmail.com',
    members: [
      { email: 'ba5@gmail.com', role: 'MANAGER' },
      { email: 'dev3@gmail.com', role: 'MEMBER' },
      { email: 'dev6@gmail.com', role: 'MEMBER' },
      { email: 'dev9@gmail.com', role: 'MEMBER' },
    ],
  },
  {
    code: 'OLD-WEB',
    name: 'Website giới thiệu cũ',
    description: 'Dự án đã ngừng vận hành, giữ lại để tra cứu lịch sử.',
    status: 'ARCHIVED',
    ownerEmail: 'lead3@gmail.com',
    members: [
      { email: 'ba6@gmail.com', role: 'MEMBER' },
      { email: 'dev20@gmail.com', role: 'VIEWER' },
    ],
  },
];

// Mỗi project có 12 task: phủ đủ trạng thái, ưu tiên, hạn quá hạn/sắp đến
// và mọi trạng thái giao việc để test lọc, Kanban, dashboard.
const taskTemplates: TaskTemplate[] = [
  {
    title: 'Phân tích yêu cầu nghiệp vụ',
    description: 'Bản nháp có thể sửa, xoá hoặc gửi trưởng nhóm duyệt.',
    status: 'DRAFT',
    assignmentStatus: 'NOT_ASSIGNED',
    priority: 'MEDIUM',
    dueInDays: 7,
    assigned: false,
  },
  {
    title: 'Đề xuất cải tiến quy trình',
    description: 'Đang chờ trưởng nhóm duyệt hoặc từ chối.',
    status: 'WAITING_APPROVAL',
    assignmentStatus: 'WAITING_APPROVAL',
    priority: 'HIGH',
    dueInDays: 4,
    assigned: false,
  },
  {
    title: 'Tối ưu truy vấn báo cáo',
    description: 'Đã bị từ chối, người tạo có thể chỉnh sửa và gửi lại.',
    status: 'REJECTED',
    assignmentStatus: 'REJECTED',
    priority: 'LOW',
    dueInDays: 5,
    assigned: false,
  },
  {
    title: 'Xây dựng API quản lý dữ liệu',
    description: 'Công việc mới đã được giao và có thể bắt đầu thực hiện.',
    status: 'NEW',
    assignmentStatus: 'ASSIGNED',
    priority: 'HIGH',
    dueInDays: 6,
    assigned: true,
  },
  {
    title: 'Hoàn thiện giao diện danh sách',
    description:
      'Công việc đang triển khai, có dữ liệu bình luận và checklist.',
    status: 'DOING',
    assignmentStatus: 'ASSIGNED',
    priority: 'MEDIUM',
    dueInDays: 2,
    assigned: true,
  },
  {
    title: 'Tích hợp dịch vụ gửi email',
    description: 'Đã hoàn thành, đang chờ trưởng nhóm đóng công việc.',
    status: 'DONE',
    assignmentStatus: 'ASSIGNED',
    priority: 'MEDIUM',
    dueInDays: -1,
    assigned: true,
  },
  {
    title: 'Khởi tạo cấu trúc dự án',
    description: 'Công việc đã nghiệm thu và đóng.',
    status: 'CLOSED',
    assignmentStatus: 'ASSIGNED',
    priority: 'LOW',
    dueInDays: -14,
    assigned: true,
  },
  {
    title: 'Thiết kế bộ lọc nâng cao',
    description: 'Đề xuất đã được duyệt, sẵn sàng tiếp nhận và phân công.',
    status: 'NEW',
    assignmentStatus: 'APPROVED',
    priority: 'MEDIUM',
    dueInDays: 9,
    assigned: true,
  },
  {
    title: 'Sửa lỗi đồng bộ dữ liệu',
    description: 'Công việc khẩn đang làm và đã quá hạn để test cảnh báo.',
    status: 'DOING',
    assignmentStatus: 'ASSIGNED',
    priority: 'URGENT',
    dueInDays: -2,
    assigned: true,
  },
  {
    title: 'Kiểm tra bản phát hành gần nhất',
    description: 'Hạn chót nằm trong 24 giờ tới để test dashboard.',
    status: 'NEW',
    assignmentStatus: 'ASSIGNED',
    priority: 'URGENT',
    dueInHours: 12,
    assigned: true,
  },
  {
    title: 'Nghiên cứu giải pháp thay thế',
    description: 'Đề xuất đã huỷ, giữ lại để test bộ lọc trạng thái giao việc.',
    status: 'DRAFT',
    assignmentStatus: 'CANCELLED',
    priority: 'LOW',
    assigned: false,
  },
  {
    title: 'Chuẩn bị tài liệu hướng dẫn',
    description: 'Công việc mới chưa giao cho thành viên cụ thể.',
    status: 'NEW',
    assignmentStatus: 'NOT_ASSIGNED',
    priority: 'HIGH',
    dueInDays: 10,
    assigned: false,
  },
];

const roleDetails: Record<role_code, { name: string; description: string }> = {
  ADMIN: {
    name: 'Quản trị viên',
    description: 'Quản lý tài khoản và toàn bộ hệ thống.',
  },
  LEAD: {
    name: 'Trưởng nhóm',
    description: 'Quản lý dự án, giao việc và phê duyệt.',
  },
  BA: {
    name: 'Chuyên viên phân tích',
    description: 'Phân tích nghiệp vụ và tạo công việc.',
  },
  USER: { name: 'Người dùng', description: 'Thành viên thực hiện công việc.' },
};

function requireId(
  map: Map<string, string>,
  key: string,
  label: string,
): string {
  const id = map.get(key);
  if (!id) throw new Error(`Không tìm thấy ${label}: ${key}`);
  return id;
}

function activeProjectUsers(project: SeedProject): string[] {
  return project.members
    .filter((member) => member.role !== 'VIEWER')
    .map((member) => member.email)
    .filter((email) => !['dev22@gmail.com', 'dev23@gmail.com'].includes(email));
}

function historyFor(
  task: SeededTask,
  ownerId: string,
): Prisma.task_historiesCreateManyInput[] {
  const result: Prisma.task_historiesCreateManyInput[] = [];
  const push = (
    action: history_action,
    actorId: string,
    age: number,
    oldStatus?: task_status,
    newStatus?: task_status,
    comment?: string,
    metadata?: Prisma.InputJsonValue,
  ) => {
    result.push({
      id: randomUUID(),
      task_id: task.id,
      actor_id: actorId,
      action,
      old_status: oldStatus,
      new_status: newStatus,
      comment,
      metadata,
      created_at: daysAgo(age),
    });
  };

  push(
    'CREATED',
    task.creatorId,
    18,
    undefined,
    'DRAFT',
    'Khởi tạo công việc.',
  );
  if (task.template.status === 'DRAFT') return result;
  if (
    task.template.status === 'WAITING_APPROVAL' ||
    task.template.status === 'REJECTED'
  ) {
    push(
      'SUBMITTED',
      task.creatorId,
      15,
      'DRAFT',
      'WAITING_APPROVAL',
      'Gửi trưởng nhóm duyệt.',
    );
  }
  if (task.template.status === 'WAITING_APPROVAL') return result;
  if (task.template.status === 'REJECTED') {
    push(
      'REJECTED',
      ownerId,
      13,
      'WAITING_APPROVAL',
      'REJECTED',
      'Cần bổ sung phạm vi ảnh hưởng và tiêu chí nghiệm thu.',
    );
    return result;
  }
  if (task.template.assignmentStatus === 'APPROVED') {
    push('SUBMITTED', task.creatorId, 15, 'DRAFT', 'WAITING_APPROVAL');
    push('APPROVED', ownerId, 14, 'WAITING_APPROVAL', 'NEW', 'Đề xuất hợp lệ.');
  } else if (task.template.assigned && task.assigneeId && task.assignerId) {
    push(
      'ASSIGNED',
      task.assignerId,
      14,
      'DRAFT',
      'NEW',
      'Trưởng nhóm giao công việc.',
      { assignee_id: task.assigneeId },
    );
    result[result.length - 1].new_assignee_id = task.assigneeId;
    result[result.length - 1].new_assigner_id = task.assignerId;
  }
  if (task.template.status === 'NEW') return result;
  push('STATUS_CHANGED', task.assigneeId ?? task.creatorId, 10, 'NEW', 'DOING');
  if (task.template.status === 'DOING') return result;
  push('STATUS_CHANGED', task.assigneeId ?? task.creatorId, 5, 'DOING', 'DONE');
  if (task.template.status === 'DONE') return result;
  push(
    'CLOSED',
    ownerId,
    2,
    'DONE',
    'CLOSED',
    'Đã nghiệm thu và đóng công việc.',
  );
  return result;
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.notifications.deleteMany(),
    prisma.task_histories.deleteMany(),
    prisma.task_reminders.deleteMany(),
    prisma.attachments.deleteMany(),
    prisma.task_comments.deleteMany(),
    prisma.task_checklists.deleteMany(),
    prisma.task_extension_requests.deleteMany(),
    prisma.task_assignment_requests.deleteMany(),
    prisma.tasks.deleteMany(),
    prisma.project_members.deleteMany(),
    prisma.projects.deleteMany(),
    prisma.refresh_tokens.deleteMany(),
    prisma.otp_codes.deleteMany(),
    prisma.manager_users.deleteMany(),
    prisma.user_roles.deleteMany(),
    prisma.users.deleteMany(),
    prisma.roles.deleteMany(),
  ]);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const otpHash = await bcrypt.hash('000000', 10);
  console.log('Đang xoá dữ liệu cũ để tạo bộ seed nhất quán...');
  await resetDatabase();

  const roleIdByCode = new Map<role_code, string>();
  const roles: Prisma.rolesCreateManyInput[] = Object.values(role_code).map(
    (code) => {
      const id = randomUUID();
      roleIdByCode.set(code, id);
      return { id, code, ...roleDetails[code] };
    },
  );
  await prisma.roles.createMany({ data: roles });

  const userIdByEmail = new Map<string, string>();
  const users: Prisma.usersCreateManyInput[] = coreUsers.map((user, index) => {
    const id = randomUUID();
    userIdByEmail.set(user.email, id);
    return {
      id,
      username: user.email.split('@')[0],
      email: user.email,
      password_hash: passwordHash,
      full_name: user.fullName,
      phone: user.phone,
      avatar_url:
        index < 8
          ? `https://i.pravatar.cc/300?u=${encodeURIComponent(user.email)}`
          : null,
      status: user.status ?? 'ACTIVE',
      created_at: daysAgo(coreUsers.length - index),
      updated_at: daysAgo(Math.max(0, coreUsers.length - index - 1)),
      deleted_at: user.deleted ? daysAgo(1) : null,
    };
  });
  await prisma.users.createMany({ data: users });
  await prisma.user_roles.createMany({
    data: coreUsers.flatMap((user) =>
      user.roles.map((code) => ({
        user_id: requireId(userIdByEmail, user.email, 'user'),
        role_id: requireId(roleIdByCode, code, 'role'),
      })),
    ),
  });

  const managedGroups: Record<string, string[]> = {
    'lead@gmail.com': [
      'ba1@gmail.com',
      'ba2@gmail.com',
      'ba3@gmail.com',
      ...Array.from({ length: 9 }, (_, i) => `dev${i + 1}@gmail.com`),
    ],
    'lead2@gmail.com': [
      'ba4@gmail.com',
      'ba5@gmail.com',
      ...Array.from({ length: 8 }, (_, i) => `dev${i + 10}@gmail.com`),
    ],
    'lead3@gmail.com': [
      'ba6@gmail.com',
      ...Array.from({ length: 6 }, (_, i) => `dev${i + 18}@gmail.com`),
    ],
  };
  await prisma.manager_users.createMany({
    data: Object.entries(managedGroups).flatMap(([managerEmail, emails]) =>
      emails.map((email) => ({
        manager_id: requireId(userIdByEmail, managerEmail, 'manager'),
        user_id: requireId(userIdByEmail, email, 'user'),
      })),
    ),
  });

  // Chỉ tạo token/OTP đã hết hạn hoặc thu hồi để có dữ liệu quan hệ nhưng không tạo phiên giả còn hiệu lực.
  await prisma.refresh_tokens.createMany({
    data: [
      {
        id: randomUUID(),
        user_id: requireId(userIdByEmail, 'admin@gmail.com', 'user'),
        token_hash: 'seed-revoked-refresh-token',
        expires_at: daysFromNow(7),
        revoked_at: daysAgo(1),
        created_at: daysAgo(2),
      },
      {
        id: randomUUID(),
        user_id: requireId(userIdByEmail, 'dev1@gmail.com', 'user'),
        token_hash: 'seed-expired-refresh-token',
        expires_at: daysAgo(2),
        created_at: daysAgo(9),
      },
    ],
  });
  await prisma.otp_codes.createMany({
    data: [
      {
        id: randomUUID(),
        user_id: requireId(userIdByEmail, 'ba1@gmail.com', 'user'),
        purpose: 'PASSWORD_RESET',
        code_hash: otpHash,
        expires_at: daysAgo(2),
        attempts: 1,
        created_at: daysAgo(3),
      },
      {
        id: randomUUID(),
        user_id: requireId(userIdByEmail, 'dev2@gmail.com', 'user'),
        purpose: 'PASSWORD_RESET',
        code_hash: otpHash,
        expires_at: daysAgo(1),
        consumed_at: daysAgo(1),
        created_at: daysAgo(2),
      },
    ],
  });

  const projectIdByCode = new Map<string, string>();
  const projects: Prisma.projectsCreateManyInput[] = seedProjects.map(
    (project, index) => {
      const id = randomUUID();
      projectIdByCode.set(project.code, id);
      return {
        id,
        code: project.code,
        name: project.name,
        description: project.description,
        status: project.status,
        owner_id: requireId(userIdByEmail, project.ownerEmail, 'project owner'),
        created_at: daysAgo(120 - index * 7),
        updated_at: daysAgo(index % 8),
      };
    },
  );
  await prisma.projects.createMany({ data: projects });
  await prisma.project_members.createMany({
    data: seedProjects.flatMap((project, projectIndex) => {
      const projectId = requireId(projectIdByCode, project.code, 'project');
      return [
        {
          project_id: projectId,
          user_id: requireId(userIdByEmail, project.ownerEmail, 'owner'),
          project_role: 'OWNER' as project_member_role,
          joined_at: daysAgo(120 - projectIndex * 7),
        },
        ...project.members.map((member, memberIndex) => ({
          project_id: projectId,
          user_id: requireId(userIdByEmail, member.email, 'member'),
          project_role: member.role,
          joined_at: daysAgo(110 - projectIndex * 7 - memberIndex),
        })),
      ];
    }),
  });

  const seededTasks: SeededTask[] = [];
  const taskRows: Prisma.tasksCreateManyInput[] = [];
  for (const [projectIndex, project] of seedProjects.entries()) {
    const availableUsers = activeProjectUsers(project);
    const creatorCandidates = availableUsers.filter(
      (email) => email !== 'lead.ba@gmail.com',
    );
    for (const [templateIndex, template] of taskTemplates.entries()) {
      const id = randomUUID();
      const creatorEmail =
        template.assignmentStatus === 'APPROVED'
          ? creatorCandidates[templateIndex % creatorCandidates.length]
          : template.assigned
            ? project.ownerEmail
            : creatorCandidates[templateIndex % creatorCandidates.length];
      const assigneeEmail = template.assigned
        ? availableUsers[(templateIndex + 1) % availableUsers.length]
        : undefined;
      const dueDate =
        template.dueInHours !== undefined
          ? hoursFromNow(template.dueInHours)
          : template.dueInDays !== undefined
            ? daysFromNow(template.dueInDays)
            : null;
      const createdAt = daysAgo(60 - projectIndex * 2 - templateIndex);
      const task: SeededTask = {
        id,
        key: `${project.code}:${templateIndex + 1}`,
        project,
        template,
        creatorId: requireId(userIdByEmail, creatorEmail, 'task creator'),
        assigneeId: assigneeEmail
          ? requireId(userIdByEmail, assigneeEmail, 'task assignee')
          : null,
        assignerId: template.assigned
          ? requireId(userIdByEmail, project.ownerEmail, 'task assigner')
          : null,
        dueDate,
        createdAt,
      };
      seededTasks.push(task);
      taskRows.push({
        id,
        project_id: requireId(projectIdByCode, project.code, 'project'),
        title: `[${project.code}] ${template.title}`,
        description: template.description,
        priority: template.priority,
        status: template.status,
        assignment_status: template.assignmentStatus,
        due_date: dueDate,
        board_position: templateIndex + 1,
        creator_id: task.creatorId,
        assigner_id: task.assignerId,
        assignee_id: task.assigneeId,
        created_at: createdAt,
        updated_at: daysAgo(Math.max(0, 12 - templateIndex)),
      });
    }
  }
  await prisma.tasks.createMany({ data: taskRows });

  const histories = seededTasks.flatMap((task) =>
    historyFor(
      task,
      requireId(userIdByEmail, task.project.ownerEmail, 'project owner'),
    ),
  );
  await prisma.task_histories.createMany({ data: histories });

  const assignmentRequests: Prisma.task_assignment_requestsCreateManyInput[] =
    [];
  for (const project of seedProjects) {
    const ownerId = requireId(
      userIdByEmail,
      project.ownerEmail,
      'project owner',
    );
    const fallbackAssigneeId = requireId(
      userIdByEmail,
      activeProjectUsers(project)[0],
      'assignee',
    );
    for (const [slot, status] of [
      [2, 'PENDING'],
      [3, 'REJECTED'],
      [8, 'APPROVED'],
    ] as Array<[number, approval_status]>) {
      const task = seededTasks.find(
        (item) => item.key === `${project.code}:${slot}`,
      )!;
      const reviewed = status !== 'PENDING';
      assignmentRequests.push({
        id: randomUUID(),
        task_id: task.id,
        requester_id: task.creatorId,
        assigner_id: ownerId,
        assignee_id: task.assigneeId ?? fallbackAssigneeId,
        status,
        requested_at: daysAgo(15),
        reviewed_by: reviewed ? ownerId : null,
        reviewed_at: reviewed ? daysAgo(13) : null,
        reject_reason:
          status === 'REJECTED'
            ? 'Chưa đủ thông tin để xác định người thực hiện.'
            : null,
        created_at: daysAgo(15),
        updated_at: reviewed ? daysAgo(13) : daysAgo(15),
      });
    }
  }
  await prisma.task_assignment_requests.createMany({
    data: assignmentRequests,
  });

  const extensionRequests: Prisma.task_extension_requestsCreateManyInput[] = [];
  for (const project of seedProjects) {
    const ownerId = requireId(
      userIdByEmail,
      project.ownerEmail,
      'project owner',
    );
    const pendingTask = seededTasks.find(
      (item) => item.key === `${project.code}:4`,
    )!;
    const approvedTask = seededTasks.find(
      (item) => item.key === `${project.code}:5`,
    )!;
    const rejectedTask = seededTasks.find(
      (item) => item.key === `${project.code}:9`,
    )!;
    extensionRequests.push(
      {
        id: randomUUID(),
        task_id: pendingTask.id,
        requester_id: pendingTask.assigneeId!,
        current_due_date: pendingTask.dueDate,
        requested_due_date: new Date(pendingTask.dueDate!.getTime() + 3 * DAY),
        reason: 'Cần thêm thời gian hoàn thiện kiểm thử tích hợp.',
        status: 'PENDING',
        requested_at: daysAgo(1),
        created_at: daysAgo(1),
        updated_at: daysAgo(1),
      },
      {
        id: randomUUID(),
        task_id: approvedTask.id,
        requester_id: approvedTask.assigneeId!,
        current_due_date: new Date(approvedTask.dueDate!.getTime() - 3 * DAY),
        requested_due_date: approvedTask.dueDate!,
        reason: 'Phụ thuộc API của đối tác được bàn giao muộn.',
        status: 'APPROVED',
        requested_at: daysAgo(7),
        reviewed_by: ownerId,
        reviewed_at: daysAgo(6),
        created_at: daysAgo(7),
        updated_at: daysAgo(6),
      },
      {
        id: randomUUID(),
        task_id: rejectedTask.id,
        requester_id: rejectedTask.assigneeId!,
        current_due_date: rejectedTask.dueDate,
        requested_due_date: new Date(rejectedTask.dueDate!.getTime() + 5 * DAY),
        reason: 'Muốn có thêm thời gian tối ưu mã nguồn.',
        status: 'REJECTED',
        requested_at: daysAgo(5),
        reviewed_by: ownerId,
        reviewed_at: daysAgo(4),
        reject_reason: 'Đây là lỗi khẩn, cần ưu tiên xử lý đúng hạn.',
        created_at: daysAgo(5),
        updated_at: daysAgo(4),
      },
    );
  }
  await prisma.task_extension_requests.createMany({ data: extensionRequests });

  const checklists: Prisma.task_checklistsCreateManyInput[] =
    seededTasks.flatMap((task) =>
      [
        'Xác nhận yêu cầu',
        'Hoàn thiện triển khai',
        'Kiểm thử và cập nhật tài liệu',
      ].map((title, index) => ({
        id: randomUUID(),
        task_id: task.id,
        title,
        is_done:
          task.template.status === 'CLOSED' ||
          task.template.status === 'DONE' ||
          (task.template.status === 'DOING' && index === 0),
        position: index + 1,
        created_at: new Date(task.createdAt.getTime() + DAY),
        updated_at: daysAgo(Math.max(0, 4 - index)),
      })),
    );
  await prisma.task_checklists.createMany({ data: checklists });

  // Task này có hơn 30 mục thảo luận để test phân trang comment/attachment.
  const discussionTask = seededTasks.find(
    (task) => task.key === 'CRM-PORTAL:5',
  )!;
  const discussionUsers = [
    'lead@gmail.com',
    'ba1@gmail.com',
    'dev1@gmail.com',
    'dev2@gmail.com',
  ].map((email) => requireId(userIdByEmail, email, 'discussion user'));
  const comments: Prisma.task_commentsCreateManyInput[] = Array.from(
    { length: 28 },
    (_, index) => ({
      id: randomUUID(),
      task_id: discussionTask.id,
      user_id: discussionUsers[index % discussionUsers.length],
      content: `Trao đổi #${String(index + 1).padStart(2, '0')}: cập nhật tiến độ và kết quả kiểm thử.`,
      created_at: new Date(now - (28 - index) * HOUR),
      updated_at: new Date(now - (28 - index) * HOUR),
      deleted_at: index === 3 ? daysAgo(1) : null,
    }),
  );
  for (const task of seededTasks.filter(
    (item) => item.template.status === 'DOING',
  )) {
    if (task.id === discussionTask.id) continue;
    comments.push({
      id: randomUUID(),
      task_id: task.id,
      user_id: task.assigneeId ?? task.creatorId,
      content: 'Đã cập nhật tiến độ, hiện chưa phát sinh trở ngại.',
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
    });
  }
  await prisma.task_comments.createMany({ data: comments });

  const attachmentSeeds: Array<[string, string, bigint]> = [
    ['tai-lieu-yeu-cau.pdf', 'application/pdf', 245_760n],
    ['anh-giao-dien.png', 'image/png', 524_288n],
    [
      'ket-qua-kiem-thu.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      98_304n,
    ],
    ['log-tich-hop.txt', 'text/plain', 16_384n],
    [
      'tai-lieu-cu-da-xoa.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      65_536n,
    ],
  ];
  const attachments: Prisma.attachmentsCreateManyInput[] = attachmentSeeds.map(
    ([fileName, mimeType, sizeBytes], index) => ({
      id: randomUUID(),
      task_id: discussionTask.id,
      uploaded_by: discussionUsers[index % discussionUsers.length],
      file_url: `https://example.com/seed-files/${encodeURIComponent(fileName)}`,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      created_at: new Date(now - (10 - index) * HOUR),
      deleted_at: index === 4 ? daysAgo(1) : null,
    }),
  );
  await prisma.attachments.createMany({ data: attachments });

  // Bổ sung các loại lịch sử sinh ra từ bình luận, cập nhật, giao lại và duyệt gia hạn.
  const auxiliaryHistories: Prisma.task_historiesCreateManyInput[] = [
    {
      id: randomUUID(),
      task_id: discussionTask.id,
      actor_id: discussionUsers[2],
      action: 'COMMENTED',
      comment: 'Đã bổ sung kết quả kiểm thử vào phần trao đổi.',
      created_at: hoursFromNow(-6),
    },
    {
      id: randomUUID(),
      task_id: discussionTask.id,
      actor_id: discussionUsers[0],
      action: 'UPDATED',
      comment: 'Cập nhật mô tả và tiêu chí nghiệm thu.',
      metadata: { fields: ['description'] },
      created_at: daysAgo(3),
    },
    {
      id: randomUUID(),
      task_id: discussionTask.id,
      actor_id: discussionUsers[0],
      action: 'REASSIGNED',
      old_assignee_id: discussionUsers[2],
      new_assignee_id: discussionTask.assigneeId,
      new_assigner_id: discussionUsers[0],
      comment: 'Điều chỉnh người phụ trách theo kế hoạch sprint.',
      created_at: daysAgo(2),
    },
    ...extensionRequests
      .filter((request) => request.status !== 'PENDING')
      .map((request) => ({
        id: randomUUID(),
        task_id: request.task_id,
        actor_id: request.reviewed_by!,
        action: (request.status === 'APPROVED'
          ? 'UPDATED'
          : 'REJECTED') as history_action,
        comment:
          request.status === 'APPROVED'
            ? request.reason
            : request.reject_reason,
        metadata: {
          kind: 'DEADLINE_EXTENSION',
          request_id: request.id,
          status: request.status,
          requested_due_date: new Date(
            request.requested_due_date,
          ).toISOString(),
        },
        created_at: request.reviewed_at!,
      })),
  ];
  await prisma.task_histories.createMany({ data: auxiliaryHistories });

  const reminders: Prisma.task_remindersCreateManyInput[] = seededTasks
    .filter((task) => task.assigneeId && task.dueDate)
    .map((task, index) => {
      const status = (['PENDING', 'SENT', 'FAILED'] as reminder_status[])[
        index % 3
      ];
      return {
        id: randomUUID(),
        task_id: task.id,
        user_id: task.assigneeId!,
        due_date_snapshot: task.dueDate!,
        status,
        scheduled_for: new Date(task.dueDate!.getTime() - DAY),
        sent_at: status === 'SENT' ? daysAgo(1) : null,
        created_at: daysAgo(3),
      };
    });
  await prisma.task_reminders.createMany({ data: reminders });

  const notifications: Prisma.notificationsCreateManyInput[] = [];
  const addNotification = (
    userId: string,
    type: notification_type,
    title: string,
    message: string,
    ageInHours: number,
    taskId?: string,
    isRead = false,
  ) => {
    const createdAt = new Date(now - ageInHours * HOUR);
    notifications.push({
      id: randomUUID(),
      user_id: userId,
      task_id: taskId,
      type,
      title,
      message,
      is_read: isRead,
      read_at: isRead ? new Date(createdAt.getTime() + HOUR) : null,
      created_at: createdAt,
    });
  };

  for (const [index, task] of seededTasks.entries()) {
    const taskTitle = taskRows[index].title;
    const ownerId = requireId(userIdByEmail, task.project.ownerEmail, 'owner');
    if (task.assigneeId && task.template.assigned)
      addNotification(
        task.assigneeId,
        'TASK_ASSIGNED',
        'Bạn được giao một công việc mới',
        taskTitle,
        200 - index,
        task.id,
        task.template.status === 'CLOSED',
      );
    if (task.template.status === 'WAITING_APPROVAL')
      addNotification(
        ownerId,
        'APPROVAL_REQUEST',
        'Có công việc đang chờ bạn duyệt',
        taskTitle,
        100 - index / 2,
        task.id,
      );
    if (task.template.status === 'REJECTED')
      addNotification(
        task.creatorId,
        'APPROVAL_REJECTED',
        'Công việc của bạn bị từ chối',
        taskTitle,
        80 - index / 3,
        task.id,
      );
    if (task.template.dueInHours !== undefined)
      addNotification(
        task.assigneeId!,
        'TASK_DUE',
        'Công việc sắp đến hạn',
        taskTitle,
        2,
        task.id,
      );
  }
  for (const request of extensionRequests) {
    const task = seededTasks.find((item) => item.id === request.task_id)!;
    const ownerId = requireId(userIdByEmail, task.project.ownerEmail, 'owner');
    if (request.status === 'PENDING') {
      addNotification(
        ownerId,
        'DEADLINE_EXTENSION_REQUEST',
        'Có yêu cầu gia hạn công việc',
        'Thành viên xin dời hạn chót để hoàn thiện kiểm thử.',
        12,
        request.task_id,
      );
    } else {
      addNotification(
        request.requester_id,
        request.status === 'APPROVED'
          ? 'DEADLINE_EXTENSION_APPROVED'
          : 'DEADLINE_EXTENSION_REJECTED',
        request.status === 'APPROVED'
          ? 'Yêu cầu gia hạn đã được duyệt'
          : 'Yêu cầu gia hạn bị từ chối',
        request.status === 'APPROVED'
          ? 'Hạn chót mới đã được cập nhật.'
          : 'Vui lòng giữ nguyên hạn chót hiện tại.',
        24,
        request.task_id,
        true,
      );
    }
  }
  const notificationExamples: Array<{
    email: string;
    type: notification_type;
    title: string;
    message: string;
    task?: SeededTask;
  }> = [
    {
      email: 'dev1@gmail.com',
      type: 'ACCOUNT_CREATED',
      title: 'Tài khoản của bạn đã được tạo',
      message: 'Bạn có thể đăng nhập bằng mật khẩu mặc định.',
    },
    {
      email: 'dev1@gmail.com',
      type: 'PROJECT_MEMBER_ADDED',
      title: 'Bạn được thêm vào dự án',
      message: 'Bạn đã được thêm vào dự án Cổng thông tin khách hàng.',
    },
    {
      email: 'ba1@gmail.com',
      type: 'APPROVAL_APPROVED',
      title: 'Công việc đã được phê duyệt',
      message: 'Đề xuất hợp lệ và đã chuyển sang trạng thái Mới.',
      task: seededTasks.find((item) => item.key === 'CRM-PORTAL:8'),
    },
    {
      email: 'lead@gmail.com',
      type: 'STATUS_CHANGED',
      title: 'Trạng thái công việc đã thay đổi',
      message: 'Thành viên đã chuyển công việc sang Đang làm.',
      task: discussionTask,
    },
  ];
  notificationExamples.forEach((item, index) =>
    addNotification(
      requireId(userIdByEmail, item.email, 'notification user'),
      item.type,
      item.title,
      item.message,
      8 + index,
      item.task?.id,
      index % 2 === 0,
    ),
  );
  // Bảo đảm các tài khoản chính có trên 20 thông báo để test page 1/page 2.
  for (const email of ['admin@gmail.com', 'lead@gmail.com', 'dev1@gmail.com']) {
    const userId = requireId(userIdByEmail, email, 'notification user');
    for (let index = 1; index <= 28; index += 1) {
      addNotification(
        userId,
        index % 5 === 0 ? 'ACCOUNT_UPDATED' : 'SYSTEM',
        `Thông báo kiểm thử #${String(index).padStart(2, '0')}`,
        'Dữ liệu mẫu dùng để kiểm tra phân trang, lọc chưa đọc và đánh dấu đã đọc.',
        index + 1,
        undefined,
        index % 3 === 0,
      );
    }
  }
  await prisma.notifications.createMany({ data: notifications });

  console.table({
    users: users.length,
    projects: projects.length,
    tasks: taskRows.length,
    assignmentRequests: assignmentRequests.length,
    extensionRequests: extensionRequests.length,
    checklists: checklists.length,
    comments: comments.length,
    attachments: attachments.length,
    reminders: reminders.length,
    histories: histories.length + auxiliaryHistories.length,
    notifications: notifications.length,
  });
  console.log(
    `Hoàn tất. Mật khẩu chung cho mọi tài khoản: ${DEFAULT_PASSWORD}`,
  );
  console.log(
    'Tài khoản chính: admin@gmail.com | lead@gmail.com | ba1@gmail.com | dev1@gmail.com',
  );
  console.log(
    'Task nhiều thảo luận: [CRM-PORTAL] Hoàn thiện giao diện danh sách',
  );
}

main()
  .catch((error) => {
    console.error('Seed thất bại:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
