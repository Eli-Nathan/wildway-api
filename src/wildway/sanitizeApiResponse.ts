interface StrapiEntity {
  id: number;
  attributes: Record<string, unknown>;
}

interface StrapiResponse {
  data: StrapiEntity | StrapiEntity[] | null;
}

interface SanitizedEntity {
  id: number;
  [key: string]: unknown;
}

type SanitizeResult = SanitizedEntity | SanitizedEntity[] | undefined;

const sanitizeApiResponse = (response: StrapiResponse | null | undefined): SanitizeResult => {
  if (!response || !response.data) {
    return undefined;
  }

  if (Array.isArray(response.data)) {
    const sanitized = response.data.reduce<SanitizedEntity[]>((acc, curr) => {
      const item: SanitizedEntity = {
        id: curr.id,
        ...curr.attributes,
      };
      acc.push(item);
      return acc;
    }, []);
    return sanitized;
  }

  const { attributes, ...restProps } = response.data;
  const sanitized: SanitizedEntity = {
    ...attributes,
    ...restProps,
  };
  return sanitized;
};

export default sanitizeApiResponse;
