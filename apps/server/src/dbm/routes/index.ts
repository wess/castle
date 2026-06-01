import type { Route } from "@atlas/server";
import { compareRoutes } from "./compare.ts";
import { connectionRoutes } from "./connections.ts";
import { favoriteRoutes } from "./favorites.ts";
import { macroRoutes } from "./macros.ts";
import { profileRoutes } from "./profile.ts";
import { queryRoutes } from "./queries.ts";
import { settingsRoutes as dbmSettingsRoutes } from "./settings.ts";
import { tableRoutes } from "./tables.ts";
import { tabRoutes } from "./tabs.ts";

export const dbmRoutes: Route[] = [
  ...connectionRoutes,
  ...tableRoutes,
  ...profileRoutes,
  ...queryRoutes,
  ...favoriteRoutes,
  ...macroRoutes,
  ...compareRoutes,
  ...tabRoutes,
  ...dbmSettingsRoutes,
];
