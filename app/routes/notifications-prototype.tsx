// PROTOTYPE — throwaway full inbox page for "What do Notifications look like in Cadence?".
import { useRouteLoaderData } from "react-router";
import { InboxPage } from "~/components/notifications-prototype";
import type { loader as layoutLoader } from "./layout.app";

export default function NotificationsPrototype() {
  const data = useRouteLoaderData<typeof layoutLoader>("routes/layout.app");
  const u = data?.currentUser;
  return (
    <InboxPage
      who={u ? { id: u.id, role: u.role, isTeamAdmin: data.isTeamAdmin } : null}
    />
  );
}
