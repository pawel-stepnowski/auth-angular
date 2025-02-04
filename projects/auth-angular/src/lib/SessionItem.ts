import * as Auth from '@liquescens/auth-js';

export type SessionItem =
{
    session: Auth.Session
    identity: Auth.AccountIdentity
    account: Auth.Account
}