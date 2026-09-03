/**
 * Chuẩn hoá chuỗi tìm kiếm để khớp với cột `users.search_text`
 * (STORED generated column: lower + unaccent + đ/Đ -> d/D).
 *
 * Dùng cùng logic ở cả 2 phía: JS chuẩn hoá term người dùng nhập,
 * PostgreSQL chuẩn hoá dữ liệu cột. Với tiếng Việt hai cách này cho kết quả trùng nhau.
 */
export function normalizeSearchTerm(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // bỏ dấu tổ hợp (huyền, sắc, hỏi, ngã, nặng, mũ...)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ') // gộp khoảng trắng thừa: "mai   dieu" -> "mai dieu"
    .trim();
}
