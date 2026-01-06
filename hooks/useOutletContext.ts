import { useUser } from "@clerk/nextjs";

export function useOutletContext() {
  const { user } = useUser();

  const outletId = user?.publicMetadata?.outletId as string | undefined;
  const tenantId = user?.publicMetadata?.tenantId as string | undefined;

  return {
    outletId,
    tenantId,
  };
}
