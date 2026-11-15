import { Outlet } from 'react-router-dom';

/** Layout raiz: cada página traz seu próprio chrome (landing) ou usa AppShell. */
export default function App() {
  return <Outlet />;
}
