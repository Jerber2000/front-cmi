// directives/has-role.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit {
  @Input() appHasRole: number[] = [];

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    if (this.authService.hasRole(this.appHasRole)) {
      // Usuario tiene el rol, mostrar elemento
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      // Usuario NO tiene el rol, ocultar elemento
      this.viewContainer.clear();
    }
  }
}