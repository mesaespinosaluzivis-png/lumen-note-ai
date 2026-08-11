import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: App,
});

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}

export default App;
