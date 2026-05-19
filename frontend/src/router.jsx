import { createBrowserRouter, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
]);

export default router;