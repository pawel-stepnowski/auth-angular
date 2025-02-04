import { Component, Input } from "@angular/core";

@Component
({
    selector: 'auth-image',
    imports: [],
    template: `@switch (name.toLowerCase())
{
    @case ('microsoft') { <i class="bi bi-microsoft"></i> }
    @case ('google') { <i class="bi bi-google"></i> }
    @case ('github') { <i class="bi bi-github"></i> }
    @case ('linkedin') { <i class="bi bi-linkedin"></i> }
    @case ('mail') { <i class="bi bi-envelope"></i> }
}`
})
export class AuthImage
{
    @Input({ required: true }) name: string = '';
}