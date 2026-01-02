import { OptTranslation, OptTranslationSchema } from '@fleet/shared/model/opt-translation.model';
import { z } from 'zod';

export type MenuStructure = MenuElement[];

export interface MenuElement {
  tag: string;
  title: OptTranslation;
  icon?: string | { svgIcon: string };
  path: string;
  children: MenuStructure;
}

const iconSchema = z
  .string()
  .or(
    z.object({
      svgIcon: z.string(),
    }),
  )
  .optional();

export const routerConfigElementDataSchema = z.object({
  menu: z.boolean().optional(),
  breadcrumb: z.boolean().optional(),
  title: OptTranslationSchema,
  icon: iconSchema,
});

export type RouterConfigElementData = z.infer<typeof routerConfigElementDataSchema>;

export type BreadcrumbData = BreadcrumbElement[];

export interface BreadcrumbElement {
  title: OptTranslation;
  path: string;
}
