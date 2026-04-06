import type { Schema, Struct } from '@strapi/strapi';

export interface FilterFilter extends Struct.ComponentSchema {
  collectionName: 'components_filter_filter';
  info: {
    description: '';
    displayName: 'filter';
    icon: 'filter';
  };
  attributes: {
    facility: Schema.Attribute.Relation<'oneToOne', 'api::facility.facility'>;
    isFree: Schema.Attribute.Boolean;
    siteType: Schema.Attribute.Relation<'oneToOne', 'api::site-type.site-type'>;
  };
}

export interface FilterFilters extends Struct.ComponentSchema {
  collectionName: 'components_filter_filters';
  info: {
    displayName: 'filters';
    icon: 'list';
  };
  attributes: {
    filter: Schema.Attribute.Relation<'oneToOne', 'api::filter.filter'>;
  };
}

export interface ListSortableField extends Struct.ComponentSchema {
  collectionName: 'components_list_sortable_fields';
  info: {
    description: 'Defines a field that can be used to sort sites within a list';
    displayName: 'Sortable Field';
    icon: 'sort';
  };
  attributes: {
    default_order: Schema.Attribute.Enumeration<['asc', 'desc']> &
      Schema.Attribute.DefaultTo<'asc'>;
    display_label: Schema.Attribute.String & Schema.Attribute.Required;
    field_path: Schema.Attribute.String & Schema.Attribute.Required;
    is_default: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface OrderSites extends Struct.ComponentSchema {
  collectionName: 'components_order_sites';
  info: {
    description: '';
    displayName: 'Sites';
    icon: 'sort';
  };
  attributes: {
    custom: Schema.Attribute.JSON;
    site: Schema.Attribute.Relation<'oneToOne', 'api::site.site'>;
  };
}

export interface PlanStop extends Struct.ComponentSchema {
  collectionName: 'components_plan_stops';
  info: {
    description: '';
    displayName: 'Stop';
    icon: 'pin';
  };
  attributes: {
    customLocation: Schema.Attribute.JSON;
    dayNumber: Schema.Attribute.Integer;
    notes: Schema.Attribute.Text;
    plannedArrival: Schema.Attribute.DateTime;
    plannedDeparture: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'oneToOne', 'api::site.site'>;
  };
}

export interface RouteMetadata extends Struct.ComponentSchema {
  collectionName: 'components_route_metadata';
  info: {
    description: 'Metadata for route-based sites like walks, cycling paths, and hikes';
    displayName: 'Route Metadata';
    icon: 'walk';
  };
  attributes: {
    difficulty: Schema.Attribute.Enumeration<
      ['Easy', 'Moderate', 'Difficult', 'Expert']
    >;
    distance: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    elevation_gain: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    height: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    loop: Schema.Attribute.Enumeration<['Circular', 'Linear']>;
  };
}

export interface SeoSeoBlock extends Struct.ComponentSchema {
  collectionName: 'components_seo_seo_blocks';
  info: {
    description: '';
    displayName: 'SEO block';
  };
  attributes: {
    keywords: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'filter.filter': FilterFilter;
      'filter.filters': FilterFilters;
      'list.sortable-field': ListSortableField;
      'order.sites': OrderSites;
      'plan.stop': PlanStop;
      'route.metadata': RouteMetadata;
      'seo.seo-block': SeoSeoBlock;
    }
  }
}
