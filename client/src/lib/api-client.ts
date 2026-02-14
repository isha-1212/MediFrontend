import { supabase } from './supabase';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

class ApiClient {
    private async getAuthHeader(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token
            ? { 'Authorization': `Bearer ${session.access_token}` }
            : {};
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const authHeader = await this.getAuthHeader();

        const headers: Record<string, string> = {
            ...authHeader,
            ...(options.headers as Record<string, string> || {}),
        };

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async registerUser(data: {
        email: string;
        role: string;
        full_name: string;
        supabase_user_id: string;
    }) {
        return this.request('/users/users/register/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getCurrentUser() {
        // TODO: Implement - fetch current user profile from Django
        return this.request('/users/me/');
    }

    // ============= POLICY ENDPOINTS =============
    async getPolicies() {
        // TODO: Implement - fetch all policies
        return this.request('/policies/');
    }

    async getPolicy(id: string) {
        // TODO: Implement - fetch single policy
        return this.request(`/policies/${id}/`);
    }

    async createPolicy(data: any) {
        // TODO: Implement - create new policy
        return this.request('/policies/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // ============= CLAIM ENDPOINTS =============
    async getClaims() {
        // TODO: Implement - fetch all claims
        return this.request('/claims/');
    }

    async getClaim(id: string) {
        // TODO: Implement - fetch single claim
        return this.request(`/claims/${id}/`);
    }

    async createClaim(data: any) {
        // TODO: Implement - create new claim
        return this.request('/claims/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateClaimStatus(id: string, status: string) {
        // TODO: Implement - update claim status (admin only)
        return this.request(`/claims/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    // ============= FAMILY MEMBER ENDPOINTS =============
    async getFamilyMembers() {
        // TODO: Implement - fetch all family members for current user
        return this.request('/members/');
    }

    async addFamilyMember(data: any) {
        // TODO: Implement - add family member
        return this.request('/members/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // ============= FILE UPLOAD ENDPOINTS - SECURE =============
    // All file operations go through Django backend
    // Frontend NEVER accesses Supabase Storage directly

    /**
     * Upload policy with document
     * Backend handles: file validation, storage upload, metadata storage
     */
    async uploadPolicyWithDocument(data: {
        file: File;
        policy_number: string;
        start_date: string;
        end_date: string;
    }): Promise<{ success: boolean; policy_id: number; message: string }> {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('policy_number', data.policy_number);
        formData.append('start_date', data.start_date);
        formData.append('end_date', data.end_date);

        return this.request('/upload-policy-document/', {
            method: 'POST',
            body: formData,
        });
    }

    /**
     * Get policy document signed URL
     * Backend verifies ownership and returns time-limited URL
     */
    async getPolicyDocument(policyId: number): Promise<{
        signed_url: string;
        expires_in: number;
        file_name: string;
        content_type: string;
    }> {
        return this.request(`/get-policy-document/${policyId}/`);
    }
}

export const apiClient = new ApiClient();
