import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../../../stores/auth.store'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'

const accountText = z.string().trim().min(3, 'Enter at least 3 characters.').max(50, 'Enter no more than 50 characters.')

const registrationSchema = z.object({
    firstName: accountText,
    lastName: accountText,
    username: accountText,
    password: z.string().min(8, 'Enter at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Re-enter your password.'),
}).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
})

type RegistrationForm = z.infer<typeof registrationSchema>

export default function RegistrationPage() {
    const navigate = useNavigate()
    const registerUser = useAuthStore(state => state.register)
    const [error, setError] = useState('')
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegistrationForm>({
        resolver: zodResolver(registrationSchema),
    })

    async function onSubmit(data: RegistrationForm) {
        try {
            await registerUser(data)
            navigate('/', { replace: true })
        } catch (error) {
            setError(error instanceof Error && !(error instanceof TypeError)
                ? error.message
                : 'Could not reach TNTube. Try again in a moment.')
        }
    }

    return (
        <AuthLayout
            title="Create an account"
            description="Join TNTube to follow your favorite creators."
            footer={<>Already on TNTube? <Link to="/login">Sign in</Link></>}
        >
            <form className="auth-form" noValidate onSubmit={event => {
                setError('')
                void handleSubmit(onSubmit)(event)
            }}>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <div className="auth-name-row">
                    <AuthField
                        label="First name"
                        field={register('firstName')}
                        autoComplete="given-name"
                        error={errors.firstName?.message}
                    />
                    <AuthField
                        label="Last name"
                        field={register('lastName')}
                        autoComplete="family-name"
                        error={errors.lastName?.message}
                    />
                </div>
                <AuthField
                    label="Username"
                    field={register('username')}
                    autoComplete="username"
                    error={errors.username?.message}
                />
                <AuthField
                    label="Password"
                    field={register('password', { deps: 'confirmPassword' })}
                    type="password"
                    autoComplete="new-password"
                    error={errors.password?.message}
                    hint="Use at least 8 characters."
                />
                <AuthField
                    label="Confirm password"
                    field={register('confirmPassword')}
                    type="password"
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                />
                <button type="submit" className="auth-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account…' : 'Create account'}
                </button>
            </form>
        </AuthLayout>
    )
}
