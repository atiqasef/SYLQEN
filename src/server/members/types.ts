import "server-only";

export type MemberDTO = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt: string;
  isCurrentUser: boolean;
};

export type MemberListResult = {
  items: MemberDTO[];
  total: number;
  ownerCount: number;
};
