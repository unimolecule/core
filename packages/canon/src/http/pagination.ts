export type PaginationMode = "cursor" | "page";

export type CursorPagination = {
  hasNext: boolean;
  limit: number;
  mode: "cursor";
  nextCursor?: string;
};

export type PagePagination = {
  hasNext: boolean;
  limit: number;
  mode: "page";
  page: number;
  total: number;
};

export type Pagination = CursorPagination | PagePagination;

export type PaginationInput =
  | {
      cursor?: string;
      limit: number;
      mode: "cursor";
    }
  | {
      limit: number;
      mode: "page";
      page: number;
    };

export type PaginatedPage = {
  pagination: Pagination;
};

export function createCursorPagination(input: {
  hasNext: boolean;
  limit: number;
  nextCursor?: string;
}): CursorPagination {
  return {
    hasNext: input.hasNext,
    limit: input.limit,
    mode: "cursor",
    nextCursor: input.nextCursor,
  };
}

export function createPagePagination(input: {
  hasNext: boolean;
  limit: number;
  page: number;
  total: number;
}): PagePagination {
  return {
    hasNext: input.hasNext,
    limit: input.limit,
    mode: "page",
    page: input.page,
    total: input.total,
  };
}
