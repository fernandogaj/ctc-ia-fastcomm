import Link from 'next/link';
import { useRouter } from 'next/router';

const links = [
  { href: '/gestao', label: 'Gestão' },
  { href: '/chat', label: 'Chat' },
];

export default function Layout({ children }) {
  const router = useRouter();

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>FastComm</h1>
        <nav>
          {links.map((link) => {
            const isActive = router.pathname === link.href;
            return (
              <Link
                key={link.href}
                className={`nav-link${isActive ? ' active' : ''}`}
                href={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="main">
        <header className="header">Central de Operações Inteligentes</header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
