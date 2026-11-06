import type { ReactNode } from 'react'
import './auth.css'

type AuthLayoutProps = {
    title: string
    description: string
    children: ReactNode
    footer: ReactNode
}

export default function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
    return (
        <main className="auth-page">
            <div className="auth-shell">
                <div className="auth-brand-panel">
                    <div className="auth-brand">
                        <svg viewBox="0 0 28 22" width="28" height="22" aria-hidden="true">
                            <rect x="1" y="1" width="26" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M11 6.5 19 11l-8 4.5z" fill="currentColor" />
                        </svg>
                        TNTube
                    </div>

                    <svg className="auth-art" viewBox="0 0 440 320" fill="none" aria-hidden="true">
                        <path d="M0 64h440M0 112h440M0 160h440M0 208h440M0 256h440M76 24v272m48-272v272m48-272v272m48-272v272m48-272v272m48-272v272m48-272v272" stroke="#232733" />
                        <rect x="48" y="48" width="288" height="180" rx="18" fill="#171a22" stroke="#454a57" />
                        <rect x="74" y="69" width="288" height="180" rx="18" fill="#191c25" stroke="#747984" />
                        <rect x="100" y="90" width="288" height="180" rx="18" fill="#232733" stroke="#f8f9fb" />
                        <rect x="111" y="101" width="266" height="158" rx="11" fill="#171a22" />
                        <circle cx="244" cy="174" r="36" stroke="#454a57" />
                        <circle cx="244" cy="174" r="25" stroke="#747984" />
                        <path d="M237 160.5a1 1 0 0 0-1.5.9v21.2a1 1 0 0 0 1.5.9l18.4-10.6a1 1 0 0 0 0-1.8z" fill="#f8f9fb" />
                        <path d="M127 242h234" stroke="#454a57" strokeWidth="2" strokeLinecap="round" />
                        <path d="M127 242h82" stroke="#f8f9fb" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="209" cy="242" r="3" fill="#f8f9fb" />
                    </svg>

                    <div className="auth-brand-copy">
                        <p>Make it your feed.</p>
                        <p>Follow the creators you want to see more from.</p>
                    </div>
                </div>

                <section className="auth-content" aria-labelledby="auth-title">
                    <header className="auth-heading">
                        <h1 id="auth-title">{title}</h1>
                        <p>{description}</p>
                    </header>
                    {children}
                    <footer className="auth-footer">{footer}</footer>
                </section>
            </div>
        </main>
    )
}
