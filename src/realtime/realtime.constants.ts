/** Namespace socket.io cho mọi thông báo realtime của app. */
export const REALTIME_NAMESPACE = '/realtime';

/** Tên các event server đẩy xuống client. */
export const REALTIME_EVENT = {
  /** Một thông báo mới cho user (giao task, duyệt, đổi trạng thái...). */
  NOTIFICATION: 'notification',
} as const;

/** Room riêng của từng user — mọi socket của user đó cùng join vào đây. */
export const userRoom = (userId: string): string => `user:${userId}`;
