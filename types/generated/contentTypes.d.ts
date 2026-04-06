import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAdditionRequestAdditionRequest
  extends Struct.CollectionTypeSchema {
  collectionName: 'addition_requests';
  info: {
    description: '';
    displayName: 'Addition requests';
    pluralName: 'addition-requests';
    singularName: 'addition-request';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    category: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    email: Schema.Attribute.Email;
    facilities: Schema.Attribute.Relation<
      'oneToMany',
      'api::facility.facility'
    >;
    imageCaption: Schema.Attribute.String;
    images: Schema.Attribute.Media<'images', true>;
    lat: Schema.Attribute.Float & Schema.Attribute.Required;
    lng: Schema.Attribute.Float & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::addition-request.addition-request'
    > &
      Schema.Attribute.Private;
    maplink: Schema.Attribute.Text;
    moderation_status: Schema.Attribute.Enumeration<
      ['submitted', 'pending', 'moderating', 'complete', 'rejected']
    > &
      Schema.Attribute.DefaultTo<'submitted'>;
    owner: Schema.Attribute.Relation<'manyToOne', 'api::auth-user.auth-user'>;
    potential_duplicates: Schema.Attribute.Relation<
      'oneToMany',
      'api::site.site'
    >;
    pricerange: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    sub_types: Schema.Attribute.Relation<
      'oneToMany',
      'api::site-type.site-type'
    >;
    tel: Schema.Attribute.String;
    title: Schema.Attribute.String;
    type: Schema.Attribute.Relation<'oneToOne', 'api::site-type.site-type'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAuthUserAuthUser extends Struct.CollectionTypeSchema {
  collectionName: 'auth_users';
  info: {
    description: '';
    displayName: 'Auth users';
    pluralName: 'auth-users';
    singularName: 'auth-user';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    addition_requests: Schema.Attribute.Relation<
      'oneToMany',
      'api::addition-request.addition-request'
    >;
    allowMarketing: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    avatar: Schema.Attribute.Text;
    businessName: Schema.Attribute.String;
    contentReports: Schema.Attribute.Relation<
      'oneToMany',
      'api::content-report.content-report'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    edit_requests: Schema.Attribute.Relation<
      'oneToMany',
      'api::edit-request.edit-request'
    >;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    favourites: Schema.Attribute.Relation<'manyToMany', 'api::site.site'>;
    fcm_token: Schema.Attribute.String & Schema.Attribute.Private;
    handle: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
        minLength: 3;
      }>;
    isTest: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isVerified: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    level: Schema.Attribute.Enumeration<
      ['nomad', 'wanderer', 'explorer', 'adventurer', 'pioneer']
    > &
      Schema.Attribute.DefaultTo<'nomad'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::auth-user.auth-user'
    > &
      Schema.Attribute.Private;
    maxSites: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    name: Schema.Attribute.String;
    notifications: Schema.Attribute.Relation<
      'oneToMany',
      'api::notification.notification'
    >;
    plan_shares: Schema.Attribute.Relation<
      'oneToMany',
      'api::plan-share.plan-share'
    >;
    profile_pic: Schema.Attribute.Media<'images'>;
    publishedAt: Schema.Attribute.DateTime;
    reviews: Schema.Attribute.Relation<'oneToMany', 'api::review.review'>;
    role: Schema.Attribute.Relation<'manyToOne', 'api::user-role.user-role'>;
    saved_public_routes: Schema.Attribute.Relation<
      'manyToMany',
      'api::user-route.user-route'
    >;
    saved_site_lists: Schema.Attribute.Relation<
      'manyToMany',
      'api::site-list.site-list'
    >;
    score: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    site_lists: Schema.Attribute.Relation<
      'oneToMany',
      'api::site-list.site-list'
    >;
    sites: Schema.Attribute.Relation<'manyToMany', 'api::site.site'>;
    sites_added: Schema.Attribute.Relation<'oneToMany', 'api::site.site'>;
    sites_contributed: Schema.Attribute.Relation<
      'manyToMany',
      'api::site.site'
    >;
    sos_contacts: Schema.Attribute.Relation<
      'manyToMany',
      'api::auth-user.auth-user'
    >;
    trip_plans: Schema.Attribute.Relation<
      'oneToMany',
      'api::trip-plan.trip-plan'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user_id: Schema.Attribute.String & Schema.Attribute.Unique;
    user_routes: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-route.user-route'
    >;
    website: Schema.Attribute.String;
  };
}

export interface ApiCommentComment extends Struct.CollectionTypeSchema {
  collectionName: 'comments_deprecated';
  info: {
    description: 'Deprecated - use Reviews instead. Kept for backwards compatibility.';
    displayName: 'Comments (Deprecated)';
    pluralName: 'comments';
    singularName: 'comment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    comment: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::comment.comment'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContentReportContentReport
  extends Struct.CollectionTypeSchema {
  collectionName: 'content_reports';
  info: {
    description: 'User-submitted reports about problematic content';
    displayName: 'Content Reports';
    pluralName: 'content-reports';
    singularName: 'content-report';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    category: Schema.Attribute.Enumeration<
      ['inappropriate', 'misleading', 'harmful', 'other']
    > &
      Schema.Attribute.Required;
    contentId: Schema.Attribute.Integer & Schema.Attribute.Required;
    contentTitle: Schema.Attribute.String;
    contentType: Schema.Attribute.Enumeration<
      ['site', 'user-route', 'nomad-route', 'profile', 'site-list']
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::content-report.content-report'
    > &
      Schema.Attribute.Private;
    moderation_status: Schema.Attribute.Enumeration<
      ['submitted', 'reviewing', 'resolved', 'dismissed']
    > &
      Schema.Attribute.DefaultTo<'submitted'>;
    publishedAt: Schema.Attribute.DateTime;
    reporter: Schema.Attribute.Relation<
      'manyToOne',
      'api::auth-user.auth-user'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDirectionsKillswitchDirectionsKillswitch
  extends Struct.SingleTypeSchema {
  collectionName: 'directions_killswitches';
  info: {
    displayName: 'Directions killswitch';
    pluralName: 'directions-killswitches';
    singularName: 'directions-killswitch';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::directions-killswitch.directions-killswitch'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiEditRequestEditRequest extends Struct.CollectionTypeSchema {
  collectionName: 'edit_requests';
  info: {
    description: '';
    displayName: 'Edit requests';
    pluralName: 'edit-requests';
    singularName: 'edit-request';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    data: Schema.Attribute.JSON;
    facilities: Schema.Attribute.Relation<
      'oneToMany',
      'api::facility.facility'
    >;
    images: Schema.Attribute.Media<'images', true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::edit-request.edit-request'
    > &
      Schema.Attribute.Private;
    moderation_status: Schema.Attribute.Enumeration<
      ['submitted', 'pending', 'moderating', 'complete', 'rejected']
    > &
      Schema.Attribute.DefaultTo<'submitted'>;
    owner: Schema.Attribute.Relation<'manyToOne', 'api::auth-user.auth-user'>;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFacilityFacility extends Struct.CollectionTypeSchema {
  collectionName: 'facilities';
  info: {
    description: '';
    displayName: 'Facilities';
    pluralName: 'facilities';
    singularName: 'facility';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    guides: Schema.Attribute.Relation<'manyToMany', 'api::guide.guide'>;
    icon: Schema.Attribute.String & Schema.Attribute.Required;
    iconify: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::facility.facility'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    priority: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<10>;
    publishedAt: Schema.Attribute.DateTime;
    relevance: Schema.Attribute.Relation<
      'manyToMany',
      'api::site-type.site-type'
    >;
    remote_icon: Schema.Attribute.Media<'images', true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFaqFaq extends Struct.CollectionTypeSchema {
  collectionName: 'faqs';
  info: {
    description: '';
    displayName: 'FAQs';
    pluralName: 'faqs';
    singularName: 'faq';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    content: Schema.Attribute.Text & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::faq.faq'> &
      Schema.Attribute.Private;
    order: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFeaturedFeatured extends Struct.CollectionTypeSchema {
  collectionName: 'featured_items';
  info: {
    description: 'Curated featured content for the explore page carousel';
    displayName: 'Featured';
    pluralName: 'featured-items';
    singularName: 'featured';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    content_type: Schema.Attribute.Enumeration<['site', 'site_list', 'route']> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::featured.featured'
    > &
      Schema.Attribute.Private;
    priority: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    route: Schema.Attribute.Relation<
      'manyToOne',
      'api::nomad-route.nomad-route'
    >;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'>;
    site_list: Schema.Attribute.Relation<
      'manyToOne',
      'api::site-list.site-list'
    >;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFilterGroupFilterGroup extends Struct.CollectionTypeSchema {
  collectionName: 'filter_groups';
  info: {
    description: '';
    displayName: 'Filter groups';
    pluralName: 'filter-groups';
    singularName: 'filter-group';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    filters: Schema.Attribute.Component<'filter.filters', true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::filter-group.filter-group'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    priority: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    shouldShowTitle: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFilterFilter extends Struct.CollectionTypeSchema {
  collectionName: 'filters';
  info: {
    description: '';
    displayName: 'Filters';
    pluralName: 'filters';
    singularName: 'filter';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    filter: Schema.Attribute.Component<'filter.filter', false>;
    icon: Schema.Attribute.String;
    iconify: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::filter.filter'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    remote_icon: Schema.Attribute.Media<'images', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFormSubmissionFormSubmission
  extends Struct.CollectionTypeSchema {
  collectionName: 'form_submissions';
  info: {
    displayName: 'Form submissions';
    pluralName: 'form-submissions';
    singularName: 'form-submission';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    data: Schema.Attribute.JSON & Schema.Attribute.Required;
    form: Schema.Attribute.Relation<'manyToOne', 'api::form.form'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::form-submission.form-submission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFormForm extends Struct.CollectionTypeSchema {
  collectionName: 'forms';
  info: {
    description: '';
    displayName: 'Forms';
    pluralName: 'forms';
    singularName: 'form';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::form.form'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    submissions: Schema.Attribute.Relation<
      'oneToMany',
      'api::form-submission.form-submission'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGuideGuide extends Struct.CollectionTypeSchema {
  collectionName: 'guides';
  info: {
    description: 'Safety and informational guides linked to site types and facilities';
    displayName: 'Guides';
    pluralName: 'guides';
    singularName: 'guide';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    facilities: Schema.Attribute.Relation<
      'manyToMany',
      'api::facility.facility'
    >;
    feature_image: Schema.Attribute.Media<'images'>;
    link_message: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::guide.guide'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    SEO: Schema.Attribute.Component<'seo.seo-block', false>;
    site_types: Schema.Attribute.Relation<
      'manyToMany',
      'api::site-type.site-type'
    >;
    slug: Schema.Attribute.UID<'title'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiHomeFilterlinkHomeFilterlink
  extends Struct.CollectionTypeSchema {
  collectionName: 'home_filterlinks';
  info: {
    description: '';
    displayName: 'Home filters';
    pluralName: 'home-filterlinks';
    singularName: 'home-filterlink';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    filter: Schema.Attribute.Relation<
      'oneToOne',
      'api::filter-group.filter-group'
    >;
    icon: Schema.Attribute.String;
    iconify: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::home-filterlink.home-filterlink'
    > &
      Schema.Attribute.Private;
    order: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<1>;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiImageCandidateImageCandidate
  extends Struct.CollectionTypeSchema {
  collectionName: 'image_candidates';
  info: {
    description: 'Candidate images from enrichment awaiting moderation';
    displayName: 'Image Candidates';
    pluralName: 'image-candidates';
    singularName: 'image-candidate';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    candidates: Schema.Attribute.JSON & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::image-candidate.image-candidate'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'oneToOne', 'api::site.site'>;
    siteTitle: Schema.Attribute.String & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<
      ['pending', 'approved', 'rejected', 'needs_review']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMapImpressionMapImpression
  extends Struct.CollectionTypeSchema {
  collectionName: 'map_impressions';
  info: {
    description: 'Daily aggregated count of how many times a site appeared in map results';
    displayName: 'Map Impression';
    pluralName: 'map-impressions';
    singularName: 'map-impression';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    count: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    date: Schema.Attribute.Date & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::map-impression.map-impression'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    site_id: Schema.Attribute.Integer & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMinimumAppVersionMinimumAppVersion
  extends Struct.SingleTypeSchema {
  collectionName: 'minimum_app_versions';
  info: {
    displayName: 'Minimum app version';
    pluralName: 'minimum-app-versions';
    singularName: 'minimum-app-version';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::minimum-app-version.minimum-app-version'
    > &
      Schema.Attribute.Private;
    minVersion: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'0.0.1'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiNomadRouteNomadRoute extends Struct.CollectionTypeSchema {
  collectionName: 'nomad_routes';
  info: {
    description: '';
    displayName: 'Nomad routes';
    pluralName: 'nomad-routes';
    singularName: 'nomad-route';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    destination: Schema.Attribute.JSON & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::nomad-route.nomad-route'
    > &
      Schema.Attribute.Private;
    mode: Schema.Attribute.Enumeration<['DRIVING', 'WALKING', 'CYCLING']>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    origin: Schema.Attribute.JSON & Schema.Attribute.Required;
    pois: Schema.Attribute.Relation<'manyToMany', 'api::site.site'>;
    polyline: Schema.Attribute.JSON & Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    seo_description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seo_title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    slug: Schema.Attribute.UID<'name'>;
    stay: Schema.Attribute.Relation<'manyToMany', 'api::site.site'>;
    tags: Schema.Attribute.Relation<'manyToMany', 'api::tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    waypoints: Schema.Attribute.JSON;
  };
}

export interface ApiNotificationPreferenceNotificationPreference
  extends Struct.CollectionTypeSchema {
  collectionName: 'notification_preferences';
  info: {
    description: 'User preferences for notifications';
    displayName: 'Notification Preferences';
    pluralName: 'notification-preferences';
    singularName: 'notification-preference';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email_likes: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    email_new_reviews: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    email_review_replies: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    email_route_favourites: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    email_status_changes: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::notification-preference.notification-preference'
    > &
      Schema.Attribute.Private;
    mute_all: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    push_likes: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    push_new_reviews: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    push_review_replies: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    push_route_favourites: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    push_status_changes: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    quiet_hours_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    quiet_hours_end: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'08:00'>;
    quiet_hours_start: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'22:00'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'oneToOne', 'api::auth-user.auth-user'>;
  };
}

export interface ApiNotificationNotification
  extends Struct.CollectionTypeSchema {
  collectionName: 'notifications';
  info: {
    description: 'User notifications for activity on their content';
    displayName: 'Notifications';
    pluralName: 'notifications';
    singularName: 'notification';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_read: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::notification.notification'
    > &
      Schema.Attribute.Private;
    message: Schema.Attribute.Text & Schema.Attribute.Required;
    metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    recipient: Schema.Attribute.Relation<
      'manyToOne',
      'api::auth-user.auth-user'
    >;
    related_entity_id: Schema.Attribute.Integer;
    related_entity_type: Schema.Attribute.Enumeration<
      [
        'site',
        'review',
        'edit_request',
        'addition_request',
        'user_route',
        'auth_user',
      ]
    >;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    type: Schema.Attribute.Enumeration<
      [
        'status_change',
        'review_reply',
        'new_review',
        'site_like',
        'route_favourite',
        'follower_new',
      ]
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPlanCheckinPlanCheckin extends Struct.CollectionTypeSchema {
  collectionName: 'plan_checkins';
  info: {
    description: '';
    displayName: 'Plan Checkin';
    pluralName: 'plan-checkins';
    singularName: 'plan-checkin';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    checkinTime: Schema.Attribute.DateTime & Schema.Attribute.Required;
    checkoutTime: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::plan-checkin.plan-checkin'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.JSON;
    note: Schema.Attribute.Text;
    photo: Schema.Attribute.Media<'images'>;
    publishedAt: Schema.Attribute.DateTime;
    stopIndex: Schema.Attribute.Integer & Schema.Attribute.Required;
    tripPlan: Schema.Attribute.Relation<
      'manyToOne',
      'api::trip-plan.trip-plan'
    >;
    type: Schema.Attribute.Enumeration<['manual', 'automatic']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'manual'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPlanSharePlanShare extends Struct.CollectionTypeSchema {
  collectionName: 'plan_shares';
  info: {
    description: '';
    displayName: 'Plan Share';
    pluralName: 'plan-shares';
    singularName: 'plan-share';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    invitedEmail: Schema.Attribute.Email;
    invitedVia: Schema.Attribute.Enumeration<['username', 'email', 'link']> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::plan-share.plan-share'
    > &
      Schema.Attribute.Private;
    notifyCheckins: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    notifyOverdue: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    permission: Schema.Attribute.Enumeration<['view', 'emergency_contact']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'view'>;
    publishedAt: Schema.Attribute.DateTime;
    sharedWith: Schema.Attribute.Relation<
      'manyToOne',
      'api::auth-user.auth-user'
    >;
    status: Schema.Attribute.Enumeration<['pending', 'accepted']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    tripPlan: Schema.Attribute.Relation<
      'manyToOne',
      'api::trip-plan.trip-plan'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPostPost extends Struct.CollectionTypeSchema {
  collectionName: 'posts';
  info: {
    description: '';
    displayName: 'Posts';
    pluralName: 'posts';
    singularName: 'post';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    image: Schema.Attribute.Media<'images' | 'videos'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::post.post'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    SEO: Schema.Attribute.Component<'seo.seo-block', false>;
    slug: Schema.Attribute.UID<'title'>;
    tags: Schema.Attribute.Relation<'manyToMany', 'api::tag.tag'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiQuicklinkQuicklink extends Struct.CollectionTypeSchema {
  collectionName: 'quicklinks';
  info: {
    description: '';
    displayName: 'Quicklinks';
    pluralName: 'quicklinks';
    singularName: 'quicklink';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    link: Schema.Attribute.String;
    linkType: Schema.Attribute.Enumeration<['internal', 'external']>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::quicklink.quicklink'
    > &
      Schema.Attribute.Private;
    order: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<1>;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiReviewReview extends Struct.CollectionTypeSchema {
  collectionName: 'reviews';
  info: {
    description: 'User reviews with ratings and images';
    displayName: 'Reviews';
    pluralName: 'reviews';
    singularName: 'review';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::review.review'
    > &
      Schema.Attribute.Private;
    moderation_status: Schema.Attribute.Enumeration<
      ['submitted', 'pending', 'moderating', 'rejected', 'complete']
    > &
      Schema.Attribute.DefaultTo<'submitted'>;
    owner: Schema.Attribute.Relation<'manyToOne', 'api::auth-user.auth-user'>;
    owner_reply: Schema.Attribute.Text;
    owner_reply_at: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    rating: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    review: Schema.Attribute.Text;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSiteListProgressSiteListProgress
  extends Struct.CollectionTypeSchema {
  collectionName: 'site_list_progress';
  info: {
    description: 'Tracks user progress on completing sites in a list';
    displayName: 'Site List Progress';
    pluralName: 'site-list-progresses';
    singularName: 'site-list-progress';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    completed_sites: Schema.Attribute.Relation<'manyToMany', 'api::site.site'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::site-list-progress.site-list-progress'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    site_list: Schema.Attribute.Relation<
      'manyToOne',
      'api::site-list.site-list'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'manyToOne', 'api::auth-user.auth-user'>;
  };
}

export interface ApiSiteListSiteList extends Struct.CollectionTypeSchema {
  collectionName: 'site_lists';
  info: {
    description: 'Curated lists of sites (e.g., Munros, Wild Swimming Spots)';
    displayName: 'Site Lists';
    pluralName: 'site-lists';
    singularName: 'site-list';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    category: Schema.Attribute.Enumeration<['Walks']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Walks'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    difficulty: Schema.Attribute.Enumeration<
      ['Easy', 'Moderate', 'Difficult', 'Expert']
    >;
    icon: Schema.Attribute.String;
    iconify: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::site-list.site-list'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    owner: Schema.Attribute.Relation<'manyToOne', 'api::auth-user.auth-user'>;
    owner_type: Schema.Attribute.Enumeration<['admin', 'user']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'admin'>;
    priority: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    public: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    publishedAt: Schema.Attribute.DateTime;
    saved_by: Schema.Attribute.Relation<
      'manyToMany',
      'api::auth-user.auth-user'
    >;
    seo_description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seo_title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    sites: Schema.Attribute.Relation<'manyToMany', 'api::site.site'>;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    sortable_fields: Schema.Attribute.Component<'list.sortable-field', true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSiteTypeSiteType extends Struct.CollectionTypeSchema {
  collectionName: 'site_types';
  info: {
    description: '';
    displayName: 'Site types';
    pluralName: 'site-types';
    singularName: 'site-type';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    applicable_metadata_fields: Schema.Attribute.JSON;
    contribute_description: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    facilities: Schema.Attribute.Relation<
      'manyToMany',
      'api::facility.facility'
    >;
    guides: Schema.Attribute.Relation<'manyToMany', 'api::guide.guide'>;
    icon: Schema.Attribute.String;
    iconify: Schema.Attribute.String;
    key: Schema.Attribute.String & Schema.Attribute.DefaultTo<'siteType'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::site-type.site-type'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    remote_icon: Schema.Attribute.Media<'images', true>;
    remote_marker: Schema.Attribute.Media<'images', true>;
    slug: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSiteSite extends Struct.CollectionTypeSchema {
  collectionName: 'sites';
  info: {
    description: '';
    displayName: 'Sites';
    pluralName: 'sites';
    singularName: 'site';
  };
  options: {
    draftAndPublish: false;
    increments: true;
    timestamps: true;
  };
  attributes: {
    added_by: Schema.Attribute.Relation<
      'manyToOne',
      'api::auth-user.auth-user'
    >;
    ai_description: Schema.Attribute.Text;
    averageRating: Schema.Attribute.Float &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 0;
        },
        number
      >;
    category: Schema.Attribute.String;
    contributors: Schema.Attribute.Relation<
      'manyToMany',
      'api::auth-user.auth-user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    cta_label: Schema.Attribute.String;
    cta_url: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    edit_requests: Schema.Attribute.Relation<
      'oneToMany',
      'api::edit-request.edit-request'
    >;
    email: Schema.Attribute.Email;
    enriched_at: Schema.Attribute.DateTime;
    enrichment_version: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<0>;
    facilities: Schema.Attribute.Relation<
      'oneToMany',
      'api::facility.facility'
    >;
    image: Schema.Attribute.Text;
    imageCaption: Schema.Attribute.String;
    images: Schema.Attribute.Media<'images', true>;
    lat: Schema.Attribute.Float;
    latlng: Schema.Attribute.String;
    likes: Schema.Attribute.Relation<'manyToMany', 'api::auth-user.auth-user'>;
    lng: Schema.Attribute.Float;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::site.site'> &
      Schema.Attribute.Private;
    maplink: Schema.Attribute.Text;
    nomad_routes: Schema.Attribute.Relation<
      'manyToMany',
      'api::nomad-route.nomad-route'
    >;
    owners: Schema.Attribute.Relation<'manyToMany', 'api::auth-user.auth-user'>;
    pricerange: Schema.Attribute.String & Schema.Attribute.DefaultTo<'---'>;
    priority: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    region: Schema.Attribute.String;
    reviewCount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    reviews: Schema.Attribute.Relation<'oneToMany', 'api::review.review'>;
    route_metadata: Schema.Attribute.Component<'route.metadata', false>;
    site_lists: Schema.Attribute.Relation<
      'manyToMany',
      'api::site-list.site-list'
    >;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    social_links: Schema.Attribute.JSON;
    sub_types: Schema.Attribute.Relation<
      'oneToMany',
      'api::site-type.site-type'
    >;
    tags: Schema.Attribute.Relation<'manyToMany', 'api::tag.tag'>;
    tel: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    type: Schema.Attribute.Relation<'oneToOne', 'api::site-type.site-type'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text;
  };
}

export interface ApiSubscriptionSubscription
  extends Struct.CollectionTypeSchema {
  collectionName: 'subscriptions';
  info: {
    description: '';
    displayName: 'Subscriptions';
    pluralName: 'subscriptions';
    singularName: 'subscription';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    auto_renew: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expiry: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::subscription.subscription'
    > &
      Schema.Attribute.Private;
    payment_method: Schema.Attribute.Enumeration<['card', 'bank']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'card'>;
    publishedAt: Schema.Attribute.DateTime;
    start: Schema.Attribute.DateTime & Schema.Attribute.Required;
    term: Schema.Attribute.Enumeration<['monthly', 'yearly']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user_role: Schema.Attribute.Relation<
      'oneToOne',
      'api::user-role.user-role'
    >;
    users: Schema.Attribute.Relation<'oneToMany', 'api::auth-user.auth-user'>;
  };
}

export interface ApiTagTag extends Struct.CollectionTypeSchema {
  collectionName: 'tags';
  info: {
    displayName: 'Tags';
    pluralName: 'tags';
    singularName: 'tag';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::tag.tag'> &
      Schema.Attribute.Private;
    nomad_routes: Schema.Attribute.Relation<
      'manyToMany',
      'api::nomad-route.nomad-route'
    >;
    posts: Schema.Attribute.Relation<'manyToMany', 'api::post.post'>;
    publishedAt: Schema.Attribute.DateTime;
    sites: Schema.Attribute.Relation<'manyToMany', 'api::site.site'>;
    tag: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user_routes: Schema.Attribute.Relation<
      'manyToMany',
      'api::user-route.user-route'
    >;
  };
}

export interface ApiTripPlanTripPlan extends Struct.CollectionTypeSchema {
  collectionName: 'trip_plans';
  info: {
    description: '';
    displayName: 'Trip Plan';
    pluralName: 'trip-plans';
    singularName: 'trip-plan';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    autoCheckinEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    checkins: Schema.Attribute.Relation<
      'oneToMany',
      'api::plan-checkin.plan-checkin'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    endDate: Schema.Attribute.Date;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::trip-plan.trip-plan'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    overdueAlertsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    owner: Schema.Attribute.Relation<'manyToOne', 'api::auth-user.auth-user'>;
    publishedAt: Schema.Attribute.DateTime;
    shareCode: Schema.Attribute.String;
    shares: Schema.Attribute.Relation<
      'oneToMany',
      'api::plan-share.plan-share'
    >;
    startDate: Schema.Attribute.Date;
    status: Schema.Attribute.Enumeration<
      ['draft', 'active', 'completed', 'archived']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    stops: Schema.Attribute.Component<'plan.stop', true>;
    timingMode: Schema.Attribute.Enumeration<
      ['flexible', 'day_based', 'timed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'flexible'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiUserRoleUserRole extends Struct.CollectionTypeSchema {
  collectionName: 'user_roles';
  info: {
    description: '';
    displayName: 'User roles';
    pluralName: 'user-roles';
    singularName: 'user-role';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    features: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        analytics_dashboard: false;
        custom_cta: false;
        reply_to_reviews: false;
        social_links: false;
        unlimited_description: false;
      }>;
    level: Schema.Attribute.Integer & Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-role.user-role'
    > &
      Schema.Attribute.Private;
    maxImages: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'oneToMany', 'api::auth-user.auth-user'>;
  };
}

export interface ApiUserRouteUserRoute extends Struct.CollectionTypeSchema {
  collectionName: 'user_routes';
  info: {
    description: '';
    displayName: 'User routes';
    pluralName: 'user-routes';
    singularName: 'user-route';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    distances: Schema.Attribute.JSON;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-route.user-route'
    > &
      Schema.Attribute.Private;
    mode: Schema.Attribute.Enumeration<['DRIVING', 'WALKING', 'CYCLING']> &
      Schema.Attribute.DefaultTo<'DRIVING'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    owner: Schema.Attribute.Relation<'manyToOne', 'api::auth-user.auth-user'>;
    polyline: Schema.Attribute.JSON;
    public: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    saved_by: Schema.Attribute.Relation<
      'manyToMany',
      'api::auth-user.auth-user'
    >;
    sites: Schema.Attribute.Component<'order.sites', true>;
    tags: Schema.Attribute.Relation<'manyToMany', 'api::tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiWeatherUsageWeatherUsage
  extends Struct.CollectionTypeSchema {
  collectionName: 'weather_usage';
  info: {
    description: 'Tracks WeatherKit API usage per month for quota management';
    displayName: 'Weather Usage';
    pluralName: 'weather-usages';
    singularName: 'weather-usage';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    call_count: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    disabled_at: Schema.Attribute.DateTime;
    disabled_reason: Schema.Attribute.Text;
    is_disabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::weather-usage.weather-usage'
    > &
      Schema.Attribute.Private;
    month: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::addition-request.addition-request': ApiAdditionRequestAdditionRequest;
      'api::auth-user.auth-user': ApiAuthUserAuthUser;
      'api::comment.comment': ApiCommentComment;
      'api::content-report.content-report': ApiContentReportContentReport;
      'api::directions-killswitch.directions-killswitch': ApiDirectionsKillswitchDirectionsKillswitch;
      'api::edit-request.edit-request': ApiEditRequestEditRequest;
      'api::facility.facility': ApiFacilityFacility;
      'api::faq.faq': ApiFaqFaq;
      'api::featured.featured': ApiFeaturedFeatured;
      'api::filter-group.filter-group': ApiFilterGroupFilterGroup;
      'api::filter.filter': ApiFilterFilter;
      'api::form-submission.form-submission': ApiFormSubmissionFormSubmission;
      'api::form.form': ApiFormForm;
      'api::guide.guide': ApiGuideGuide;
      'api::home-filterlink.home-filterlink': ApiHomeFilterlinkHomeFilterlink;
      'api::image-candidate.image-candidate': ApiImageCandidateImageCandidate;
      'api::map-impression.map-impression': ApiMapImpressionMapImpression;
      'api::minimum-app-version.minimum-app-version': ApiMinimumAppVersionMinimumAppVersion;
      'api::nomad-route.nomad-route': ApiNomadRouteNomadRoute;
      'api::notification-preference.notification-preference': ApiNotificationPreferenceNotificationPreference;
      'api::notification.notification': ApiNotificationNotification;
      'api::plan-checkin.plan-checkin': ApiPlanCheckinPlanCheckin;
      'api::plan-share.plan-share': ApiPlanSharePlanShare;
      'api::post.post': ApiPostPost;
      'api::quicklink.quicklink': ApiQuicklinkQuicklink;
      'api::review.review': ApiReviewReview;
      'api::site-list-progress.site-list-progress': ApiSiteListProgressSiteListProgress;
      'api::site-list.site-list': ApiSiteListSiteList;
      'api::site-type.site-type': ApiSiteTypeSiteType;
      'api::site.site': ApiSiteSite;
      'api::subscription.subscription': ApiSubscriptionSubscription;
      'api::tag.tag': ApiTagTag;
      'api::trip-plan.trip-plan': ApiTripPlanTripPlan;
      'api::user-role.user-role': ApiUserRoleUserRole;
      'api::user-route.user-route': ApiUserRouteUserRoute;
      'api::weather-usage.weather-usage': ApiWeatherUsageWeatherUsage;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
