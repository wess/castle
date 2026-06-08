import { Center, Loader } from "@mantine/core";
import { Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/context.tsx";
import { Databases } from "./dbm/index.tsx";
import { Apps } from "./pages/apps/index.tsx";
import { Authorize } from "./pages/authorize.tsx";
import { CreateContainer } from "./pages/containers/create.tsx";
import { ContainerDetail } from "./pages/containers/detail.tsx";
import { Containers } from "./pages/containers/index.tsx";
import { Dashboard } from "./pages/dashboard.tsx";
import { Domains } from "./pages/domains.tsx";
import { Images } from "./pages/images.tsx";
import { Login } from "./pages/login.tsx";
import { Signup } from "./pages/signup.tsx";
import { CreateLxc } from "./pages/lxc/create.tsx";
import { LxcDetail } from "./pages/lxc/detail.tsx";
import { LxcList } from "./pages/lxc/index.tsx";
import { Mcp } from "./pages/mcp/index.tsx";
import { Networks } from "./pages/networks/index.tsx";
import { Ollama } from "./pages/ollama/index.tsx";
import { Settings } from "./pages/settings.tsx";
import { Storage } from "./pages/storage/index.tsx";
import { Users } from "./pages/users/index.tsx";
import { Shell } from "./shell.tsx";

export const App = () => {
  const { user, loading, needsSetup } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  if (!user) return needsSetup ? <Signup /> : <Login />;

  // OIDC consent: rendered full-bleed (no Shell) since it's a one-shot
  // hand-off that immediately redirects to the relying party. Castle is
  // single-tenant homelab — Authorize auto-approves.
  if (location.pathname === "/oauth/authorize") {
    return <Authorize />;
  }

  // The DB manager renders its own full-viewport AppShell. Nesting it inside
  // Castle's outer AppShell makes the two compete over the same Mantine CSS
  // variables and the inner Main ends up inset by the outer navbar width.
  // Take databases full-bleed; there's a Castle pill inside dbm's sidebar.
  if (location.pathname.startsWith("/databases")) {
    return <Databases />;
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/apps" element={<Apps />} />
        <Route path="/ollama" element={<Ollama />} />
        <Route path="/mcp" element={<Mcp />} />
        <Route path="/containers" element={<Containers />} />
        <Route path="/containers/new" element={<CreateContainer />} />
        <Route path="/containers/:id" element={<ContainerDetail />} />
        <Route path="/images" element={<Images />} />
        <Route path="/lxc" element={<LxcList />} />
        <Route path="/lxc/new" element={<CreateLxc />} />
        <Route path="/lxc/:name" element={<LxcDetail />} />
        <Route path="/networks" element={<Networks />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/domains" element={<Domains />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Shell>
  );
};
