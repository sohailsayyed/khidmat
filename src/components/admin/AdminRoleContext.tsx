"use client";

import { createContext, useContext } from "react";

type AdminRole = "ADMIN" | "VIEWER";

const AdminRoleContext = createContext<AdminRole>("ADMIN");

export function AdminRoleProvider({ role, children }: { role: AdminRole; children: React.ReactNode }) {
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

/** true if the current admin can create/edit/delete — false for viewers. */
export function useCanEdit() {
  return useContext(AdminRoleContext) === "ADMIN";
}
