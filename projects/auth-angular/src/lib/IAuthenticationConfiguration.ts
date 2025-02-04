import * as Auth from '@liquescens/auth-js';

export interface IAuthenticationConfiguration
{
    id: string,
    host: string,
    redirect_uri: string
    providers: Auth.OAuth2.Provider[]
}