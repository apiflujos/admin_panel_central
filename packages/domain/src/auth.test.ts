import { toAuthSessionDto } from "./auth";

describe("domain/auth", () => {
  it("mapea sesión admin-web enriquecida", () => {
    expect(
      toAuthSessionDto({
        id: 7,
        email: "admin@example.com",
        role: "agent",
        name: "Ana Ruiz",
      })
    ).toEqual({
      id: 7,
      email: "admin@example.com",
      displayName: "Ana Ruiz",
      role: "operator",
      roleLabel: "Operador",
      initials: "AR",
      isSuperAdmin: false,
    });
  });
});
