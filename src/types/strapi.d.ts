import type { Strapi } from "@strapi/strapi";
import type { Context } from "koa";

// Strapi instance type
export type StrapiInstance = Strapi;

// Extended Koa context with Strapi additions
export interface StrapiContext extends Context {
  state: {
    user?: AuthUser & {
      sub?: string;
      siteCount?: number;
    };
    route?: {
      info: {
        apiName: string;
      };
      handler: string;
    };
  };
  query: {
    filters?: Record<string, unknown>;
    populate?: string[] | Record<string, unknown>;
    sort?: Record<string, "ASC" | "DESC"> | string;
    limit?: number;
    pagination?: {
      limit?: number;
      start?: number;
      pageSize?: number;
    };
  };
  params: {
    id?: string;
    uid?: string;
  };
  request: Context["request"] & {
    body?: {
      data?: Record<string, unknown>;
    };
    query?: Record<string, unknown>;
  };
}

// Policy context type
export interface PolicyContext extends StrapiContext {
  state: StrapiContext["state"] & {
    user?: AuthUser;
    route?: {
      info: {
        apiName: string;
      };
      handler: string;
    };
  };
}

// Policy function signature
export type PolicyFunction = (
  policyContext: PolicyContext,
  config: Record<string, unknown>,
  context: { strapi: StrapiInstance }
) => Promise<boolean> | boolean;

// Controller factory types
export interface CoreControllerConfig {
  strapi: StrapiInstance;
}

// Entity Service types
export interface FindOneOptions {
  fields?: string[];
  filters?: Record<string, unknown>;
  populate?: Record<string, unknown> | string[];
}

export interface FindManyOptions extends FindOneOptions {
  sort?: Record<string, "ASC" | "DESC"> | string;
  limit?: number;
  start?: number;
}

// Base entity types
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// Auth User entity
export interface AuthUser extends BaseEntity {
  user_id: string;
  email: string;
  name?: string;
  businessName?: string;
  score?: number;
  level?: number;
  avatar?: string;
  profile_pic?: MediaFile;
  role?: UserRole;
  sites?: Site[];
}

// User Role entity
export interface UserRole extends BaseEntity {
  name: string;
  type: string;
}

// Site entity
export interface Site extends BaseEntity {
  title: string;
  description?: string;
  category?: string;
  lat: number;
  lng: number;
  slug: string;
  priority?: number;
  type?: SiteType;
  images?: MediaFile[];
  facilities?: Facility[];
  sub_types?: SubType[];
  owners?: AuthUser[];
  added_by?: AuthUser;
  contributors?: AuthUser[];
  likes?: AuthUser[];
  comments?: Comment[];
}

// Site Type entity
export interface SiteType extends BaseEntity {
  name: string;
  remote_icon?: MediaFile;
  remote_marker?: MediaFile;
}

// Facility entity
export interface Facility extends BaseEntity {
  name: string;
}

// Sub Type entity
export interface SubType extends BaseEntity {
  name: string;
}

// Comment entity
export interface Comment extends BaseEntity {
  content: string;
  status: "pending" | "complete" | "rejected";
  owner?: AuthUser;
}

// User Route entity
export interface UserRoute extends BaseEntity {
  name: string;
  description?: string;
  polyline?: Coordinate[];
  mode?: TravelMode;
  public: boolean;
  image?: MediaFile;
  sites?: RouteSite[];
  owner?: AuthUser;
}

// Route Site (junction)
export interface RouteSite {
  site?: Site;
  custom?: {
    lat: number;
    lng: number;
  };
}

// Media file entity
export interface MediaFile extends BaseEntity {
  name: string;
  url: string;
  formats?: Record<string, { url: string }>;
}

// Travel modes
export type TravelMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";

// Coordinate type
export interface Coordinate {
  latitude: number;
  longitude: number;
}

// Strapi response wrapper
export interface StrapiResponse<T> {
  data: {
    id: number;
    attributes: T;
  };
  meta?: Record<string, unknown>;
}

export interface StrapiListResponse<T> {
  data: Array<{
    id: number;
    attributes: T;
  }>;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Register function params
export interface RegisterParams {
  strapi: StrapiInstance;
}

// Bootstrap function params
export interface BootstrapParams {
  strapi: StrapiInstance;
}

// Lifecycle hooks
export interface StrapiLifecycle {
  register: (params: RegisterParams) => void | Promise<void>;
  bootstrap: (params: BootstrapParams) => void | Promise<void>;
}

// Middleware types
export type MiddlewareNext = () => Promise<void>;

export type MiddlewareHandler = (
  context: StrapiContext,
  next: MiddlewareNext
) => Promise<void>;

export type MiddlewareFactory = (
  config: Record<string, unknown>,
  context: { strapi: StrapiInstance }
) => MiddlewareHandler;
