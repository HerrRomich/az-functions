import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, EventType, Route, Router, RouterStateSnapshot, Routes } from '@angular/router';
import * as lodash from 'lodash';
import {
  BreadcrumbData,
  BreadcrumbElement,
  MenuElement,
  MenuStructure,
  RouterConfigElementData,
  routerConfigElementDataSchema,
} from './router-support.model';

@Injectable()
export class RouterSupportService {
  private readonly router = inject(Router);

  private readonly _loading = signal<boolean>(true);
  readonly loading = this._loading.asReadonly();
  private readonly _menuStructure = signal<MenuStructure>([], { equal: (a, b) => lodash.isEqual(a, b) });
  readonly menuStructure = this._menuStructure.asReadonly();
  private readonly _breadcrumb = signal<BreadcrumbData>([], { equal: (a, b) => lodash.isEqual(a, b) });
  readonly breadcrumb = this._breadcrumb.asReadonly();

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event.type === EventType.ActivationStart) {
        this.setLoading();
      } else if (event.type === EventType.NavigationEnd) {
        this.unsetLoading();
      } else if (
        event.type === EventType.NavigationCancel ||
        event.type === EventType.NavigationError ||
        event.type === EventType.NavigationSkipped
      ) {
        this.unsetLoading();
      } else if (event.type === EventType.ResolveEnd) {
        this.resolveData(event.state);
      }
    });
  }

  unsetLoading() {
    this._loading.set(false);
  }

  setLoading() {
    this._loading.set(true);
  }

  async navigateBack(defaultRoute: string) {
    const previousUrl = this.router.lastSuccessfulNavigation?.previousNavigation?.finalUrl ?? defaultRoute;
    await this.router.navigateByUrl(previousUrl);
  }

  private resolveData(state: RouterStateSnapshot) {
    const menuStructure: MenuStructure = [];
    const breadcrumbData: BreadcrumbData = [];
    this.traverseRouteConfig('', '', this.router.config, menuStructure);
    this.traverseRouteState(state.root, menuStructure, breadcrumbData);
    this._menuStructure.set(menuStructure);
    this._breadcrumb.set(breadcrumbData);
  }

  private traverseRouteState(
    rootSnapshot: ActivatedRouteSnapshot,
    menuStructure: MenuStructure,
    breadcrumbData: BreadcrumbData,
  ): MenuStructure {
    let children = menuStructure;
    let snapshot: ActivatedRouteSnapshot | null = rootSnapshot;
    let tag = '';
    let path = '';
    while (snapshot) {
      const route = snapshot.routeConfig;
      if (!route) {
        snapshot = snapshot.firstChild;
        continue;
      }
      const rootConfigMenuBarElement = snapshot.data['menuBarElement'];
      const safeParsedMenuBarElement = routerConfigElementDataSchema.safeParse(rootConfigMenuBarElement);
      tag = tag + '/' + route.path;
      path = this.router.serializeUrl(
        this.router.createUrlTree([path, ...snapshot.url.map(segment => segment.toString())]),
      );
      if (
        route.path &&
        safeParsedMenuBarElement.success &&
        (route.data?.['menuBarElement'] || route?.resolve?.['menuBarElement'])
      ) {
        children = this.processMenuElement(safeParsedMenuBarElement.data, children, tag, path, breadcrumbData);
      }
      const loadedRoutes = this.getLoadedRoutes(route);
      if (loadedRoutes) {
        this.traverseRouteConfig(tag, path, loadedRoutes, children);
      }
      snapshot = snapshot.firstChild;
    }
    return menuStructure;
  }

  private processMenuElement(
    menuBarElement: RouterConfigElementData,
    children: MenuElement[],
    tag: string,
    path: string,
    breadcrumbData: BreadcrumbElement[],
  ): MenuStructure {
    const routerConfigElementData = menuBarElement;
    const title = lodash.cloneDeep(routerConfigElementData['title']);
    const icon = lodash.cloneDeep(routerConfigElementData.icon);
    if (routerConfigElementData.menu ?? true) {
      let menuElement = children.find(menuElement => menuElement.tag === tag);
      if (menuElement) {
        menuElement.title = title;
        menuElement.icon = icon;
        menuElement.path = path;
        children = menuElement.children;
      } else {
        menuElement = {
          tag,
          title,
          icon,
          path,
          children: [],
        };
        children.push(menuElement);
        children = menuElement.children;
      }
    }
    if (routerConfigElementData.breadcrumb ?? true) {
      breadcrumbData.push({ title, path });
    }
    return children;
  }

  private getLoadedRoutes(route: Route): Routes {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (route as any)._loadedRoutes;
  }

  private traverseRouteConfig(
    parentTag: string,
    parentPath: string,
    routes: Routes,
    menuStructure: MenuStructure,
  ): void {
    routes.forEach(route => {
      const rootConfigMenuBarElement = route.data?.['menuBarElement'];
      const safeParsedMenuBarElement = routerConfigElementDataSchema.safeParse(rootConfigMenuBarElement);
      const tag = parentTag + '/' + route.path;
      const path = this.router.serializeUrl(this.router.createUrlTree([parentPath, route.path]));
      if (route.path && safeParsedMenuBarElement.success && (safeParsedMenuBarElement.data.menu ?? true)) {
        const routerConfigElementData = safeParsedMenuBarElement.data;
        const title = lodash.cloneDeep(routerConfigElementData['title']);
        const icon = lodash.cloneDeep(routerConfigElementData.icon);
        menuStructure.push({
          tag,
          title,
          icon,
          path,
          children: [],
        });
      } else if (route.resolve?.['menuBarElement'] === undefined && route.children) {
        this.traverseRouteConfig(tag, path, route.children, menuStructure);
      }
    });
  }
}
