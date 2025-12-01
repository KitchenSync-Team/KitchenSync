const DEFAULT_RAPIDAPI_HOST = "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com";

export type SpoonacularClient = {
  baseUrl: string;
  headers: Record<string, string>;
  authType: "rapidapi" | "direct";
  apiKey?: string;
};

export function getSpoonacularClient(): SpoonacularClient {
  const rapidApiKey =
    process.env.SPOONACULAR_RAPIDAPI_KEY ||
    process.env.RAPIDAPI_SPOONACULAR_KEY ||
    process.env.RAPIDAPI_KEY;

  const rapidApiHost = process.env.SPOONACULAR_RAPIDAPI_HOST || DEFAULT_RAPIDAPI_HOST;

  if (rapidApiKey) {
    return {
      baseUrl: `https://${rapidApiHost}`,
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": rapidApiHost,
      },
      authType: "rapidapi",
    };
  }

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    throw new Error("Spoonacular API key missing");
  }

  return {
    baseUrl: "https://api.spoonacular.com",
    headers: {},
    authType: "direct",
    apiKey,
  };
}

export function buildSpoonacularUrl(
  client: SpoonacularClient,
  path: string,
  params?: URLSearchParams,
): string {
  const searchParams = params ?? new URLSearchParams();
  if (client.authType === "direct" && client.apiKey) {
    searchParams.set("apiKey", client.apiKey);
  }

  const query = searchParams.toString();
  return query ? `${client.baseUrl}${path}?${query}` : `${client.baseUrl}${path}`;
}
