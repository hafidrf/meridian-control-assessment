export type RoleName = "admin" | "dispatcher" | "warehouse" | "driver" | "viewer";

export type JwtPayload = {
  sub: string;
  email: string;
  role: RoleName;
  warehouseId?: string | null;
};

export type PaginationQuery = {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
  cursor?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export type ListResponse<T> = {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  nextCursor?: string | null;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
