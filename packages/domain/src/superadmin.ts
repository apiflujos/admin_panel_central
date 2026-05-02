import type { AdminWebSuperAdminOverviewDto, AdminWebSuperAdminUserDto } from "../../shared/src/admin-web";

type SuperAdminUserRow = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: Date | string;
};

export function toAdminWebSuperAdminUserDto(row: SuperAdminUserRow): AdminWebSuperAdminUserDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function toAdminWebSuperAdminOverviewDto(input: {
  tenantsCount: number;
  plansCount: number;
  servicesCount: number;
  modulesCount: number;
  users: SuperAdminUserRow[];
}): AdminWebSuperAdminOverviewDto {
  const users = input.users.map(toAdminWebSuperAdminUserDto);
  return {
    tenantsCount: input.tenantsCount,
    plansCount: input.plansCount,
    servicesCount: input.servicesCount,
    modulesCount: input.modulesCount,
    users,
    summary: {
      usersCount: users.length,
      tenantsCount: input.tenantsCount,
      plansCount: input.plansCount,
    },
  };
}
