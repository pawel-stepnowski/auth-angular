import * as Auth from '@liquescens/auth-js';
import { AuthenticationService } from './AuthenticationService';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { IAuthenticationConfiguration } from './IAuthenticationConfiguration';
import { SessionItem } from './SessionItem';
import { Profile } from './Profile';

@Injectable({ providedIn: 'root' })
export class Authentication
{
    configuration: IAuthenticationConfiguration;
    service: AuthenticationService;
    private session_info = new BehaviorSubject<Awaited<ReturnType<Auth.Authentication['getSessionInfo']>> | null>(null);
    session_info$ = this.session_info.asObservable();
    private active_session = new BehaviorSubject<SessionItem | undefined>(undefined);
    active_session$ = this.active_session.asObservable();
    sessions$: Observable<SessionItem[]>;
    state: 'in-process' | 'signed-out' | 'signed-in' | 'signed-in-without-account' | 'error' = 'in-process';
    private profile = new BehaviorSubject<Profile | undefined>(undefined);
    profile$ = this.profile.asObservable();

    constructor
    (
        @Inject('authentication-configuration') configuration: IAuthenticationConfiguration
    )
    {
        this.configuration = configuration;
        this.service = new AuthenticationService(this.configuration.host);
        this.sessions$ = this.session_info$.pipe(map(info => 
        { 
            const items = [];
            if (info) for (const session of Object.values(info.sessions))
            {
                const item = this._createSessionInfoItem(session);
                if (item) items.push(item);
            }
            return items;
        }));
    }

    async initialize()
    {
        try
        {
            this.state = 'in-process';
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this._requestSessionInfo();
        }
        catch (exception)
        {
            this.state = 'error';
        }
    }

    async updateProfile(data: Profile)
    {
        await this.service.updateProfile(data);
        await this.requestProfile();
        await this._requestSessionInfo();
    }

    async requestProfile()
    {
        const profile = await this.service.getProfile();
        this.profile.next(profile);
    }

    async signOut()
    {
        if (this.state === 'in-process') throw new Error('TODO');
        try
        {
            this.state = 'in-process';
            const active_session_id = this.session_info.value?.client.active_session_id;
            if (active_session_id) await this.service.signOut(active_session_id);
            await this._requestSessionInfo();
        }
        catch (exception)
        {
            this.state = 'error';
        }
    }

    async setActiveSession(session: Auth.Session)
    {
        if (this.state === 'in-process') throw new Error('TODO');
        try
        {
            this.state = 'in-process';
            this.profile.next(undefined);
            this.active_session.next(undefined);
            this.service.setActiveSession(session.id);
            await new Promise(resolve => setTimeout(resolve, 1000));
            this._requestSessionInfo();
            this.requestProfile();
        }
        catch (exception)
        {
            this.state = 'error';
        }
    }

    async _requestSessionInfo()
    {
        try
        {
            const user_info = await this.service.getSessionInfo();
            this.session_info.next(user_info);
            const sessions = Object.values(user_info.sessions);
            if (sessions.length === 0)
            {
                this.state = 'signed-out';
                this.active_session.next(undefined);
            }
            else
            {
                const active_session = this._createSessionInfoItem(user_info.sessions[user_info.client.active_session_id ?? ''] ?? undefined);
                this.state = active_session ? 'signed-in' : 'signed-in-without-account';
                this.active_session.next(active_session);
            }
        }
        catch (exception)
        {
            this.state = 'error';
            this.session_info.next(null);
        }
    }

    _createSessionInfoItem(session: Auth.Session | undefined)
    {
        if (!session) return;
        if (!this.session_info.value) return;
        const identity = this.session_info.value.identities[session.identity_id];
        if (!identity) return;
        const account = this.session_info.value.accounts[identity.account_id];
        if (!account) return;
        return { session, identity, account };
    }
}
