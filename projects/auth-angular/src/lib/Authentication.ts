import * as Auth from '@liquescens/auth-js';
import { AuthenticationService } from './AuthenticationService';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { SessionItem } from './SessionItem';
import { Profile } from './Profile';

@Injectable({ providedIn: 'root' })
export class Authentication
{
    service_provider: () => Promise<AuthenticationService>;
    service: AuthenticationService | undefined;
    state: { name: 'in-process' }
         | { name: 'error' }
         | { name: 'signed-out', service: AuthenticationService }
         | { name: 'signed-in', service: AuthenticationService }
         | { name: 'signed-in-without-active-account', service: AuthenticationService }
         = { name: 'in-process' };
    session_info = new BehaviorSubject<Awaited<ReturnType<Auth.Authentication['getSessionInfo']>> | null>(null);
    session_info$ = this.session_info.asObservable();
    active_session = new BehaviorSubject<SessionItem | undefined>(undefined);
    active_session$ = this.active_session.asObservable();
    profile = new BehaviorSubject<Profile | undefined>(undefined);
    profile$ = this.profile.asObservable();
    sessions$: Observable<SessionItem[]>;

    constructor
    (
        @Inject('authentication-service-provider') service_provider: () => Promise<AuthenticationService>
    )
    {
        this.service_provider = service_provider;
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
            this.state = { name: 'in-process' };
            this.service = await this.service_provider();
            await this._requestSessionInfo(this.service);
        }
        catch (exception)
        {
            this.state = { name: 'error' };
        }
    }

    async updateProfile(data: Profile)
    {
        this._updateStateWithServiceAction
        ({
            refresh_profile: true,
            refresh_session_info: true,
            service_action: async service => await service.updateProfile(data)
        });
    }

    async signOut()
    {
        this._updateStateWithServiceAction
        ({
            refresh_profile: false,
            refresh_session_info: true,
            service_action: async service =>
            {
                const active_session_id = this.session_info.value?.client.active_session_id;
                if (active_session_id) await service.signOut(active_session_id);
            }
        });
    }

    async setActiveSession(session: Auth.Session)
    {
        this._updateStateWithServiceAction
        ({
            refresh_profile: true,
            refresh_session_info: true,
            service_action: async service => await service.setActiveSession(session.id)
        });
    }

    async _requestSessionInfo(service: AuthenticationService)
    {
        try
        {
            const user_info = await service.getSessionInfo();
            this.session_info.next(user_info);
            const sessions = Object.values(user_info.sessions);
            if (sessions.length === 0)
            {
                this.state = { name: 'signed-out', service };
                this.active_session.next(undefined);
            }
            else
            {
                const active_session = this._createSessionInfoItem(user_info.sessions[user_info.client.active_session_id ?? ''] ?? undefined);
                const state_name = active_session ? 'signed-in' : 'signed-in-without-active-account';
                this.state = { name: state_name, service };
                this.active_session.next(active_session);
            }
        }
        catch (exception)
        {
            this.state = { name: 'error' };
            this.session_info.next(null);
        }
    }

    async _requestProfile(service: AuthenticationService)
    {
        const profile = await service.getProfile();
        this.profile.next(profile);
    }

    async _updateStateWithServiceAction({ refresh_profile, refresh_session_info, service_action } : { refresh_profile: boolean, refresh_session_info: boolean, service_action: (service: AuthenticationService) => Promise<void> })
    {
        if (this.state.name === 'in-process') throw new Error('The service is in an invalid state. The previous operation is not completed yet.');
        if (this.state.name === 'error') throw new Error('The service is in error state.');
        const service = this.state.service;
        try
        {
            if (!this.service) throw Error('Service is not available.');
            this.state = { name: 'in-process' };
            if (refresh_profile) this.profile.next(undefined);
            if (refresh_session_info) this.active_session.next(undefined);
            await service_action(service);
            if (refresh_session_info) this._requestSessionInfo(service);
            if (refresh_profile) this._requestProfile(service);
        }
        catch (exception)
        {
            this.state = { name: 'error' };
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
