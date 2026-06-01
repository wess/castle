// Mount point for the Ambry-derived database manager. Uses TanStack Router
// with hash history internally so it doesn't collide with Castle's
// BrowserRouter at /databases/*.
import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import "./butter.ts";
import { router } from "./router.tsx";
import "./styles.css";

export const Databases = () => {
  useEffect(() => {
    document.documentElement.classList.add("dbm-mode");
    return () => document.documentElement.classList.remove("dbm-mode");
  }, []);
  return <RouterProvider router={router} />;
};
