import * as Auth from '@liquescens/auth-js';

export class AuthenticationService extends Auth.Authentication
{
    /**
     * @returns {Promise<Profile>}
     */
    async getProfile()
    {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await fetch(`${this.configuration.base_uri}/profile`, { credentials: 'include' });
        if (response.status !== 200) throw new Error('TODO');
        return await response.json();
    }

    /**
     * @param {Profile} data 
     */
    async updateProfile(data)
    {
        const response = await fetch(`${this.configuration.base_uri}/profile`, { method: 'PUT', credentials: 'include', body: JSON.stringify(data) });
        if (response.status !== 200) throw new Error('TODO');
    }
}