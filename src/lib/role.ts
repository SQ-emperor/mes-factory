export const ROLE_LEVEL: Record<string, number> = {
  admin: 3,
  manager: 2,
  worker: 1,
};

export function requireMinRole(role: string, minRole: string) {
  if ((ROLE_LEVEL[role] || 0) < (ROLE_LEVEL[minRole] || 0)) {
    throw new Error("无权操作");
  }
}

export function canManage(myRole: string, targetRole: string): boolean {
  return (ROLE_LEVEL[myRole] || 0) > (ROLE_LEVEL[targetRole] || 0);
}
