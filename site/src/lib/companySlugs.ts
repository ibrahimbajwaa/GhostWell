import slugs from "../../data/company_slugs.json";

const known = new Set(slugs as string[]);
export const hasCompanyPage = (slug: string) => known.has(slug);
