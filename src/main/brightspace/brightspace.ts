import { session } from "electron";
import Route from "./route";

interface PagedResultSet<T> {
  PagingInfo: {
    Bookmark: string;
    HasMoreItems: boolean;
  };
  Items: T[];
}

export async function fetchAllPages<T>(route: Route): Promise<T[]> {
  const allItems: T[] = [];

  const { d2lSecureSessionVal, d2lSessionVal } = await getBrightspaceSessionCookies();

  function fetchPage(bookmark?: string): Promise<void> {
    const url = bookmark ? `${route.url}?bookmark=${encodeURIComponent(bookmark)}` : route.url;
    return fetch(url, {
      method: route.method,
      headers: {
        Cookie: `d2lSecureSessionVal=${d2lSecureSessionVal}; d2lSessionVal=${d2lSessionVal}`,
      },
    })
      .then((response) => response.json())
      .then((data: PagedResultSet<T>) => {
        allItems.push(...data.Items);
        if (data.PagingInfo.HasMoreItems) {
          return fetchPage(data.PagingInfo.Bookmark);
        }
      });
  }

  return fetchPage().then(() => allItems);
}

/**
 * Sends an authenticated request to the Brightspace API using the provided Route.
 * @param route The Route object for the API request.
 * @returns A promise that resolves to the JSON response from the Brightspace API.
 * @throws An error if the required session cookies are not found or if the fetch request fails.
 */
export default async function request(route: Route, init?: RequestInit): Promise<any> {
  //console.log(`Making request to ${route.url} with method ${route.method}`);

  const { d2lSecureSessionVal, d2lSessionVal } = await getBrightspaceSessionCookies();

  // Set initialization options for fetch, including method and headers with cookies
  const fetchOptions: RequestInit = {
    method: route.method,
    headers: {
      Cookie: `d2lSecureSessionVal=${d2lSecureSessionVal}; d2lSessionVal=${d2lSessionVal}`,
    },
    ...init, // Spread any additional options passed in
  };

  return fetch(route.url, fetchOptions).then((response) => response.json());
}

/**
 * Fetches the required session cookies from the Electron session.
 * @returns An object containing the d2lSecureSessionVal and d2lSessionVal cookies.
 * @throws An error if the required cookies are not found.
 */
async function getBrightspaceSessionCookies() {
  const cookies = await session.defaultSession.cookies.get({
    url: "https://brightspace.algonquincollege.com",
  });

  const d2lSecureSessionVal = cookies.find(
    (cookie) => cookie.name === "d2lSecureSessionVal"
  )?.value;
  const d2lSessionVal = cookies.find(
    (cookie) => cookie.name === "d2lSessionVal"
  )?.value;

  if (!d2lSecureSessionVal || !d2lSessionVal) {
    throw new Error("Required cookies not found");
  }

  return { d2lSecureSessionVal, d2lSessionVal };
};
