import { Directive, HostListener, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({ selector: '[appCapFirst]' })
export class CapFirstDirective {
  constructor(@Optional() @Self() private ctrl: NgControl) {}

  @HostListener('blur')
  onBlur(): void {
    if (!this.ctrl?.control) return;
    const val: string = this.ctrl.control.value || '';
    const cap = val.replace(/(?:^|\s+)\S/g, c => c.toUpperCase());
    if (val !== cap) this.ctrl.control.setValue(cap);
  }
}
