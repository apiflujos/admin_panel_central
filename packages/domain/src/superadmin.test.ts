import { toAdminWebSuperAdminOverviewDto } from "./superadmin";

describe("domain/superadmin", () => {
  it("mapea overview de superadmin con resumen", () => {
    expect(
      toAdminWebSuperAdminOverviewDto({
        tenantsCount: 12,
        plansCount: 4,
        servicesCount: 9,
        modulesCount: 7,
        users: [
          {
            id: 1,
            email: "admin@example.com",
            name: "Admin Uno",
            phone: "3001234567",
            created_at: "2026-05-01T10:00:00.000Z",
          },
        ],
      })
    ).toEqual({
      tenantsCount: 12,
      plansCount: 4,
      servicesCount: 9,
      modulesCount: 7,
      users: [
        {
          id: 1,
          email: "admin@example.com",
          name: "Admin Uno",
          phone: "3001234567",
          createdAt: "2026-05-01T10:00:00.000Z",
        },
      ],
      summary: {
        usersCount: 1,
        tenantsCount: 12,
        plansCount: 4,
      },
    });
  });
});
