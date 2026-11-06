import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { UseFormRegisterReturn } from 'react-hook-form'

type AuthFieldProps = {
    label: string
    field: UseFormRegisterReturn
    autoComplete: string
    type?: 'text' | 'password'
    error?: string
    hint?: string
}

export default function AuthField({ label, field, autoComplete, type = 'text', error, hint }: AuthFieldProps) {
    const id = useId()
    const [visible, setVisible] = useState(false)

    return (
        <div className="auth-field">
            <label htmlFor={id}>{label}</label>
            <div className="auth-input-wrap">
                <input
                    {...field}
                    id={id}
                    type={visible ? 'text' : type}
                    autoComplete={autoComplete}
                    autoCapitalize={type === 'password' || autoComplete === 'username' ? 'none' : 'words'}
                    spellCheck={false}
                    required
                    aria-invalid={Boolean(error)}
                    aria-describedby={error || hint ? `${id}-message` : undefined}
                    className={type === 'password' ? 'auth-password-input' : undefined}
                />
                {type === 'password' && (
                    <button
                        type="button"
                        className="auth-password-toggle"
                        aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                        onClick={() => setVisible(!visible)}
                    >
                        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                )}
            </div>
            {(error || hint) && (
                <p id={`${id}-message`} className={error ? 'auth-field-error' : 'auth-hint'}>{error || hint}</p>
            )}
        </div>
    )
}
