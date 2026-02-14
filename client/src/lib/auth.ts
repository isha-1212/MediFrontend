import { supabase } from '@/lib/supabase'

/**
 * Auth Service - ONLY handles Supabase authentication
 * Use apiClient for Django API calls
 */
class AuthService {
    /**
     * Sign up a new user with Supabase
     * Returns user data if successful
     */
    async signUp(email: string, password: string, role: 'user' | 'admin' = 'user', fullName?: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: role,
                    full_name: fullName
                },
                emailRedirectTo: window.location.origin + '/login'
            }
        })

        if (error) throw error

        return data
    }

    /**
     * Sign in with email and password
     */
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) throw error

        // Store token in localStorage
        if (data.session?.access_token) {
            localStorage.setItem('access_token', data.session.access_token)
        }

        return data
    }

    /**
     * Sign out from Supabase
     */
    async signOut() {
        const { error } = await supabase.auth.signOut()
        localStorage.removeItem('access_token')
        if (error) throw error
    }

    /**
     * Get current Supabase session
     */
    async getSession() {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        if (data.session?.access_token) {
            localStorage.setItem('access_token', data.session.access_token)
        }

        return data.session
    }

    /**
     * Get JWT token from localStorage
     */
    getToken(): string | null {
        return localStorage.getItem('access_token')
    }
}

export const authService = new AuthService()
