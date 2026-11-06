import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../../../stores/auth.store'
import AuthField from './AuthField'
import AuthLayout from './AuthLayout'

const loginSchema = z.object({
    username: z.string().min(3, 'Enter at least 3 characters.').max(50, 'Enter no more than 50 characters.'),
    password: z.string().min(8, 'Enter at least 8 characters.'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
    const navigate = useNavigate()
    const login = useAuthStore(state => state.login)
    const [error, setError] = useState('')
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    })

    async function onSubmit(data: LoginForm) {
        try {
            await login(data.username, data.password)
            navigate('/', { replace: true })
        } catch (error) {
            setError(error instanceof Error && !(error instanceof TypeError)
                ? error.message
                : 'Could not reach TNTube. Try again in a moment.')
        }
    }

    return (
        <AuthLayout
            title="Sign in"
            description="Pick up where you left off on TNTube."
            footer={<>New to TNTube? <Link to="/register">Create an account</Link></>}
        >
            <form className="auth-form" noValidate onSubmit={event => {
                setError('')
                void handleSubmit(onSubmit)(event)
            }}>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <AuthField
                    label="Username"
                    field={register('username')}
                    autoComplete="username"
                    error={errors.username?.message}
                />
                <AuthField
                    label="Password"
                    field={register('password')}
                    type="password"
                    autoComplete="current-password"
                    error={errors.password?.message}
                />
                <button type="submit" className="auth-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </AuthLayout>
    )
}
