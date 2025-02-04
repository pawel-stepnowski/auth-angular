import { Component, HostBinding, Input, ViewEncapsulation } from "@angular/core";
import { AuthImage } from "./AuthImage";

@Component
({
    selector: '[auth-button]',
    imports: [AuthImage],
    encapsulation: ViewEncapsulation.None,
    template: `
  <auth-image [name]="provider_id" />
  <span class="flex-grow-1 ms-2">{{ display_name }}</span>
`
})
export class AuthButton
{
  @Input({ required: true }) provider_id: string = '';
  @Input({ required: true }) display_name: string = '';
  @HostBinding('class') buttonClass = 'btn d-inline-flex align-items-center align-content-center shadow-sm';
}