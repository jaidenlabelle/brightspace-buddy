import { session } from "electron";
import Route from "./route";

/**
 * Sends an authenticated request to the Brightspace API using the provided Route.
 * @param route The Route object for the API request.
 * @returns A promise that resolves to the JSON response from the Brightspace API.
 * @throws An error if the required session cookies are not found or if the fetch request fails.
 */
export default async function request(route: Route) {
  console.log(`Making request to ${route.url} with method ${route.method}`);

  const { d2lSecureSessionVal, d2lSessionVal } = await getBrightspaceSessionCookies();

  return fetch(route.url, {
    method: route.method,
    headers: {
      Cookie: `d2lSecureSessionVal=${d2lSecureSessionVal}; d2lSessionVal=${d2lSessionVal}`,
    },
  }).then((response) => response.json());
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
